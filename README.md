# Agents Server

[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://vercel.com)
[![CI](https://github.com/AGI-Ventures-Canada/oatmeal/actions/workflows/ci.yml/badge.svg)](https://github.com/AGI-Ventures-Canada/oatmeal/actions/workflows/ci.yml)
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

| URL | Description |
|-----|-------------|
| http://localhost:3000 | App |
| http://localhost:3000/docs | SDK Documentation |
| http://localhost:3000/api/swagger | API Reference |
| http://localhost:3000/api/public/health | Health Check |

Run tests: `bun test`

## Documentation

Interactive SDK documentation is available at `/docs` with:
- Getting started guide
- Jobs API reference
- Agents API reference
- Code examples with package manager tabs

### AI-Friendly Docs

For LLM/AI consumption:
- `/llms.txt` - Documentation index with links
- `/llms-full.txt` - Complete documentation in single file

## TypeScript SDK

A type-safe TypeScript SDK is included in `packages/sdk/` for integrating with the v1 API.

### Installation

```bash
npm install @oatmeal/sdk
# or
bun add @oatmeal/sdk
```

### Usage

```typescript
import { createClient } from "@oatmeal/sdk"

const client = createClient("sk_live_your_api_key", {
  baseUrl: "https://your-api-domain.com"
})

// Jobs API
const { data: job } = await client.jobs.create({
  type: "analyze-document",
  input: { url: "https://example.com/doc.pdf" }
})
const result = await client.jobs.waitForResult(job.id)

// Agents API
const { data: run } = await client.agents.run("agent_id", {
  prompt: "Analyze quarterly sales data"
})
const agentResult = await client.agents.waitForResult(run.runId)
```

See [/docs](/docs) or [packages/sdk/README.md](packages/sdk/README.md) for full documentation.

### SDK Development

```bash
cd packages/sdk
bun run build    # Compile TypeScript
bun test         # Run SDK tests
```

## New Developer Setup

Use Claude Code for interactive onboarding:

```bash
claude
# Then type: /local-dev-setup
```

Or manually:

1. Install prerequisites: Bun, Node.js 20.9+, Supabase CLI, Docker
2. `bun install`
3. Copy `.env.example` to `.env.local` and add Clerk keys
4. `bun dev` (auto-starts local Supabase)
5. Open http://localhost:3000

See `.claude/skills/local-dev-setup.md` for detailed steps.
