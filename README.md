# Agents Server

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
