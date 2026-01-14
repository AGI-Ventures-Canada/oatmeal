# AI SDK Agents

This directory contains AI agent definitions using AI SDK 6.

## Core Concepts

### Agent Interface
Agents implement `generate()` and `stream()` methods for AI responses.

```typescript
interface Agent {
  version: "agent-v1"
  id?: string
  tools: ToolSet
  generate(options): Promise<GenerateTextResult>
  stream(options): Promise<StreamTextResult>
}
```

### ToolLoopAgent
Multi-step reasoning agent that iteratively invokes tools until completion.

```typescript
import { ToolLoopAgent } from "ai"

const agent = new ToolLoopAgent({
  model: openai("gpt-4o"),
  instructions: "You are a helpful assistant",
  tools: {
    search: searchTool,
    calculate: calculateTool,
  },
  stopWhen: { maxSteps: 20 },
})

// Generate (blocking)
const result = await agent.generate({ prompt: "..." })

// Stream (real-time)
const stream = await agent.stream({ prompt: "..." })
```

### Tool Definition
```typescript
import { tool } from "ai"
import { z } from "zod"

const searchTool = tool({
  description: "Search the database",
  parameters: z.object({
    query: z.string(),
  }),
  execute: async ({ query }) => {
    return await db.search(query)
  },
})
```

## Streaming Patterns

### Direct Stream Return
```typescript
const stream = streamText({
  model: openai("gpt-4o"),
  prompt: "Hello"
})
return stream.textStream
```

### With Structured Output
```typescript
const agent = new ToolLoopAgent({
  model,
  tools,
  output: z.object({
    summary: z.string(),
    confidence: z.number(),
  }),
})
```

## Production: Use DurableAgent

For production workloads, use `DurableAgent` from `@workflow/ai/agent` instead of `ToolLoopAgent`. See `lib/workflows/CLAUDE.md` for patterns.

Key benefits:
- Auto-retry on failures
- Observability built-in
- Resumable across restarts
- Tools as durable steps

## Anthropic Models

The system uses Claude models via the `@ai-sdk/anthropic` provider:

| Model ID | Label | Notes |
|----------|-------|-------|
| `claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 | Default, best balance |
| `claude-haiku-4-5-20251001` | Claude Haiku 4.5 | Fast, cost-effective |
| `claude-opus-4-5-20251101` | Claude Opus 4.5 | Most capable |

### Provider Setup

```typescript
import { anthropic, SUPPORTED_MODELS } from "@/lib/ai/anthropic"

// Get provider for a model
const model = anthropic("claude-sonnet-4-5-20250929")

// Use in DurableAgent
const agent = new DurableAgent({
  model,
  system: "...",
  tools: {...},
})
```

## Skill Tools

Skills can expose tools that agents use. Tools are built from skill frontmatter:

```yaml
---
name: gmail-assistant
allowed-tools: gmail_list, gmail_read, gmail_send
required-integrations: gmail
---
```

Available integration tools:
- `gmail_list`, `gmail_read`, `gmail_send`
- `calendar_list`, `calendar_create`
- `notion_search`, `notion_create_page`
- `luma_list_events`, `luma_get_guests`

## Sandbox Tools (Bash & Text Editor)

Enable sandboxed file and command operations via Anthropic's bash and text editor tools. These tools run in a Daytona sandbox for isolation.

### Enabling Sandbox Tools

Set `enableSandboxTools: true` in agent config:

```typescript
const agent = {
  type: "ai_sdk",
  model: "claude-sonnet-4-5-20250929",
  config: {
    enableSandboxTools: true,
    initialFiles: [
      { path: "/workspace/data.txt", content: "Initial file content" }
    ],
    maxSteps: 30,
  }
}
```

### Available Tools

| Tool | Name in API | Description |
|------|-------------|-------------|
| Bash | `bash` | Execute shell commands in sandbox |
| Text Editor | `str_replace_editor` | View, create, edit files in sandbox |

### Text Editor Commands

| Command | Parameters | Description |
|---------|-----------|-------------|
| `view` | `path`, `view_range?` | Read file contents, optionally by line range |
| `create` | `path`, `file_text` | Create new file (fails if exists) |
| `str_replace` | `path`, `old_str`, `new_str` | Replace exact string in file |
| `insert` | `path`, `insert_line`, `new_str` | Insert text at specific line |
| `undo_edit` | `path` | Revert last edit to a file |

### Skills in Sandbox

When `enableSandboxTools` is true, skills attached to the agent are automatically seeded to `.claude/skills/` in the sandbox. The agent can read them using bash (`cat`) or text editor (`view`).

### Sandbox Lifecycle

1. Sandbox created when agent run starts (if `enableSandboxTools` is true)
2. Skills seeded to `.claude/skills/`
3. Initial files seeded from `config.initialFiles`
4. Agent uses bash/text editor tools to interact with sandbox filesystem
5. Sandbox automatically terminated when run completes

### Implementation Details

- Tools defined in `lib/agents/sandbox-tools.ts`
- Sandbox operations via `lib/sandbox/daytona.ts`
- Undo history stored in-memory per session

### Testing

```bash
bun scripts/test-sandbox-tools.ts
```

## Documentation
- AI SDK Intro: https://ai-sdk.dev/docs/introduction
- Agent Interface: https://ai-sdk.dev/docs/reference/ai-sdk-core/agent
- ToolLoopAgent: https://ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent
- Anthropic Provider: https://ai-sdk.dev/providers/ai-sdk-providers/anthropic
