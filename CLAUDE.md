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
bun cli <args>       # Run CLI package (dev mode, TypeScript)
bun cli:test         # Run CLI tests
bun cli:build        # Build CLI for npm distribution
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
- `@agi-ventures-canada/hackathon-cli` — standalone CLI package (`packages/cli/`), published to npm, no server-side imports

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
- `packages/cli/CLAUDE.md` - CLI package architecture, adding commands, testing

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

### CLAUDE.md / AGENTS.md Symlink Convention

Every directory that contains agent instructions must expose them through both `CLAUDE.md` and `AGENTS.md`, with one filename symlinked to the other so the content stays identical across tools.

- When creating a new `CLAUDE.md`, also create `AGENTS.md` in the same directory as a symlink to it: `ln -s CLAUDE.md AGENTS.md`
- When creating a new `AGENTS.md`, also create `CLAUDE.md` in the same directory as a symlink to it: `ln -s AGENTS.md CLAUDE.md`
- Never maintain `CLAUDE.md` and `AGENTS.md` as separate standalone files with duplicated content
- If one of the two files already exists without the other, add the missing counterpart as a symlink instead of copying the file

### Claude Skills

Skills in `.claude/skills/`:
- `local-dev-setup.md` - Developer onboarding and local environment setup

#### Hackathon Skills (`skills/`)

