---
name: local-dev-setup
description: Helps set up local development environment for the Agents Server project. Use when someone asks how to run the project locally, set up local database, start local Supabase, configure .env or environment variables, get env keys, run dev server, install dependencies, or troubleshoot local setup issues.
allowed-tools: Read, Glob, Bash(bun:*), Bash(bunx:*), Bash(supabase:*), Bash(git:*), Bash(which:*), Bash(brew:*), Bash(node:*), Bash(npx:*), Bash(docker:*)
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
docker info         # Need Docker running (for local Supabase)
```

**If missing tools:**

- Bun: Install via `curl -fsSL https://bun.sh/install | bash` or `brew install oven-sh/bun/bun`
- Node.js: Install via `brew install node@20` or [nodejs.org](https://nodejs.org) (v20.9+)
- Supabase CLI: Install via `brew install supabase/tap/supabase`
- Docker: Install via [Docker Desktop](https://www.docker.com/products/docker-desktop)

### Step 2: Install Dependencies

```bash
bun install
```

Verify: Check that `node_modules` directory exists and has content.

### Step 3: Environment Setup

Copy the example env file:

```bash
cp .env.example .env.local
```

Required environment variables:

```bash
# Clerk (authentication)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# API Key hashing
API_KEY_SECRET=<random-32-char-string>

# Supabase (auto-filled by bun dev for local)
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...
```

**Get Clerk keys from:** https://dashboard.clerk.com → API Keys

**Supabase keys are auto-configured** when running `bun dev` (local Supabase).

### Step 4: Start Development Server

```bash
bun dev
```

This will automatically:
1. Start local Supabase (if not running)
2. Configure `.env.local` with local Supabase credentials
3. Generate TypeScript types from database
4. Start Next.js dev server

First run may take a few minutes to download Supabase containers.

Verify: Open http://localhost:3000 in browser. The app should load.

### Step 5: Verify API

Test the health endpoint:

```bash
curl http://localhost:3000/api/public/health
```

Should return: `{"status":"ok","timestamp":"..."}`

API documentation available at: http://localhost:3000/api/swagger

### Step 6: Run Tests

```bash
bun test
```

All tests should pass before making changes.

### Step 7: Git Workflow Introduction

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
| `bun dev` | Start dev server (auto-starts local Supabase) |
| `bun dev:fresh` | Reset database + start dev server (clean slate) |
| `bun run build` | Production build |
| `bun test` | Run tests |
| `bun lint` | Run ESLint |
| `bun db:sync` | Reset DB + regenerate types |
| `bun db:diff name` | Capture Studio changes as migration |
| `bun update-types` | Regenerate TypeScript types |

| Service | Local URL |
|---------|-----------|
| App | http://localhost:3000 |
| API Swagger | http://localhost:3000/api/swagger |
| Health Check | http://localhost:3000/api/public/health |
| Supabase Studio | http://localhost:54423 |
| Supabase API | http://localhost:54421 |
| Inbucket (email) | http://localhost:54424 |

## Database Development

### Fresh Start (Clean Database)

```bash
bun dev:fresh
```

This resets the database, runs all migrations, seeds test data, and starts the dev server.

### After Schema Changes

If you modified migrations or made changes in Supabase Studio:

```bash
bun db:sync  # Reset + regenerate types
```

### Capturing UI Changes as Migrations

If you made schema changes via Supabase Studio:

```bash
bun db:diff descriptive_migration_name
```

This creates a migration file in `supabase/migrations/`.

### Test Data

Seed data is in `supabase/seed.sql`. It includes:
- Test tenants (org_test_local, org_test_demo)
- Test API keys (with dummy hashes)
- Sample jobs with various statuses
- Sample audit logs

### Creating New Tables

Always add RLS with DENY ALL policy:

```sql
CREATE TABLE new_table (...);

ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access" ON new_table FOR ALL USING (false);
```

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

### Docker not running
```bash
open -a Docker  # macOS
# Wait for Docker to start, then retry bun dev
```

### Supabase containers fail to start
```bash
supabase stop
docker system prune -f  # Clean up old containers
supabase start
```

### Supabase connection issues
- Check `.env.local` has correct credentials
- For local: ensure `supabase start` succeeded
- For remote: verify project is not paused in dashboard

### TypeScript errors after schema changes
```bash
bun update-types  # Regenerate types from local DB
```

### Migration conflicts
```bash
bun dev:fresh  # Nuclear option: reset everything
```

### Switching back to production database
```bash
# Restore production credentials
cp .env.local.production .env.local
```

## Next Steps After Setup

1. Read `CLAUDE.md` for project conventions
2. Read `supabase/CLAUDE.md` for database workflow
3. Read domain docs in `lib/*/CLAUDE.md` for specific patterns
4. Explore the codebase: `app/` (routes), `lib/` (services)
