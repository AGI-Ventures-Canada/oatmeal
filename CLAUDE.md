# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager

This project uses **bun** as the package manager.

**CRITICAL: NEVER use npm, yarn, or pnpm commands in this repository.**

## Commands

```bash
bun dev              # Start dev server (auto-starts local Supabase)
bun dev:fresh        # Reset database + start dev server (clean slate)
bun run build        # Production build
bun start            # Start production server
bun lint             # Run ESLint
bun test             # Run unit tests (api, lib, services)
bun test:integration # Run integration tests separately
bun test:all         # Run all tests (unit + integration)
bun db:sync          # Reset DB + regenerate types
bun db:diff name     # Capture Studio changes as migration
bun update-types     # Regenerate TypeScript types from DB
```

### Test Scenarios

Seed the local database with a hackathon at a specific lifecycle stage. Useful for manual QA and UI work. Requires `bun dev` (or local Supabase) to be running.

```bash
bun run scripts/test-scenario.ts <scenario>
```

| Scenario | What it sets up |
|----------|-----------------|
| `pre-registration` | Hackathon not yet open for registration (opens tomorrow) |
| `registered-no-team` | Dev user registered, no team yet, registration open |
| `team-formed` | Dev user is captain with 2 members + 1 pending invite, hackathon active |
| `submitted` | Dev user's team has a submitted project, hackathon ends in 2 days |
| `judging` | 5 teams with submissions, 3 judges assigned, no scores yet |
| `judging-in-progress` | Same as above but ~60% of assignments scored |
| `results-ready` | All submissions scored, results calculated, 3 prizes defined (not yet assigned) |

## Architecture

Next.js 16 App Router with:
- React 19, TypeScript (strict mode), Tailwind CSS 4
- Supabase (database, auth helpers)
- Clerk (authentication)
- Stripe (payments)
- Elysia (API routes)
- AI SDK 6
- Shadcn/ui components

### Route Structure

The app has two main route groups:

| Route | Purpose | Auth | URL Pattern |
|-------|---------|------|-------------|
| `/e/[slug]` | Public event pages for participants, judges, and visitors | Optional | Human-readable slugs |
| `/hackathons/[id]` | Dashboard management for organizers and sponsors | Required | Database UUIDs |

- `(public)` routes allow unauthenticated access with a simple header
- `(dashboard)` routes require authentication and show the sidebar

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
- `scripts/CLAUDE.md` - Test scenario scripts for seeding dev database

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

### Sidebar

The dashboard sidebar is `components/app-sidebar-simple.tsx` — a custom component, **not** the shadcn/ui sidebar primitives in `/components/ui`. Always modify `app-sidebar-simple.tsx` for sidebar changes.

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
- **After creating or modifying migration files, always ask the user if they want to run `bun db:sync` to reset the database and regenerate types**

### Forms

**Disable password manager autofill on most forms.** Add these attributes to inputs that should not trigger password managers:

```typescript
// GOOD - prevents password manager popups on app forms
<Input
  name="hackathon-name"
  autoComplete="off"
  data-1p-ignore           // 1Password
  data-lpignore="true"     // LastPass
  data-form-type="other"   // Generic hint
/>

// Also add autoComplete="off" to the form element
<form onSubmit={handleSubmit} autoComplete="off">

// Exceptions (allow autofill):
// - Login/signup forms
// - Contact forms with name/email fields
// - Profile forms where users enter personal info
```

**Support Cmd/Ctrl+Enter to submit forms.** Most forms should be submittable with Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux):

```typescript
function handleKeyDown(e: React.KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !isSubmitting) {
    e.preventDefault()
    handleSubmit(e as unknown as React.FormEvent)
  }
}

<form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
```

Exceptions (use Enter instead):
- Search inputs
- Single-line forms with one field
- Chat/message inputs

### Mobile-First Responsive Design

**All UI must work on mobile (375px+).** Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) with mobile-first defaults:

