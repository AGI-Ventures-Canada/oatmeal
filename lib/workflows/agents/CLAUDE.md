# Claude Agent SDK Runner

This directory contains the Claude Agent SDK integration for running agents in sandboxed environments.

## Overview

The Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) provides autonomous agents with built-in tools for file operations, command execution, and multi-step reasoning. We run these agents inside Daytona sandboxes for isolation.

## Key Files

```
lib/workflows/agents/
├── ai-sdk-runner.ts       # AI SDK runner (DurableAgent)
├── workflow.ts            # Main workflow orchestration
├── steps.ts               # Workflow step definitions
└── index.ts               # Exports

lib/sandbox/
├── claude-sdk-executor.ts     # Claude SDK execution in sandbox
├── sdk-runner-template.ts     # TypeScript template for intellisense
└── daytona.ts                 # Daytona SDK wrapper
```

## Claude Agent SDK vs AI SDK

| Feature | Claude Agent SDK | AI SDK (DurableAgent) |
|---------|------------------|----------------------|
| Built-in tools | Read, Write, Edit, Bash, Glob, Grep | Custom tools only |
| Execution | Autonomous agent loop | Controlled tool loop |
| Environment | Runs in sandbox | Runs in workflow |
| Use case | File operations, code tasks | API integrations, custom logic |

## V2 Syntax (Preferred)

We use the V2 preview API for simpler code:

### One-shot Prompt

```typescript
import { unstable_v2_prompt } from "@anthropic-ai/claude-agent-sdk"

const result = await unstable_v2_prompt("Fix the bug in auth.py", {
  model: "claude-sonnet-4-5-20250929",
  systemPrompt: "You are a helpful assistant",
  allowedTools: ["Read", "Write", "Edit", "Bash"],
  permissionMode: "bypassPermissions",
  allowDangerouslySkipPermissions: true,
})

console.log(result.result)
```

### Multi-turn Session

```typescript
import { unstable_v2_createSession } from "@anthropic-ai/claude-agent-sdk"

const session = unstable_v2_createSession({
  model: "claude-sonnet-4-5-20250929",
  allowedTools: ["Read", "Glob", "Grep"],
  permissionMode: "bypassPermissions",
  allowDangerouslySkipPermissions: true,
})

await session.send("Find all TODO comments")
for await (const msg of session.stream()) {
  if (msg.type === "assistant") {
    console.log(msg.message.content)
  }
}

await session.send("Now fix the first one")
for await (const msg of session.stream()) {
  // ...
}

session.close()
```

### Resume Session

```typescript
import { unstable_v2_resumeSession } from "@anthropic-ai/claude-agent-sdk"

const session = unstable_v2_resumeSession(sessionId, {
  model: "claude-sonnet-4-5-20250929",
})

await session.send("Continue where we left off")
// ...
```

## V1 Syntax (Legacy)

For features not yet in V2 (session forking, advanced streaming):

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk"