Hackathon-specific AI agent skills live in `skills/` at the project root, distributed via [skills.sh](https://skills.sh). These are **not** internal dev skills — they're public, installable skills that any AI agent can use to interact with the Oatmeal platform or get hackathon guidance.

`npx skills add` scans agent-specific skill directories like `.agents/skills/` and `.claude/skills/` too, so public installable skills must live in `skills/`, while repo-local helper skills outside `skills/` must set `metadata.internal: true`.

**Install (for external users):**
```bash
npx skills add AGI-Ventures-Canada/oatmeal
```

**Structure:** Each skill follows the standard skills.sh format:
```
skills/<skill-name>/
├── SKILL.md              # Main skill file (YAML frontmatter + content)
└── references/           # Supporting documentation
    └── *.md
```

| Skill | Description | When It Activates |
|-------|-------------|-------------------|
| `hackathon-cli` | Manage hackathons from the terminal using the `hackathon` CLI tool. Covers creating hackathons, judges, criteria, prizes, assignments, results, webhooks, and schedules | User asks to create/manage hackathons via CLI or terminal |
| `hackathon-api` | Interact with the Oatmeal REST API directly via `curl` commands. Complete endpoint catalog, auth setup, and error handling | User asks to make direct API calls, test endpoints, or debug API responses |
| `hackathon-organizer` | Planning and running hackathons — timelines, budgets, sponsors, venue logistics, judging setup, marketing, day-of operations, and post-event follow-up | User asks how to organize, plan, or run a hackathon |
| `hackathon-attendee` | Competing in hackathons — preparation, team formation, time management, technical strategy, presenting, what judges look for, and networking | User is preparing for or competing in a hackathon |

**Skill routing:** The skills are designed to complement each other. If a user is organizing on the platform, `hackathon-cli` or `hackathon-api` handle the tooling while `hackathon-organizer` provides strategic advice. For participants, `hackathon-attendee` covers the human side while `hackathon-cli`/`hackathon-api` handle any platform interaction.

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
- **Use proper shadcn primitives — never wire up manual mouse/keyboard event handlers when a shadcn component already handles the interaction** (e.g., use `DropdownMenu` not `onMouseEnter`/`onMouseLeave` hacks, use `Dialog` not manual visibility state on a div)

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

### Copywriting

- Lead with the user outcome, not the internal feature or brand name
- Prefer one short sentence over two average ones
- Keep setup requirements and technical caveats out of first-glance UI copy unless they block the main action
- Move secondary details into tooltips, help text, accordions, or docs
- Use job-to-be-done labels like "Manage hackathons from your AI agent" instead of labels like "Install Oatmeal Skills"

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

**URL inputs must accept bare domains and paths.** Never require users to type `https://` manually.

- Use `type="text"` with `inputMode="url"` instead of `type="url"` so entries like `github.com/org/repo` are accepted
- Normalize URL values with `normalizeUrl()` from `lib/utils/url.ts` on blur or submit before validation/storage
- Disable auto-capitalization and spellcheck on URL fields
- When URL behavior changes in the app, update matching API routes and CLI flows too

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

**Auto-focus the first input when a form appears.** When a form, edit panel, or input section opens (via click, navigation, or modal), auto-focus the first focusable input so the user can start typing immediately. Use `autoFocus` on the first input, or programmatically focus via `ref` / `requestAnimationFrame` when the form mounts dynamically.

Exceptions (don't auto-focus):
- Mobile viewports where focus would trigger the keyboard and obscure content
- Multi-step wizards where the user needs to read instructions first
- Dialogs with destructive actions where accidental input is risky

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

**Mobile navigation**: The mobile menu (`components/mobile-header.tsx`) is a full-screen overlay with drill-down navigation (Sierra-style), completely independent from the desktop sidebar. Key principles:
- **Full-screen takeover**: Mobile menus use `fixed inset-0` overlays, never side-panel sheets that partially cover the screen
- **Drill-down, not replicate**: Don't mirror the desktop sidebar. Show only top-level items; expandable sections slide to a sub-level with a back button
- **Large touch targets**: Navigation items use `text-xl` with generous vertical padding (`py-5`). Minimum 44px tap target height
- **Separate components**: Mobile and desktop navigation are independent components with their own state — never reuse the desktop sidebar on mobile
- **Body scroll lock**: Lock `document.body.style.overflow = "hidden"` when the menu is open
- **Auto-close on navigation**: Watch `pathname`/`searchParams` and close the menu when they change

**Sidebar breakpoint**: The desktop sidebar uses `lg:` (1024px) as its visibility breakpoint, matching `MOBILE_BREAKPOINT = 1024` in `hooks/use-mobile.ts`. The mobile header shows below `lg:` (`flex lg:hidden`). Never use `md:` for sidebar-related visibility.

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
- Delete dead code outright — no commented-out blocks, `// TODO: remove`, or placeholder stubs
- **Reuse existing components and patterns** — before building something custom, check if a similar component already exists in the codebase. If unsure, ask the user before creating a new one
- **Consider CLI impact when changing app behavior** — this repo ships a standalone CLI in `packages/cli/`. If you change API contracts, validation, or user-facing workflows in the app, verify whether the CLI also needs matching support, tests, or docs

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

### Always Commit All Changes

**When committing, stage and include ALL changes in the working tree.** Do not cherry-pick only the files that seem related to the current task — treat every uncommitted change as part of the same work unit. Leaving behind orphaned changes clutters future diffs and risks losing work.

### Run CI Checks Before Pushing

**CRITICAL: Before pushing, run the same checks CI runs.** Catch failures locally instead of waiting for the pipeline.

```bash
bun lint && bun run build && bun test:all && bun cli:build
```

- `bun lint` — ESLint (CI `lint` job)
- `bun run build` — TypeScript type check + Next.js build (CI `test` job runs `tsc --noEmit`; build implies the same)
- `bun test:all` — unit + integration tests (CI `test` job)
- `bun cli:build` — CLI bundle must produce `packages/cli/dist/cli.mjs` without errors

If any command fails, fix the issue before pushing. Do not push code that doesn't pass all three.

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

### Merge Staging to Main via PR Only

**CRITICAL: Always merge `staging` into `main` via a pull request, never by direct merge + push.** Supabase's GitHub integration only applies migrations when they arrive through a PR merge event. A direct `git merge` + `git push` will deploy code to Vercel but **skip database migrations**, leaving production out of sync.

```bash
# GOOD - creates PR, Supabase applies migrations on merge
gh pr create --base main --head staging --title "Release: description" --body "Release notes"

# BAD - migrations won't run
git checkout main && git merge staging && git push
```

**Wait at least 10 minutes after merging a feature PR to staging before creating the staging→main PR.** Supabase's GitHub integration needs time to process preview branch migrations. Merging too quickly can cause migrations to be skipped on the production database.

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

### Never Force-Push Away Others' Work

**CRITICAL: `--force-with-lease` is ONLY safe when you are the sole author on the branch.** If someone else has pushed commits to the same branch, force-pushing will destroy their work.

Before force-pushing, always check what's on the remote:
```bash
git log --oneline origin/<branch-name> --not <branch-name>
```

If that shows commits you didn't write, **do not force-push**. Instead:
1. Pull and rebase on top of their changes: `git pull --rebase origin <branch-name>`
2. Resolve any conflicts manually — never skip or discard incoming changes
3. Push normally: `git push`

**When you see merge conflicts, that means both sides have changes that matter.** Never resolve conflicts by discarding the other person's work (e.g., "accept current" on everything). For each conflict:
1. Read both sides and understand what each change does
2. Ask the AI to explain what each side is doing if you're unsure
3. Keep both sides' intent in the resolution
4. Test the result

If you're unsure how to resolve a conflict, **ask for help** rather than force-pushing or blindly accepting one side.

### Auto-Push After Committing

**When the user says "push" or "push to PR", always commit and push in one flow.** If an open PR already exists for the current branch, push immediately after committing — do not ask for confirmation. Check for an existing PR with `gh pr view` before pushing.

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

### Proactive Code Review

**After completing any non-trivial change, run the review skill before considering the task done:**

```bash
/review-pr
```

This catches style violations, shadcn primitive misuse, dead code, and other issues before they land in a PR.

### Browser Verification

**For any UI change, always verify the result with the `agent-browser` skill before considering the task done.** Do not rely only on static code review, screenshots, or tests when the interface can be exercised in the browser.

### Required Environment Variables

Beyond the standard Clerk/Supabase keys, these secrets must be in `.env.local` for full functionality:

| Variable | Purpose | Generate with |
|----------|---------|---------------|
| `API_KEY_SECRET` | Hashes API keys before storing in the database | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | Encrypts API keys in CLI auth sessions (must be exactly 64 hex chars / 32 bytes) | `openssl rand -hex 32` |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project API key for analytics (Vercel production only) | PostHog dashboard |

Without `ENCRYPTION_KEY`, CLI login (`hackathon login`) will fail with "Internal server error" because `completeCliAuthSession` calls `encryptToken()` which requires it.

PostHog analytics is **production only** — do NOT set `NEXT_PUBLIC_POSTHOG_KEY` in `.env.local`. Set it in Vercel for Production only. CLI usage is tracked server-side via the `User-Agent: hackathon-cli/<version>` header — no PostHog key needed on the client.

### Local Supabase Port Assignments

Ports are customized in `supabase/config.toml` to avoid conflicts with `agents-server` (another local project that shares the same defaults):

| Service | Port |
|---------|------|
| db | 54422 |
| studio | 54423 |
| inbucket | 54426 |
| pooler | 54429 |
| analytics | 54427 |

If you see `ports are not available` on startup, the ghost port is likely held by a stopped Docker container from another project. Fix: `supabase stop` in the conflicting project, then restart Docker Desktop if the port persists.

### Keep Skills Updated

**When the stack changes or new services are added, update `.claude/skills/local-dev-setup.md`** to reflect:
- New environment variables required
- New prerequisites (tools, CLIs)
- New setup steps
- Updated troubleshooting guides
