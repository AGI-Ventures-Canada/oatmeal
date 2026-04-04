# Dev Tools

Development-only tools for testing the hackathon lifecycle. Guarded by `NODE_ENV === "development"` at both the mount point (`lib/api/index.ts`) and per-handler level (defence-in-depth).

## Files

| File | Purpose |
|------|---------|
| `lib/api/routes/dev.ts` | Elysia API endpoints (`/api/dev/hackathons/:id/*`) |
| `lib/dev/scenarios.ts` | Centralized scenario registry (single source of truth) |
| `lib/dev/test-personas.ts` | Test persona definitions and lookup |
| `components/dev-tool/dev-tool.tsx` | Global floating dev tools panel (root component) |
| `components/dev-tool/dev-tool-panel.tsx` | Tabbed panel container |
| `components/dev-tool/tabs/scenarios-tab.tsx` | Scenario quick-launch tab |
| `components/dev-tool/tabs/personas-tab.tsx` | Persona switcher tab |
| `components/dev-tool/tabs/event-tools-tab.tsx` | Event-specific tools tab |
| `components/dev-tool/use-event-context.ts` | Hook for detecting event page context |

## Architecture

The Dev Tool is a single client component mounted in `app/layout.tsx` with a `NODE_ENV === "development"` guard. It provides three tabs:

1. **Scenarios** — Run test scenarios from anywhere, with one-click launch that creates the scenario, switches persona, and navigates to the appropriate page
2. **Personas** — Switch between test personas (organizer, test users). Shows role badges when inside an event
3. **Event** — Event-specific tools (status, phase, timeline, seed data). Only visible when on `/e/[slug]/*` routes

The component detects event context by parsing `usePathname()` for `/e/[slug]` and fetching hackathon data via `GET /api/dev/hackathons/by-slug/:slug`.

## Scenario Registry

All scenarios are defined once in `lib/dev/scenarios.ts`:

```typescript
{ name, description, category, defaultPersona, defaultRoute }
```

Consumers:
- `lib/services/admin-scenarios.ts` — admin API scenario runners
- `scripts/test-scenario.ts` — CLI scenario entry point
- `components/dev-tool/tabs/scenarios-tab.tsx` — Dev Tool UI

## Adding a New Dev Tool Action

### 1. Add the API endpoint in `dev.ts`

```typescript
.post(
  "/hackathons/:id/seed-thing",
  async ({ params, body, set }) => {
    const guard = devGuard(set)
    if (guard) return guard

    const db = await getDb()
    // ... do work ...
    return { seeded: count }
  },
  { body: t.Object({ count: t.Optional(t.Number()) }) }
)
```

Patterns:
- Always call `devGuard(set)` first
- Use `getDb()` for service-key Supabase (bypasses RLS)
- Use `getHackathonTenant(id, set)` when you need the tenant ID
- Use `ensureParticipant(db, hackathonId, clerkUserId, role?)` to upsert seed users as participants
- Keep dynamic imports for services (`await import(...)`) to avoid circular deps

### 2. Add the UI button in `event-tools-tab.tsx`

Add a `<SeedButton>` inside the Seed Data grid:

```tsx
<SeedButton
  icon={<IconName className="size-3" />}
  label="Button Label"
  loading={isLoading}
  onClick={() => devAction("/seed-thing", "POST", { count: 3 })}
/>
```

The `devAction()` helper handles fetch, sessionStorage save, and page reload automatically.

### 3. Add the icon import

Icons come from `lucide-react`. Add to the import at the top of `event-tools-tab.tsx`.

## Adding a New Scenario

1. Add the scenario definition to `lib/dev/scenarios.ts`
2. Add the runner function in `lib/services/admin-scenarios.ts` under `scenarioRunners`
3. Create the CLI script in `scripts/test-scenarios/<name>.ts`

## Constants

`SEED_USERS` — 10 fake Clerk user IDs (`seed_user_alice_001` through `seed_user_jack_010`). These are NOT real Clerk users so they won't have names/emails in Clerk lookups. The dev cleanup endpoint (`DELETE /seed-data`) deletes participants with these IDs.

`TEAM_NAMES` — 10 team names. `SUBMISSION_DATA` — 10 project title/description templates. `ROOM_NAMES` — 5 room names.

## Panel UX

- **Global**: Visible on all pages in development mode
- **Draggable**: pointer events with snap-to-edge on release (9-zone grid)
- **Escape to close**: global keydown listener
- **Click outside to close**: pointerdown listener checks panel/button refs
- **Session persistence**: `sessionStorage.getItem("devtools-state")` restores `{ position, edge }` after reload, then removes the key
- **Responsive**: accounts for sidebar width (256px at `lg:` breakpoint) in snap calculations
- **Event-aware**: small dot indicator on pill when on an event page

## Important Rules

- Never mount dev routes in production — `lib/api/index.ts` conditionally imports `devRoutes`
- Never import heavyweight services at the top of `dev.ts` — use dynamic `import()` to avoid circular deps
- The `devGuard()` check is defence-in-depth; even if the mount guard fails, individual handlers reject non-dev requests
- Seed cleanup must delete in dependency order (scores → assignments → criteria → room_teams → rooms → submissions → participants → teams) to respect foreign keys
- All seed data uses `SEED_USERS` IDs so cleanup can target only seeded rows without affecting real organizer data