for await (const message of query({
  prompt: "Fix the bug in auth.py",
  options: {
    model: "claude-sonnet-4-5-20250929",
    systemPrompt: "You are a helpful assistant",
    allowedTools: ["Read", "Write", "Edit", "Bash"],
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    maxTurns: 50,
  },
})) {
  if (message.type === "result" && message.subtype === "success") {
    console.log(message.result)
    console.log("Cost:", message.total_cost_usd)
  }
}
```

## Built-in Tools

| Tool | Description |
|------|-------------|
| `Read` | Read files (text, images, PDFs, notebooks) |
| `Write` | Create new files |
| `Edit` | Make precise edits to existing files |
| `Bash` | Run terminal commands, scripts, git |
| `Glob` | Find files by pattern (`**/*.ts`) |
| `Grep` | Search file contents with regex |
| `WebSearch` | Search the web |
| `WebFetch` | Fetch and parse web pages |
| `Task` | Spawn subagents for complex tasks |
| `TodoWrite` | Track task progress |

## Configuration Options

```typescript
interface Options {
  model: string                    // e.g., "claude-sonnet-4-5-20250929"
  systemPrompt?: string            // Custom system prompt
  allowedTools?: string[]          // Tools the agent can use
  disallowedTools?: string[]       // Tools to block
  permissionMode?: PermissionMode  // "default" | "acceptEdits" | "bypassPermissions"
  allowDangerouslySkipPermissions?: boolean // Required for bypassPermissions
  maxTurns?: number                // Max iterations (default: unlimited)
  cwd?: string                     // Working directory
  env?: Record<string, string>     // Environment variables
  mcpServers?: McpServerConfig     // MCP server connections
  hooks?: HookConfig               // Lifecycle hooks
  agents?: AgentDefinitions        // Custom subagents
}
```

## Permission Modes

| Mode | Description |
|------|-------------|
| `default` | Prompts for approval on dangerous operations |
| `acceptEdits` | Auto-accept file edits, prompt for others |
| `bypassPermissions` | Skip all permission checks (requires `allowDangerouslySkipPermissions: true`) |

## Message Types

```typescript
type SDKMessage =
  | SDKAssistantMessage    // Claude's response
  | SDKUserMessage         // User input
  | SDKResultMessage       // Final result with usage stats
  | SDKSystemMessage       // System init/compact boundary
  | SDKPartialMessage      // Streaming partial (if enabled)
```

### Result Message

```typescript
interface SDKResultMessage {
  type: "result"
  subtype: "success" | "error_max_turns" | "error_during_execution"
  result?: string           // Final output text
  total_cost_usd: number    // Total API cost
  usage: {
    input_tokens: number
    output_tokens: number
  }
  num_turns: number         // Steps taken
  errors?: string[]         // Errors if failed
}
```

## Hooks

Intercept agent behavior at key points. Hooks are essential for:
- **Logging/Auditing**: Track every tool call for debugging or analytics
- **Security**: Block dangerous operations before execution
- **Streaming**: Emit intermediate results during long-running tasks
- **Authorization**: Require approval for sensitive operations

### Available Hooks

| Hook | When it Fires | Common Use Cases |
|------|---------------|------------------|
| `PreToolUse` | Before tool executes | Block dangerous commands, validate inputs |
| `PostToolUse` | After tool completes | Log results, stream intermediate output |
| `PostToolUseFailure` | When tool fails | Handle or log tool errors |
| `Notification` | Agent status messages | Send updates to Slack/PagerDuty |
| `UserPromptSubmit` | User prompt received | Inject additional context |
| `SessionStart` | Session initialization | Initialize logging, telemetry |
| `SessionEnd` | Session termination | Clean up resources |
| `Stop` | Agent stops | Save state before exit |
| `SubagentStart` | Subagent spawned | Track parallel tasks |
| `SubagentStop` | Subagent completes | Aggregate subagent results |
| `PreCompact` | Conversation compaction | Archive transcript before summarizing |
| `PermissionRequest` | Permission dialog | Custom permission handling |

### Hook Callback Structure

```typescript
import { HookCallback, PreToolUseHookInput, PostToolUseHookInput } from "@anthropic-ai/claude-agent-sdk"

const preToolUseHook: HookCallback = async (input, toolUseId, { signal }) => {
  const preInput = input as PreToolUseHookInput
  console.log(`Tool: ${preInput.tool_name}`)
  console.log(`Input:`, preInput.tool_input)

  // Return empty to allow, or return permission decision
  return {}  // Allow execution

  // To block:
  // return {
  //   hookSpecificOutput: {
  //     hookEventName: 'PreToolUse',
  //     permissionDecision: 'deny',
  //     permissionDecisionReason: 'Command blocked for safety'
  //   }
  // }
}

const postToolUseHook: HookCallback = async (input, toolUseId, { signal }) => {
  const postInput = input as PostToolUseHookInput
  console.log(`Result:`, postInput.tool_response)
  return {}
}
```

### Streaming Intermediate Results

Use `PostToolUse` hooks to stream tool results as they complete:

```typescript
const hooks = {
  PreToolUse: [{
    hooks: [async (input, toolUseId) => {
      console.log(JSON.stringify({
        type: "tool_start",
        tool: input.tool_name,
        toolUseId,
        timestamp: Date.now(),
      }))
      return {}
    }]
  }],
  PostToolUse: [{
    hooks: [async (input, toolUseId) => {
      console.log(JSON.stringify({
        type: "tool_end",
        tool: input.tool_name,
        toolUseId,
        response: input.tool_response?.substring?.(0, 500),
        timestamp: Date.now(),
      }))
      return {}
    }]
  }],
}
```

### Matcher Patterns

Filter which tools trigger hooks using regex patterns:

```typescript
const hooks = {
  PreToolUse: [
    // Match file modification tools
    { matcher: 'Write|Edit|Delete', hooks: [fileSecurityHook] },

    // Match all MCP tools
    { matcher: '^mcp__', hooks: [mcpAuditHook] },

    // Match everything (no matcher)
    { hooks: [globalLogger] }
  ]
}
```

## Subagents

Define specialized agents for delegation:

```typescript
const options = {
  allowedTools: ["Read", "Glob", "Grep", "Task"],
  agents: {
    "code-reviewer": {
      description: "Expert code reviewer",
      prompt: "Analyze code quality and suggest improvements",
      tools: ["Read", "Glob", "Grep"],
      model: "haiku", // Can use cheaper model
    },
  },
}
```

## MCP Servers

Connect external capabilities:

```typescript
const options = {
  mcpServers: {
    playwright: {
      command: "npx",
      args: ["@playwright/mcp@latest"],
    },
    database: {
      type: "sse",
      url: "http://localhost:3001/mcp",
    },
  },
}
```

## Sandbox Integration

The runner executes Claude Agent SDK inside a Daytona sandbox:

1. Create sandbox with env vars (ANTHROPIC_API_KEY, etc.)
2. Create non-root user (`agent`) - SDK refuses `bypassPermissions` as root
3. Write skill files to `.claude/skills/`
4. Write runner script (`index.js`) using V2 syntax with hooks
5. Install `@anthropic-ai/claude-agent-sdk`
6. Execute as non-root user via polling (avoids API gateway timeout)
7. Parse JSON output with result + usage
8. Terminate sandbox

### Why Non-Root User?

The Claude Agent SDK's `bypassPermissions` mode is blocked when running as root for security. We create a dedicated `agent` user (UID 1001) and run the SDK as that user.

### Sandbox Settings (SDK Options)

Configure sandbox behavior programmatically:

```typescript
const options = {
  sandbox: {
    enabled: true,
    autoAllowBashIfSandboxed: true,
    excludedCommands: ["docker"],  // Bypass sandbox automatically
    allowUnsandboxedCommands: false,  // Don't allow model to request unsandboxed
    network: {
      allowLocalBinding: true,  // For dev servers
      allowUnixSockets: ["/var/run/docker.sock"],
    },
  },
  permissionMode: "bypassPermissions",
  allowDangerouslySkipPermissions: true,
}
```

### Execution Flow (Polling-Based)

To avoid the Daytona API gateway's ~30 second timeout, we use a polling approach:

1. Write wrapper script that runs SDK and captures output to files
2. Start SDK in background as non-root user
3. Poll for completion by checking status file
4. Read output file when complete
5. Return result with parsed JSON

## Documentation Links

### Getting Started
- Overview: https://platform.claude.com/docs/en/agent-sdk/overview
- Quickstart: https://platform.claude.com/docs/en/agent-sdk/quickstart

### TypeScript SDK
- V2 Preview (Preferred): https://platform.claude.com/docs/en/agent-sdk/typescript-v2-preview
- V1 Reference: https://platform.claude.com/docs/en/agent-sdk/typescript
- Migration Guide: https://platform.claude.com/docs/en/agent-sdk/migration-guide

### Features
- Permissions: https://platform.claude.com/docs/en/agent-sdk/permissions
- Hooks: https://platform.claude.com/docs/en/agent-sdk/hooks
- Subagents: https://platform.claude.com/docs/en/agent-sdk/subagents
- MCP: https://platform.claude.com/docs/en/agent-sdk/mcp
- Sessions: https://platform.claude.com/docs/en/agent-sdk/sessions
- User Input: https://platform.claude.com/docs/en/agent-sdk/user-input
- Structured Outputs: https://platform.claude.com/docs/en/agent-sdk/structured-outputs
- File Checkpointing: https://platform.claude.com/docs/en/agent-sdk/file-checkpointing
- Plugins: https://platform.claude.com/docs/en/agent-sdk/plugins
- Skills: https://platform.claude.com/docs/en/agent-sdk/skills
- Slash Commands: https://platform.claude.com/docs/en/agent-sdk/slash-commands

### Examples
- Demo Agents: https://github.com/anthropics/claude-agent-sdk-demos
- V2 Examples: https://github.com/anthropics/claude-agent-sdk-demos/tree/main/hello-world-v2

### SDK Repositories
- TypeScript SDK: https://github.com/anthropics/claude-agent-sdk-typescript
- Python SDK: https://github.com/anthropics/claude-agent-sdk-python
