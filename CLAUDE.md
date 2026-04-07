# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager

This project uses **bun** as the package manager.

**CRITICAL: NEVER use npm, yarn, or pnpm commands in this repository.**

**CRITICAL: Always use `bun run test`, never `bun test`.** The `bun test` command invokes Bun's built-in test runner directly, which can behave differently from the project's configured test script. Always use `bun run test` (and `bun run test:integration`, `bun run test:all`, etc.) to ensure the correct test configuration is used.

## Commands

```bash
bun dev                  # Start dev server (auto-starts local Supabase)
bun dev:fresh            # Reset database + start dev server (clean slate)
bun run build            # Production build
bun start                # Start production server
bun lint                 # Run ESLint
bun run test             # Run unit tests (api, lib, services)
bun run test:integration # Run integration tests separately
bun run test:all         # Run all tests (unit + integration)
bun db:sync              # Reset DB + regenerate types
bun db:diff name         # Capture Studio changes as migration
bun update-types         # Regenerate TypeScript types from DB
bun cli <args>           # Run CLI package (dev mode, TypeScript)
bun cli:test             # Run CLI tests
bun cli:build            # Build CLI for npm distribution
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

### New Features Require Plan Mode and Interview

**When the user asks to build a new feature, ALWAYS follow this process before writing any code:**

1. **Enter plan mode first.** Do not start implementation until a plan is agreed upon.
2. **Conduct an interview to clarify requirements.** Ask questions to understand:
   - What the feature should do from the user's perspective
   - Expected behavior, edge cases, and constraints
   - How it fits with existing functionality
   - Any UI/UX preferences or specific implementation details
   - Priority and scope — what's in v1 vs. later

Only proceed to implementation after the user has confirmed the plan. This applies to net-new features, not bug fixes, refactors, or small tweaks to existing behavior.

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

- **Never pass unvalidated strings to UUID column queries** — PostgreSQL throws `invalid input syntax for type uuid` which causes 500 errors. Use `isValidUuid()` from `lib/utils/uuid.ts` to validate route params before querying. The `HackathonDraftEditor` uses `id: "draft"` as a placeholder, so any component rendered during draft mode could trigger API calls with non-UUID IDs.
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

### Easy Navigation and Exit

Every flow must be easy to enter, navigate, and leave:

- **Easy exit**: Always provide a visible close/X button or cancel action. Support `Escape` to dismiss overlays, modals, and full-screen flows
- **Easy skip**: When only some steps are required, show a persistent skip action so users can jump straight to the result. Label it with the destination — "Skip to event page" not "Skip, create event"
- **Keyboard navigation**: `Enter` advances/submits (suppressed inside textareas and contentEditable). `Cmd/Ctrl+Enter` triggers the primary skip/submit action
- **Keyboard hints**: Show `Kbd` hints next to the action they trigger — e.g., `⌘+Enter` next to the skip button, `Enter` next to the continue button. Hide on mobile (`hidden sm:inline-flex`)
- **Progress indicators**: For multi-step flows, show a step counter (`1 / N`) and a progress bar so users know where they are and how much is left
- **Straightforward copy**: Action labels must tell the user exactly what will happen and where they'll end up. No ambiguous verbs
- **localStorage persistence**: Save draft state in multi-step flows so refreshes or sign-in redirects don't lose work
- **Late auth gates**: Don't require sign-in to fill out forms — gate only at submission time

### Human-Friendly Inputs

**Never expose internal IDs, raw timestamps, or technical formats to organizers or participants.** Every input must be designed for someone in a hurry who doesn't know (or care about) the system internals.

- **Identifiers**: Never ask for Clerk user IDs, database UUIDs, or internal codes. Use email addresses, names, or searchable dropdowns instead. Resolve to internal IDs server-side.
- **Time inputs**: Never use `datetime-local` for setting countdowns or durations relative to "now". Use quick-select duration presets (e.g., "5 min", "10 min", "15 min" buttons) with an optional custom input. Reserve `datetime-local` only for scheduling future dates (e.g., event start/end).
- **Status values**: Show human-readable labels ("In Progress", "Waiting for Review"), not raw enum values or database states.

If a form field requires the user to look something up in a different system, the UX is wrong — do the lookup for them.

### Unknown User by Email

When a feature references a user by email and the user doesn't exist in Clerk, send an invite instead of returning an error. The invite email must be personalized: who invited them, which organization, and what they're being invited to. Use the existing team invitation infrastructure (`team_invitations` table, `sendTeamInvitationEmail`, `/invite/[token]` acceptance page) as the pattern.

### Date/Time Defaults

**Every date/time input must have a sensible default value.** Users should never open a date picker and see a blank field when a reasonable starting point exists.

- **Event start dates**: Default to 2 weeks from today at 8:30 AM
- **Event end dates**: Default to the day after the start at 5:00 PM
- **Registration dates**: Default registration open to now, close to the day before the event
- **Schedule items**: Default to the next available slot after the last item (rounded up to the nearest 15 minutes), or now if no items exist. Default duration 30 minutes
- **Scheduled announcements**: Default to 1 hour from now
- **Recurring agent schedules**: Default to 9:00 AM
- **Time picker fallback**: When no value is set, default "from" times to 8:30 AM and "to" times to 5:00 PM — never 12:00 PM midnight-adjacent
- **Past date prevention**: Use `minDate` on `DateTimeRangePicker`/`DateTimePicker` (or `min` on native `datetime-local`) to prevent selecting dates in the past for forward-looking inputs (event start, registration open). Exception: admin editors where backdating may be intentional

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

### Optimistic Rendering

**Default to optimistic UI updates for all user-initiated mutations.** The user should see the result of their action instantly — never wait for an API round-trip to update the UI.

Pattern: track "hidden" or "pending" sets in component state. Apply them as filters/overlays on the server-provided data. On API failure, revert the optimistic state and show an error.

```typescript
// Optimistic removal: hide immediately, revert on failure
const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
const visibleItems = serverItems.filter(item => !hiddenIds.has(item.id))

