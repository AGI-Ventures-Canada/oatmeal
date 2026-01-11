---
name: local-dev-setup
description: Helps set up local development environment for the Agents Server project. Use when someone asks how to run the project locally, set up local database, start local Supabase, configure .env or environment variables, get env keys, run dev server, install dependencies, or troubleshoot local setup issues.
allowed-tools: Read, Glob, Bash(bun:*), Bash(bunx:*), Bash(supabase:*), Bash(git:*), Bash(which:*), Bash(brew:*), Bash(node:*), Bash(npx:*)
---

# Developer Onboarding

Guide new developers through setting up the Agents Server project interactively. Work through each step, verify completion, and troubleshoot issues as they arise.

## Workflow

Walk through these steps in order. After each step, verify it succeeded before moving on.

### Step 1: Check Prerequisites

Run these commands to verify the developer has required tools:

```bash
bun --version       # Need Bun 1.0+
node --version      # Need Node.js 20.9+ (for Next.js 16)
supabase --version  # Need Supabase CLI
```

**If missing tools:**

- Bun: Install via `curl -fsSL https://bun.sh/install | bash` or `brew install oven-sh/bun/bun`
- Node.js: Install via `brew install node@20` or [nodejs.org](https://nodejs.org) (v20.9+)
- Supabase CLI: Install via `brew install supabase/tap/supabase`

### Step 2: Install Dependencies

```bash
bun install
```

Verify: Check that `node_modules` directory exists and has content.

### Step 3: Environment Setup

Copy the example env file and configure:

```bash
cp .env.example .env.local
```

Required environment variables:

```bash
# Clerk (authentication)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase (database)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# API Key hashing
API_KEY_SECRET=<random-32-char-string>
```

**Get these from:**
- Clerk: https://dashboard.clerk.com → API Keys
- Supabase: https://supabase.com/dashboard → Project Settings → API

### Step 4: Local Supabase (Optional)

For local database development:

```bash
supabase login
supabase link --project-ref <project-id>
supabase start
```

This starts local Supabase with:
- Studio: http://localhost:54323
- API: http://localhost:54321
- Inbucket (email): http://localhost:54324

Update `.env.local` with local credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from-supabase-start-output>
SUPABASE_SERVICE_ROLE_KEY=<from-supabase-start-output>
```

### Step 5: Start Development Server

```bash
bun dev
```

Verify: Open http://localhost:3000 in browser. The app should load.

### Step 6: Verify API

Test the health endpoint:

```bash
curl http://localhost:3000/api/public/health
```

Should return: `{"status":"ok","timestamp":"..."}`

API documentation available at: http://localhost:3000/api/swagger

### Step 7: Run Tests

```bash
bun test
```

All tests should pass before making changes.

### Step 8: Git Workflow Introduction

Read the project's git workflow from CLAUDE.md:

- **Never push directly to main** - always use feature branches
- Branch hierarchy: `feature branch` → `main` (production)

Create your first feature branch:

```bash
git checkout -b feature/your-feature-name
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `bun dev` | Start dev server |
| `bun run build` | Production build |
| `bun test` | Run tests |
| `bun lint` | Run ESLint |

| Service | Local URL |
|---------|-----------|
| App | http://localhost:3000 |
| API Swagger | http://localhost:3000/api/swagger |
| Health Check | http://localhost:3000/api/public/health |
| Supabase Studio | http://localhost:54323 |
| Supabase API | http://localhost:54321 |

## Troubleshooting

### Port 3000 already in use
```bash
lsof -i :3000
kill -9 <PID>
```

### Bun install fails
```bash
rm -rf node_modules bun.lock
bun install
```

### Supabase connection issues
- Check `.env.local` has correct credentials
- For local: ensure `supabase start` is running
- For remote: verify project is not paused in dashboard

### TypeScript errors after pulling
```bash
bun run build  # Regenerates types
```

## Next Steps After Setup

1. Read `CLAUDE.md` for project conventions
2. Read domain docs in `lib/*/CLAUDE.md` for specific patterns
3. Check `specs.md` for project roadmap (local only)
4. Explore the codebase: `app/` (routes), `lib/` (services)
