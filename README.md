# Oatmeal

[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://vercel.com)
[![CI](https://github.com/AGI-Ventures-Canada/oatmeal/actions/workflows/ci.yml/badge.svg)](https://github.com/AGI-Ventures-Canada/oatmeal/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-Runtime-f9f1e1?logo=bun)](https://bun.sh/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)

Hackathon platform for organizers, teams, and judges.

## Stack

- Next.js 16 + Elysia (API)
- Clerk (auth)
- Supabase (database)
- Workflow DevKit (durable workflows)
- AI SDK 6

## Development

```bash
bun install
bun dev
```

| URL | Description |
|-----|-------------|
| http://localhost:3000 | App |
| http://localhost:3000/docs | Documentation |
| http://localhost:3000/api/swagger | API Reference |
| http://localhost:3000/api/public/health | Health Check |

Run tests: `bun test`

## Documentation

Interactive documentation is available at `/docs` with:
- Getting started guide
- Jobs API reference
- Webhooks guide
- Code examples with package manager tabs

## Rules Files

`CLAUDE.md` and `AGENTS.md` expose the same instructions for local development tools. In any directory that has agent guidance, one filename is a symlink to the other so different tools can read the same rules without duplicating content.

Public installable skills live in `skills/`. Repo-local helper skills live in agent-specific folders and are meant to support local development inside this repository.

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
