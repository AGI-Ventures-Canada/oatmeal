# Workflow DevKit

This directory contains durable workflows for long-running agent jobs.

## Setup

```typescript
// next.config.ts
import { withWorkflow } from "workflow/next"
export default withWorkflow(nextConfig)
```

## Key Concepts

### Workflows (`"use workflow"`)
Entry points that orchestrate steps. Sandboxed, deterministic, auto-resume on failure.

```typescript
import { getWritable } from "workflow"

export async function myWorkflow(input: string) {
  "use workflow"

  const result = await myStep(input)
  return result
}
```

### Steps (`"use step"`)
Individual tasks with full Node.js access. Auto-retry (3x default), observable.

```typescript
export async function myStep(input: string) {
  "use step"
  return await db.query(input)
}
```

### Starting Workflows
```typescript
import { start } from "workflow/api"

const run = await start(myWorkflow, [input])

run.runId        // unique identifier
await run.status // "running" | "completed" | "failed"
await run.returnValue  // blocks until complete
run.readable     // stream for real-time updates
```

### Control Flow
```typescript
// Sequential
const a = await stepA()
const b = await stepB(a)

// Parallel
const [x, y] = await Promise.all([stepX(), stepY()])
```

## Durable Agents

For AI agents that need durability:

```typescript
import { DurableAgent } from "@workflow/ai/agent"
import { getWritable } from "workflow"

export async function agentWorkflow(messages: ModelMessage[]) {
  "use workflow"

  const writable = getWritable<UIMessageChunk>()
  const agent = new DurableAgent({
    model: "anthropic/claude-sonnet-4-20250514",
    system: "You are a helpful assistant",
    tools: myTools,
  })

  await agent.stream({ messages, writable })
}
```

Tools should be marked as steps for retry + observability:
```typescript
export async function searchTool(args: SearchArgs) {
  "use step"
  return await search(args)
}
```

## Monitoring

```bash
npx workflow web      # Web UI
npx workflow inspect runs  # CLI
```

## Documentation
- Getting Started: https://useworkflow.dev/docs/getting-started/next
- Workflows & Steps: https://useworkflow.dev/docs/foundations/workflows-and-steps
- Starting Workflows: https://useworkflow.dev/docs/foundations/starting-workflows
- Control Flow: https://useworkflow.dev/docs/foundations/control-flow-patterns
- Durable Agents: https://useworkflow.dev/docs/ai
