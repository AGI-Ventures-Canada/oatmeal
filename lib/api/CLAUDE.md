# Elysia API Layer

This directory contains the Elysia API server that handles all `/api/*` routes.

## Architecture

All API routes are handled by a single Elysia instance via a Next.js catch-all route:
- `app/api/[[...slugs]]/route.ts` delegates to Elysia
- Elysia instance defined in `lib/api/index.ts`

## Route Namespaces

```
/api/public/*     → No auth (anon)
/api/dashboard/*  → Clerk user only
/api/v1/*         → API key only
```

## Key Patterns

### Elysia + Next.js Integration
```typescript
import { Elysia } from "elysia"

const api = new Elysia({ prefix: "/api" })
  .get("/public/health", () => ({ status: "ok" }))

export const GET = api.fetch
export const POST = api.fetch
```

**Critical:** `prefix` must match the route path (`/api` for `app/api/[[...slugs]]/route.ts`)

### Clerk Auth (use @clerk/nextjs, NOT elysia-clerk)
Since Elysia runs inside Next.js runtime, use `@clerk/nextjs/server` directly:
```typescript
import { auth } from "@clerk/nextjs/server"

.get("/dashboard/me", async () => {
  const { userId, orgId } = await auth()
  if (!userId) throw new Error("Unauthorized")
  return { userId, orgId }
})
```

### AI SDK Streaming
```typescript
import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"

.get("/chat", () => {
  const stream = streamText({
    model: openai("gpt-4o"),
    prompt: "Hello"
  })
  return stream.textStream
})

import { sse } from "elysia"
.get("/chat-sse", () => {
  const stream = streamText({...})
  return sse(stream.textStream)
})
```

### Type Safety with Eden
Export `Api` type for end-to-end type safety:
```typescript
export type Api = typeof api
```

## Documentation
- Elysia + Next.js: https://elysiajs.com/integrations/nextjs
- Elysia + AI SDK: https://elysiajs.com/integrations/ai-sdk.html
