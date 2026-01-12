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
