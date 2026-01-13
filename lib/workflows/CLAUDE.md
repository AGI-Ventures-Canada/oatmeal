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

### API Route Integration

```typescript
import { start } from "workflow/api"

export async function POST(req: Request) {
  const { messages } = await req.json()
  const modelMessages = convertToModelMessages(messages)
  const run = await start(chatWorkflow, [modelMessages])

  return createUIMessageStreamResponse({
    stream: run.readable,
  })
}
```

## Defining Tools

Tools receive input parameters and context with message history:

```typescript
async function getWeather(
  { city }: { city: string },
  { messages, toolCallId }: { messages: LanguageModelV2Prompt; toolCallId: string }
) {
  "use step"
  return `Weather in ${city} is sunny`
}
```

### Step-Level vs Workflow-Level Tools

| Capability | Step-Level | Workflow-Level |
|---|---|---|
| `getWritable()` | ✅ | ❌ |
| Automatic retries | ✅ | ❌ |
| Side-effects/API calls | ✅ | ❌ |
| `sleep()` | ❌ | ✅ |
| `createWebhook()` | ❌ | ✅ |

Use step-level for I/O operations, workflow-level for orchestration with `sleep()` or webhooks.

## Streaming Updates from Tools

Emit custom data chunks during long-running operations:

```typescript
import { getWritable } from "workflow"

export async function searchFlights(
  { from, to, date },
  { toolCallId }
) {
  "use step"
  const writable = getWritable<UIMessageChunk>()
  const writer = writable.getWriter()

  for (const flight of generatedFlights) {
    await writer.write({
      id: `${toolCallId}-${flight.flightNumber}`,
      type: "data-found-flight",  // Must start with "data-"
      data: flight,
    })
  }
  writer.releaseLock()  // Always release when done
}
```

Custom data part type:
```typescript
export interface FoundFlightDataPart {
  type: "data-found-flight"  // Must start with "data-"
  id: string                  // Should match toolCallId
  data: { /* payload */ }
}
```

## Resumable Streams

Enable recovery from network interruptions and page refreshes.

### Server: Return Run ID
```typescript
const run = await start(chatWorkflow, [modelMessages])
return createUIMessageStreamResponse({
  stream: run.readable,
  headers: { "x-workflow-run-id": run.runId },
})
```

### Server: Reconnection Endpoint
```typescript
// GET /api/chat/[id]/stream
const run = getRun(id)
const stream = run.getReadable({ startIndex })  // Resume from position
return createUIMessageStreamResponse({ stream })
```

### Client: WorkflowChatTransport
The transport handles reconnection automatically:
- `onChatSendMessage`: Store run ID when streaming begins
- `onChatEnd`: Clear stored state on completion
- `prepareReconnectToStreamRequest`: Build reconnection URL with run ID

## Sleep and Delays

Pause execution without consuming resources. Survives restarts and deployments.

```typescript
import { sleep } from "workflow"

async function executeSleep({ durationMs }: { durationMs: number }) {
  // No "use step" - sleep is workflow-level
  await sleep(durationMs)
  return { message: `Slept for ${durationMs}ms` }
}
```

### Rate Limiting with RetryableError
```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get("Retry-After")
  throw new RetryableError(`Rate limited`, {
    delay: parseInt(retryAfter) * 1000,
  })
}
```

### Polling with Exponential Backoff
```typescript
let delay = 1000
const maxDelay = 60000

while (true) {
  const status = await checkJobStatus(jobId)
  if (status === "complete") break

  await sleep(Math.min(delay, maxDelay))
  delay *= 2
}
```

## Human-in-the-Loop

Pause workflows for human decisions without consuming compute.

### Define Hook
```typescript
import { defineHook } from "workflow"
import { z } from "zod"

export const bookingApprovalHook = defineHook({
  schema: z.object({
    approved: z.boolean(),
    comment: z.string().optional(),
  }),
})
```

### Tool Implementation (Workflow-Level)
```typescript
async function executeBookingApproval(
  { flightNumber, passengerName, price },
  { toolCallId }
) {
  // No "use step" - hooks are workflow-level
  const hook = bookingApprovalHook.create({ token: toolCallId })
  const { approved, comment } = await hook  // Pauses here
  return { approved, comment }
}
```

### Resume Endpoint
```typescript
// POST /api/approve-booking
await bookingApprovalHook.resume(toolCallId, { approved, comment })
```

### Alternative: Direct Webhooks
```typescript
import { createWebhook } from "workflow"

const webhook = createWebhook()
// Send webhook.url via email for approval
const response = await webhook  // Pauses until POST to URL
```

## Monitoring

```bash
npx workflow web      # Web UI
npx workflow inspect runs  # CLI
```

## Documentation

### Getting Started
- Next.js Setup: https://useworkflow.dev/docs/getting-started/next

### Foundations
- Workflows & Steps: https://useworkflow.dev/docs/foundations/workflows-and-steps
- Starting Workflows: https://useworkflow.dev/docs/foundations/starting-workflows
- Control Flow: https://useworkflow.dev/docs/foundations/control-flow-patterns

### AI & Durable Agents
- Overview: https://useworkflow.dev/docs/ai
- Defining Tools: https://useworkflow.dev/docs/ai/defining-tools
- Streaming Updates from Tools: https://useworkflow.dev/docs/ai/streaming-updates-from-tools
- Resumable Streams: https://useworkflow.dev/docs/ai/resumable-streams
- Sleep and Delays: https://useworkflow.dev/docs/ai/sleep-and-delays
- Human-in-the-Loop: https://useworkflow.dev/docs/ai/human-in-the-loop
