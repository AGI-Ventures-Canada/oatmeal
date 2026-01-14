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

## Daytona SDK API Reference

### Core Client

```typescript
import { Daytona, Image } from "@daytonaio/sdk"

const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY,
  apiUrl: process.env.DAYTONA_API_URL,  // Optional
  target: "us",  // Optional: "us" or "eu"
})
```

### Sandbox Operations

```typescript
// Create sandbox from snapshot
const sandbox = await daytona.create({
  snapshot: "claude-agent-sdk-tiny",
  envVars: { ANTHROPIC_API_KEY: "..." },
  autoStopInterval: 30,
  autoArchiveInterval: 60,
})

// Find existing sandbox
const sandbox = await daytona.findOne(sandboxId)

// File operations
await sandbox.fs.createFolder(dirPath, "755")
await sandbox.fs.uploadFile(Buffer.from(content), filePath)
const content = await sandbox.fs.downloadFile(path)

// Command execution
const session = await sandbox.process.createSession()
const result = await sandbox.process.executeCommand(session.sessionId, command)
// result: { result?: string, exitCode?: number }

// Cleanup
await sandbox.delete()
```

### Snapshot Operations

```typescript
// Get existing snapshot
const snapshot = await daytona.snapshot.get("snapshot-name")

// List snapshots
const snapshots = await daytona.snapshot.list(page, limit)

// Create snapshot with Image helper
const nodeImage = Image.base("node:20-slim")
const pythonImage = Image.debianSlim("3.12")

const snapshot = await daytona.snapshot.create(
  {
    name: "my-snapshot",
    image: nodeImage,  // Must use Image helper, not string
    resources: { cpu: 2, memory: 4, disk: 10 },
    entrypoint: ["sleep", "infinity"],  // Must be string array
  },
  { onLogs: console.log }
)

// Delete snapshot
await daytona.snapshot.delete("snapshot-name")
```

### Image Helpers

```typescript
import { Image } from "@daytonaio/sdk"

// Base image from Docker Hub
Image.base("node:20-slim")
Image.base("python:3.12-slim-bookworm")
Image.base("ubuntu:22.04")

// Python-specific (uses Debian slim with Python)
Image.debianSlim("3.12")

// From Dockerfile
Image.fromDockerfile("Dockerfile")

// Chainable methods
Image.base("node:20-slim")
  .runCommands("npm install -g typescript")
  .env({ NODE_ENV: "production" })
  .workdir("/workspace")
  .entrypoint(["node"])
```

## Documentation Links

- Getting Started: https://www.daytona.io/docs/en/getting-started/
- Sandboxes: https://www.daytona.io/docs/en/sandboxes/
- Snapshots: https://www.daytona.io/docs/en/snapshots/
- File Operations: https://www.daytona.io/docs/en/file-system-operations/
- Claude Code: https://www.daytona.io/docs/en/claude-code-run-tasks-stream-logs-sandbox/
