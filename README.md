# Agents Server

[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://vercel.com)
[![CI](https://github.com/AGI-Ventures-Canada/agents-server/actions/workflows/ci.yml/badge.svg)](https://github.com/AGI-Ventures-Canada/agents-server/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-Runtime-f9f1e1?logo=bun)](https://bun.sh/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)

API + dashboard for running AI agents at scale.

## Stack

- Next.js 16 + Elysia (API)
- Clerk (auth)
- Supabase (database)
- Workflow DevKit (durable agents)
- AI SDK 6

## Development

```bash
bun install
bun dev
```

- App: http://localhost:3000
- API docs: http://localhost:3000/api/swagger
- Health: http://localhost:3000/api/public/health
- Tests: `bun test`

## TypeScript SDK

A type-safe TypeScript SDK is included in `packages/sdk/` for integrating with the v1 API.

### Installation

```bash
npm install @agents-server/sdk
# or
bun add @agents-server/sdk
```

### Usage

```typescript
import { createClient } from "@agents-server/sdk"

const client = createClient("sk_live_your_api_key", {
  baseUrl: "https://your-domain.com"
})

// Create a job
const { data: job } = await client.jobs.create({
  type: "analyze-document",
  input: { url: "https://example.com/doc.pdf" }
})

// Wait for result
const result = await client.jobs.waitForResult(job.id)
```

See [packages/sdk/README.md](packages/sdk/README.md) for full documentation.

### SDK Development

```bash
cd packages/sdk
bun run build    # Compile TypeScript
bun test         # Run SDK tests
```