- **Layouts**: Use `p-4 md:p-6` for padding, stack elements vertically by default
- **Flex containers with actions**: `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`
- **Fixed-width inputs**: `w-full sm:w-64` (full width on mobile, fixed on desktop)
- **Tables**: Always wrap `<Table>` in `<div className="overflow-x-auto">`
- **Button labels**: For action bars with multiple buttons, hide text on mobile: `<span className="hidden sm:inline">Label</span>` (keep icons visible)
- **Tab bars**: Wrap in `<div className="overflow-x-auto">` for horizontal scrolling

**Touch interactions**: Hover-based interactions (tooltips, hovercards, preview popups) don't work on touch devices. Every hover interaction must have a tap/click equivalent on mobile:
- **Hovercards/popups**: Use click/tap to open on mobile (e.g., wrap in a clickable element or use Popover instead of HoverCard)
- **Tooltips**: Ensure the underlying action is accessible without the tooltip
- **Hover states**: Visual hover effects are fine, but don't hide essential information behind hover-only interactions

```typescript
// GOOD - mobile-first
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
<div className="relative w-full sm:w-64">

// BAD - desktop-only
<div className="flex items-center justify-between">
<div className="relative w-64">
```

### Code Style

- Do not write comments above code
- Maintain TypeScript type safety throughout

### Testing

**Target: 90% code coverage**

**CRITICAL: All new code must have accompanying tests. Do not submit code without tests.**

#### Test Commands

```bash
bun test              # Run unit tests (api, lib, services)
bun test:integration  # Run integration tests separately
bun test:all          # Run both sequentially
bun test --coverage   # Run with coverage report
```

**IMPORTANT: Integration tests must run separately.** They use `mock.module` at the service layer, which conflicts with service tests that mock at the database layer. Running all tests together causes mock isolation failures.

#### Test Organization

```
__tests__/
├── api/           # API route tests
├── integration/   # Integration tests (run separately)
├── lib/           # Utility tests + shared mocks
│   └── supabase-mock.ts  # Shared Supabase mock utilities
├── services/      # Service layer tests with DB mocks
└── workflows/     # Workflow tests
```

#### Mocking Pattern

Service tests use closure-based mock setters from `__tests__/lib/supabase-mock.ts`:

```typescript
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
  setMockRpcImplementation,
} from "../lib/supabase-mock"

beforeEach(() => {
  resetSupabaseMocks()
})

it("example test", async () => {
  const chain = createChainableMock({
    data: { id: "1", name: "Test" },
    error: null,
  })
  setMockFromImplementation(() => chain)

  const result = await someServiceFunction()
  expect(result).not.toBeNull()
})
```

For RPC calls, use `setMockRpcImplementation()` instead.

## Git Workflow

### Never Push to Main

**NEVER develop on or push directly to `main` or `staging`.** All changes go through feature branch → PR → merge.

Before making changes:
1. Check current branch: `git branch`
2. If on `main` or `staging`, create feature branch: `git checkout -b feature/your-feature-name`
3. Push to feature branch: `git push -u origin feature/your-feature-name`
4. Create PR to merge into `staging`

### All PRs Target Staging

**All pull requests must target `staging`, never `main`.** The `main` branch is only updated via merges from `staging` after testing.

```bash
gh pr create --base staging --draft --title "feat: your feature" --body "Description"
```

### Rebase Feature Branches

**Keep feature branches clean with only branch-specific commits.** Before creating a PR or pushing updates, rebase onto the latest `staging`:

```bash
git fetch origin
git rebase origin/staging
```

This ensures:
- PR only shows commits related to the feature
- No merge commits cluttering history
- Easy to review changes in isolation

If conflicts occur during rebase, resolve them and continue:
```bash
git add .
git rebase --continue
```

After rebasing, force-push to update the remote branch:
```bash
git push --force-with-lease
```

### Check PR Status Before Pushing

```bash
gh pr view <branch-name> --json state,mergedAt
```

If PR is `MERGED`, create a new feature branch for additional changes.

### Create PRs as Drafts

```bash
gh pr create --base staging --draft --title "feat: your feature" --body "Description"
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