async function handleRemove(id: string) {
  setHiddenIds(prev => new Set(prev).add(id))
  try {
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" })
    if (!res.ok) throw new Error("Failed")
    router.refresh()
  } catch {
    setHiddenIds(prev => { const next = new Set(prev); next.delete(id); return next })
    setError("Failed to remove item")
  }
}
```

- Remove loading spinners on buttons/items that disappear instantly — there's nothing left to show a spinner on
- Keep `router.refresh()` after success for eventual consistency with server state
- Re-throw errors when the optimistic function is called by child components that also handle errors

### Keep Seed Data in Sync

**When adding new columns, types, or features that affect database tables used in seed data, update ALL seed sources to include the new fields.** Stale seed data causes silent failures where seeded records fall through service logic that depends on the new fields.

Seed sources to check:
- `scripts/test-scenarios/_helpers.ts` — shared builders (`buildDefaultPrizes`, `addJudgingCriteria`, etc.)
- `scripts/test-scenarios/*.ts` — individual scenario scripts
- `lib/services/admin-scenarios.ts` — admin UI scenario runners
- `lib/api/routes/dev.ts` — dev API seed endpoints (`seed-all`, `seed-judging`, `seed-prizes`)
- `components/dev-tool/` — dev toolbar buttons that trigger seed endpoints

When a service function like `createPrize()` gains new parameters, update its type and pass-through logic so all callers (including seed code) can use the new fields. Raw `db.from().insert()` calls in seed code must include all required and functionally important columns — don't rely on DB defaults when the default value (e.g., `type = 'favorite'`) would cause downstream logic to skip the record.

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
bun run test              # Run unit tests (api, lib, services)
bun run test:integration  # Run integration tests separately
bun run test:email        # Run email template tests separately
bun run test:all          # Run all tests sequentially
bun run test --coverage   # Run with coverage report
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

#### Email Templates (React Email)

Email templates live in `emails/` as React Email components. Send logic stays in `lib/email/*.ts`, which renders components to HTML/text via `render()` from `@react-email/components`.

```bash
bun email:dev         # Preview all templates at http://localhost:3001
```

**Testing email templates:** Email tests mock `sendEmail` from `@/lib/email/resend` and assert on the `html`, `text`, `subject`, and `tags` passed to it. Use `.toContain()` for content assertions — never assert on exact HTML structure since React Email controls the markup.

```typescript
let sendEmailImpl = () => Promise.resolve({ id: "email_123" })
const mockSendEmail = mock((input: SendEmailInput) => sendEmailImpl(input))
mock.module("@/lib/email/resend", () => ({ sendEmail: mockSendEmail }))
const { sendTeamInvitationEmail } = await import("@/lib/email/team-invitations")

it("includes the accept URL", async () => {
  await sendTeamInvitationEmail(input)
  const call = mockSendEmail.mock.calls[0][0]
  expect(call.html).toContain("/invite/token123")
  expect(call.tags).toContainEqual({ name: "type", value: "team_invitation" })
})
```

**Email integration tests must run separately** (`bun test:email`) — they use `mock.module` at the email layer which conflicts with other test suites. Template smoke tests (`__tests__/lib/email-templates.test.ts`) have no mock conflicts and also run as part of `bun run test`.

## Git Workflow

### Starting New Work

When the user wants to start working on something new, automatically run this checklist before creating a feature branch:

1. **Check for pending changes**: Run `git status`. If there are uncommitted changes, investigate what they're for. Discard auto-generated files (lock files, build artifacts). For real work, either commit it to a branch or stash it — don't lose it silently.
2. **Sync with remote**: Run `git fetch origin` and check if the current branch is behind. Rebase or pull as needed.
3. **Branch from staging**: Create the new feature branch from the latest `origin/staging`:
   ```bash
   git checkout -b feature/<name> origin/staging
   ```

Do all of this without being asked — the user shouldn't need to spell out these steps each time.

### Always Commit All Changes

**When committing, stage and include ALL changes in the working tree.** Do not cherry-pick only the files that seem related to the current task — treat every uncommitted change as part of the same work unit. Leaving behind orphaned changes clutters future diffs and risks losing work.

### Run CI Checks Before Pushing

**CRITICAL: Before pushing, run the same checks CI runs.** Catch failures locally instead of waiting for the pipeline.

```bash
bun lint && bun run build && bun run test:all && bun cli:build
```

- `bun lint` — ESLint (CI `lint` job)
- `bun run build` — TypeScript type check + Next.js build (CI `test` job runs `tsc --noEmit`; build implies the same)
- `bun run test:all` — unit + integration tests (CI `test` job)
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
gh pr create --base staging --title "feat: your feature" --body "Description"
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

### Create PRs Ready for Review

**Do not create draft PRs.** PRs should be ready for review when created. Ensure all CI checks pass before opening.

```bash
gh pr create --base staging --title "feat: your feature" --body "Description"
```

### Resolve Merge Conflicts Before Opening PRs

**Always rebase onto the latest base branch and resolve any merge conflicts before creating or updating a PR.** Never open a PR with conflicts — the reviewer should never have to deal with them.

```bash
git fetch origin
git rebase origin/staging
# Resolve any conflicts, then:
git push --force-with-lease
```

If a PR develops conflicts after creation (e.g., another PR merged first), rebase and force-push immediately rather than leaving the PR in a conflicted state.

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

**CRITICAL: Before every push, run a local code review and fix all findings.** This is mandatory, not optional — do not push code that hasn't been reviewed.

1. Run the `code-reviewer` agent against the branch diff (`git diff origin/staging...HEAD`)
2. Fix all critical and important issues found
3. Re-run affected tests to verify fixes
4. Only then proceed with `git push`

Focus areas: security (auth bypasses, missing ownership checks), missing validation (body schemas, input sanitization), logic bugs (race conditions, regressions from refactors), type safety (unsafe casts, `as unknown`), and dead/duplicate code.

This catches real production bugs — not just style issues. Skipping this step has let security holes, functional regressions, and data integrity issues slip through.

### Address All PR Review Warnings

**All warnings from PR reviewers (automated or human) must be resolved before merging.** Do not treat warnings as optional — they indicate real issues that will compound if left unaddressed.

- **Warnings**: Must be fixed or refactored. If a warning is genuinely inapplicable, reply on the PR explaining why — don't silently ignore it.
- **Suggestions**: Evaluate and apply if they improve the code. If skipping, have a concrete reason (not "it works fine as-is").
- **Dead code, unused parameters, stale comments**: Fix immediately — these are easy wins that reviewers shouldn't have to flag twice.

### Address All PR Review Warnings

**All warnings from PR reviewers (automated or human) must be resolved before merging.** Do not treat warnings as optional — they indicate real issues that will compound if left unaddressed.

- **Warnings**: Must be fixed or refactored. If a warning is genuinely inapplicable, reply on the PR explaining why — don't silently ignore it.
- **Suggestions**: Evaluate and apply if they improve the code. If skipping, have a concrete reason (not "it works fine as-is").
- **Dead code, unused parameters, stale comments**: Fix immediately — these are easy wins that reviewers shouldn't have to flag twice.

### Browser Verification

**CRITICAL: For any UI change, you MUST verify the result in the browser with `agent-browser` before considering the task done.** Do not rely only on static code review, screenshots, or tests. If the interface can be exercised in the browser, exercise it.

#### Setup and Updates

Install: `brew install agent-browser` (or `npm i -g agent-browser` / `cargo install agent-browser`)
Update: `agent-browser upgrade` (or `brew upgrade agent-browser`)
Post-install: `agent-browser install` (downloads a bundled Chrome)

#### Skill Reference

Full command reference, authentication patterns, templates, and troubleshooting are in `.agents/skills/agent-browser/`. Use the `agent-browser` skill for detailed guidance on any command.

#### Connecting to the User's Chrome

The user keeps Chrome running with `--remote-debugging-port=9222`. Always connect to the existing session with `--auto-connect` instead of launching a headless browser.

```bash
# Auto-connect picks up the user's Chrome session automatically
agent-browser --auto-connect --session oatmeal open http://localhost:3000
```

If `--auto-connect` targets the wrong tab, find the correct one explicitly:
```bash
# List all tabs
curl -s http://127.0.0.1:9222/json/list | python3 -c "
import json,sys
tabs=json.load(sys.stdin)
for t in tabs:
  if t.get('type')=='page': print(f\"{t['id'][:12]}  {t['url'][:80]}\")
"

# Connect to a specific tab by WebSocket URL
WS_URL=$(curl -s http://127.0.0.1:9222/json/list | python3 -c "
import json,sys
tabs=json.load(sys.stdin)
for t in tabs:
  if 'localhost:3000' in t.get('url',''): print(t['webSocketDebuggerUrl']); break
")
agent-browser --cdp "$WS_URL" --session oatmeal snapshot -i
```

#### Standard Workflow

```bash
# 1. Open a page (auto-connect to user's Chrome)
agent-browser --auto-connect --session oatmeal open http://localhost:3000

# 2. Wait for page load, snapshot, interact
agent-browser --session oatmeal wait --load networkidle
agent-browser --session oatmeal snapshot -i
agent-browser --session oatmeal click @e1

# 3. Take screenshots to verify
agent-browser --session oatmeal screenshot /tmp/screenshot.png

# 4. Check browser console for errors
agent-browser --session oatmeal console

# 5. Always close session when done
agent-browser --session oatmeal close
```

### Required Environment Variables

Beyond the standard Clerk/Supabase keys, these secrets must be in `.env.local` for full functionality:

| Variable | Purpose | Generate with |
|----------|---------|---------------|
| `API_KEY_SECRET` | Hashes API keys before storing in the database | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | Encrypts API keys in CLI auth sessions (must be exactly 64 hex chars / 32 bytes) | `openssl rand -hex 32` |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project API key for analytics (Vercel production only) | PostHog dashboard |
| `SCENARIO_ORG_ID` | Clerk org ID used as the tenant when running admin test scenarios. **Required** to use `/admin/scenarios`. | Clerk Dashboard → Organizations → copy org ID |
| `SCENARIO_DEV_USER_ID` | Clerk user ID of the "organizer" persona in test scenarios. **Required** to use `/admin/scenarios` and the dev toolbar. | `bun run scripts/provision-test-users.ts` writes this to `.env.local` |

Without `ENCRYPTION_KEY`, CLI login (`hackathon login`) will fail with "Internal server error" because `completeCliAuthSession` calls `encryptToken()` which requires it.

Without `SCENARIO_ORG_ID`, running any scenario via the admin UI or API will throw `"SCENARIO_ORG_ID environment variable is required to run scenarios"`. The value must be a valid Clerk org ID that exists in your Clerk instance — the fallback ID in older code referred to the original dev environment's org and will not exist in a freshly provisioned Clerk app.

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
