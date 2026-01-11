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

## Documentation
- AI SDK Intro: https://ai-sdk.dev/docs/introduction
- Agent Interface: https://ai-sdk.dev/docs/reference/ai-sdk-core/agent
- ToolLoopAgent: https://ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent
