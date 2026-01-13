# Daytona Sandbox

This directory contains the Daytona SDK integration for secure agent execution environments.

## Overview

Daytona provides isolated sandbox environments for running Claude Agent SDK agents. Each sandbox is a containerized environment with access to Python, Node.js, and the Claude CLI.

## Key Files

```
lib/sandbox/
└── daytona.ts       # SDK wrapper for sandbox lifecycle
```

## Core Functions

### Sandbox Lifecycle

```typescript
import { createSandbox, terminateSandbox } from "@/lib/sandbox/daytona"

// Create sandbox for an agent run
const sandbox = await createSandbox({
  tenantId: "...",
  agentRunId: "...",
  envVars: { ANTHROPIC_API_KEY: "..." },
  skills: [...],
})

// Terminate when done
await terminateSandbox(sandbox.daytona_sandbox_id)
```

### File Operations

```typescript
import { writeSandboxFiles, readSandboxFile } from "@/lib/sandbox/daytona"

// Write skills to sandbox
await writeSandboxFiles(sandboxId, [
  { path: ".claude/skills/my-skill/SKILL.md", content: "..." },
])

// Read file from sandbox
const content = await readSandboxFile(sandboxId, "/tmp/output.txt")
```

### Command Execution

```typescript
import { executeInSandbox } from "@/lib/sandbox/daytona"

const result = await executeInSandbox(sandboxId, "python script.py")
// result: { stdout, stderr, exitCode }
```

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DAYTONA_API_KEY` | API key for Daytona |
| `DAYTONA_API_URL` | Optional: Custom API URL |
| `DAYTONA_TARGET` | Optional: Region ("us" or "eu") |
| `DAYTONA_BASE_SNAPSHOT_ID` | Base snapshot with pre-installed dependencies |

### Base Snapshot

The base snapshot should include:
- Python 3.11 with Claude Agent SDK (`anthropic`)
- Node.js 20 with Claude Code CLI
- Common dependencies for automation tasks

## Sandbox Session Tracking

All sandbox sessions are stored in the `sandbox_sessions` table:
- Links sandbox to agent run
- Stores encrypted environment variables
- Tracks lifecycle state

## Security

- Environment variables are AES-256-GCM encrypted at rest
- OAuth tokens are passed via env vars, never in commands
- Sandboxes auto-terminate after configurable timeout

## Documentation Links

- Getting Started: https://www.daytona.io/docs/en/getting-started/
- Sandboxes: https://www.daytona.io/docs/en/sandboxes/
- Snapshots: https://www.daytona.io/docs/en/snapshots/
- File Operations: https://www.daytona.io/docs/en/file-system-operations/
- Claude Code: https://www.daytona.io/docs/en/claude-code-run-tasks-stream-logs-sandbox/
