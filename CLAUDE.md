# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager

This project uses **bun** as the package manager.

**CRITICAL: NEVER use npm, yarn, or pnpm commands in this repository.**

## Commands

```bash
bun dev          # Start dev server (auto-starts local Supabase)
bun dev:fresh    # Reset database + start dev server (clean slate)
bun run build    # Production build
bun start        # Start production server
bun lint         # Run ESLint
bun test         # Run tests
bun db:sync      # Reset DB + regenerate types
bun db:diff name # Capture Studio changes as migration
bun update-types # Regenerate TypeScript types from DB
```

## Architecture

Next.js 16 App Router with:
- React 19, TypeScript (strict mode), Tailwind CSS 4
- Supabase (database, auth helpers)
- Clerk (authentication)
- Stripe (payments)
- Elysia (API routes)
- AI SDK 6
- Shadcn/ui components

### Path Aliases

Use `@/*` to import from the project root.

### Domain Documentation

See domain-specific CLAUDE.md files for detailed patterns:
- `lib/api/CLAUDE.md` - Elysia API patterns, route namespaces, auth
- `lib/workflows/CLAUDE.md` - Workflow DevKit, durable agents, steps
- `lib/agents/CLAUDE.md` - AI SDK 6, ToolLoopAgent, streaming, Anthropic models
- `lib/sandbox/CLAUDE.md` - Daytona sandbox lifecycle, file operations
- `lib/integrations/CLAUDE.md` - OAuth flows, token management
- `lib/email/CLAUDE.md` - Resend email sending and receiving
- `supabase/CLAUDE.md` - Database development, migrations, branching

### External Documentation Links

When developers include external documentation links in requests, save them to the appropriate CLAUDE.md file:

| Domain | Target File |
|--------|-------------|
| ai-sdk.dev | lib/agents/CLAUDE.md |
| useworkflow.dev | lib/workflows/CLAUDE.md |
| daytona.io | lib/sandbox/CLAUDE.md |
| supabase.com | supabase/CLAUDE.md |
| resend.com | lib/email/CLAUDE.md |
| anthropic.com | lib/agents/CLAUDE.md |
| luma.com, docs.luma.com | lib/integrations/CLAUDE.md |

### Claude Skills

Skills in `.claude/skills/`:
- `local-dev-setup.md` - Developer onboarding and local environment setup

## Next.js 16 Specifics

### proxy.ts (replaces middleware.ts)
Use `proxy.ts` at project root for request interception (redirects, rewrites, headers):
```typescript
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL("/home", request.url))
}

export const config = {
  matcher: "/about/:path*",
}
```

**Note:** Use proxy for routing/edge decisions only. Auth + permissions belong in API handlers.

### Async Request APIs
All request APIs are now async and must be awaited:
```typescript
export default async function Page(props: PageProps<"/blog/[slug]">) {
  const { slug } = await props.params
  const query = await props.searchParams
  const cookieStore = await cookies()
  const headersList = await headers()
}
```

### Other Key Changes
- Turbopack is default (no flag needed)
- Node.js 20.9+ required
- `next lint` removed - use ESLint directly
- Parallel routes require `default.js` files

### Documentation
- Proxy: https://nextjs.org/docs/app/getting-started/proxy
- Upgrade Guide: https://nextjs.org/docs/app/guides/upgrading/version-16

## Development Rules

### Pages Must Be Server-Side

All page components in `app/` must be server-side rendered. Never use `"use client"` in page files. Extract client-side functionality into separate client components.

### UI Components

Base components are shadcn/ui. If a component doesn't exist in `/components/ui`, add it:

```bash
bunx shadcn@latest add <component-name>
```

Check existing components before creating new ones.

### shadcn/ui Styling

**CRITICAL: Use shadcn components as-is. Do not add custom styling.**

- Styling is pre-configured in shadcn config and globals.css
- Use component variants (e.g., `variant="outline"`) instead of custom classes
- Never override component styles with inline Tailwind classes
- If you need different styling, use the component's built-in variants

```typescript
// GOOD - use variant
<Button variant="destructive">Delete</Button>

// BAD - custom styling
<Button className="bg-red-500 hover:bg-red-600">Delete</Button>
```

### Colors

**CRITICAL: Never use custom Tailwind colors (e.g., `text-green-500`, `bg-blue-600`). Always use semantic CSS variables.**

Use only these semantic color classes:
- `text-primary`, `bg-primary` - brand/accent color
- `text-secondary`, `bg-secondary` - secondary elements
- `text-muted-foreground`, `bg-muted` - subtle/disabled
- `text-destructive`, `bg-destructive` - errors/danger
- `text-foreground`, `bg-background` - default text/background
- `border`, `ring` - borders and focus rings

```typescript
// GOOD - semantic colors
<span className="text-destructive">Error</span>
<div className="bg-muted text-muted-foreground">Subtle</div>

// BAD - custom colors
<span className="text-red-500">Error</span>
<div className="bg-gray-100 text-gray-500">Subtle</div>
```

This ensures consistent theming and proper dark mode support.

### Supabase

- Use Service Key in API endpoints to bypass RLS policies
- Handle auth and roles in the application layer, not RLS
- Never apply migrations directly to production - use PR workflow
- Test migrations locally with `supabase db reset` before pushing

### Forms

**Disable password manager autofill on most forms.** Add `autoComplete="off"` to forms that are not login/signup/contact forms.

```typescript
// GOOD - prevents password manager popups on app forms
<form onSubmit={handleSubmit} autoComplete="off">
  <Input name="hackathon-name" ... />
</form>

// Exceptions (allow autofill):
// - Login/signup forms
// - Contact forms with name/email fields
// - Profile forms where users enter personal info
```

### Code Style

- Do not write comments above code
- Maintain TypeScript type safety throughout

### Testing

**Target: 90% code coverage**

**CRITICAL: All new code must have accompanying tests. Do not submit code without tests.**

- Tests live in `__tests__/` directory mirroring source structure
- Use `bun:test` for test runner
- Run tests: `bun test`
- Run with coverage: `bun test --coverage`

Test organization:
```
__tests__/
├── api/           # API endpoint tests
├── lib/           # Utility/service tests
└── workflows/     # Workflow tests
```

## Git Workflow

### Never Push to Main

**NEVER develop on or push directly to `main`.** All changes go through feature branch → PR → merge.

Before making changes:
1. Check current branch: `git branch`
2. If on `main`, create feature branch: `git checkout -b feature/your-feature-name`
3. Push to feature branch: `git push -u origin feature/your-feature-name`
4. Create PR to merge into `main`

### Check PR Status Before Pushing

```bash
gh pr view <branch-name> --json state,mergedAt
```

If PR is `MERGED`, create a new feature branch for additional changes.

### Create PRs as Drafts

```bash
gh pr create --draft --title "feat: your feature" --body "Description"
gh pr ready  # When ready for review
```

### Commit Message Style

Follow Conventional Commits:

```
<type>(<scope>): <subject>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`

Subject: imperative present tense, no capital, no period, under 50 chars

Examples:
```
feat: add user authentication flow
fix: correct stripe webhook signature validation
refactor: extract payment logic into service
```

## Maintenance

### Keep Skills Updated

**When the stack changes or new services are added, update `.claude/skills/local-dev-setup.md`** to reflect:
- New environment variables required
- New prerequisites (tools, CLIs)
- New setup steps
- Updated troubleshooting guides
