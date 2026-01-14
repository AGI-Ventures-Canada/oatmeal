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

// Create sandbox for an agent run (defaults to 5 minute timeout)
const sandbox = await createSandbox({
  tenantId: "...",
  agentRunId: "...",
  envVars: { ANTHROPIC_API_KEY: "..." },
  skills: [...],
  autoStopMinutes: 5, // Optional: defaults to 5 minutes
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

The base snapshot includes:
- Node.js 20 with npm
- Common dev tools: git, curl, wget, jq
- ca-certificates for HTTPS

To create or update the snapshot, use the script:

```bash
# Create new snapshot (tiny: 1 CPU, 1GB RAM)
DAYTONA_API_KEY=... bun scripts/create-daytona-snapshot.ts

# Create large snapshot (2 CPU, 4GB RAM)
DAYTONA_API_KEY=... bun scripts/create-daytona-snapshot.ts --large
```

When adding new tools to the snapshot, increment the VERSION constant in the script and create a new snapshot. Update `DAYTONA_BASE_SNAPSHOT_ID` in `.env.local` to use the new snapshot name.

## Sandbox Session Tracking

All sandbox sessions are stored in the `sandbox_sessions` table:
- Links sandbox to agent run
- Stores encrypted environment variables
- Tracks lifecycle state

## Security

- Environment variables are AES-256-GCM encrypted at rest
- OAuth tokens are passed via env vars, never in commands
- Sandboxes auto-terminate after 5 minutes by default (or when workflow ends)
- Use `autoStopMinutes` to customize timeout if longer execution is needed

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

## Next.js Configuration

When using Daytona SDK in a Next.js project, configure node polyfills to ensure compatibility with Webpack and Turbopack bundlers.

Add the following configuration to your `next.config.ts` file:

```typescript
import type { NextConfig } from 'next'
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin'
import { env, nodeless } from 'unenv'

const { alias: turbopackAlias } = env(nodeless, {})

const nextConfig: NextConfig = {
  // Turbopack
  experimental: {
    turbo: {
      resolveAlias: {
        ...turbopackAlias,
      },
    },
  },
  // Webpack
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(new NodePolyfillPlugin())
    }
    return config
  },
}

export default nextConfig
```

Required dependencies:
```bash
bun add -D node-polyfill-webpack-plugin unenv
```

## Documentation Links

- Getting Started: https://www.daytona.io/docs/en/getting-started/
- Sandboxes: https://www.daytona.io/docs/en/sandboxes/
- Snapshots: https://www.daytona.io/docs/en/snapshots/
- File Operations: https://www.daytona.io/docs/en/file-system-operations/
- Claude Code: https://www.daytona.io/docs/en/claude-code-run-tasks-stream-logs-sandbox/
