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

## Documentation
- AI SDK Intro: https://ai-sdk.dev/docs/introduction
- Agent Interface: https://ai-sdk.dev/docs/reference/ai-sdk-core/agent
- ToolLoopAgent: https://ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent
- Anthropic Provider: https://ai-sdk.dev/providers/ai-sdk-providers/anthropic
