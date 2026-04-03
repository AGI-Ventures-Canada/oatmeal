# Dev Tools

Development-only tools for testing the hackathon lifecycle. Guarded by `NODE_ENV === "development"` at both the mount point (`lib/api/index.ts`) and per-handler level (defence-in-depth).

## Files

| File | Purpose |
|------|---------|
| `lib/api/routes/dev.ts` | Elysia API endpoints (`/api/dev/hackathons/:id/*`) |
| `components/hackathon/debug-stage-switcher.tsx` | Floating dev tools panel UI |

## How It Works

1. The panel is a draggable floating pill rendered on manage pages when `NODE_ENV === "development"`
2. Each button calls a `POST`/`PATCH`/`DELETE` endpoint in `dev.ts`
3. After every action the panel saves its state (position, edge, expanded sections) to `sessionStorage` under key `devtools-state`, then calls `window.location.reload()` so the page reflects the change
4. On mount, the component checks `sessionStorage` and restores the panel open in the same position — the user never has to re-open it between actions

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

### 2. Add the UI button in `debug-stage-switcher.tsx`

Add a `<SeedButton>` inside the Seed Data grid:

```tsx
<SeedButton
  icon={<IconName className="size-3" />}
  label="Button Label"
  loading={isLoading}
  onClick={async () => {
    await devAction("/seed-thing", "POST", { count: 3 })
    showToast("Thing seeded")
  }}
/>
```

The `devAction()` helper handles fetch, sessionStorage save, and page reload automatically. The `showToast()` call won't actually display (reload happens first) but documents intent.

### 3. Add the icon import

Icons come from `lucide-react`. Add to the import at the top of the file.

## Constants

`SEED_USERS` — 10 fake Clerk user IDs (`seed_user_alice_001` through `seed_user_jack_010`). These are NOT real Clerk users so they won't have names/emails in Clerk lookups. The dev cleanup endpoint (`DELETE /seed-data`) deletes participants with these IDs.

`TEAM_NAMES` — 10 team names. `SUBMISSION_DATA` — 10 project title/description templates. `ROOM_NAMES` — 5 room names.

## Panel UX

- **Draggable**: pointer events with snap-to-edge on release (9-zone grid)
- **Escape to close**: global keydown listener
- **Click outside to close**: pointerdown listener checks panel/button refs
- **Session persistence**: `sessionStorage.getItem("devtools-state")` restores `{ position, edge, showMore }` after reload, then removes the key
- **Responsive**: accounts for sidebar width (256px at `lg:` breakpoint) in snap calculations

## UX Rules

### Human-Friendly Time Inputs

Never use raw `datetime-local` or ISO timestamp pickers for organizer-facing time inputs. Organizers set timers during a live event under time pressure — they need one-tap durations, not date pickers.

**Do:** Quick-select duration buttons (e.g., "3 min", "5 min", "10 min", "15 min", "30 min", "1 hr") that calculate `endsAt` from `Date.now() + duration`. Optionally include a custom minutes input for non-standard durations.

**Don't:** `<input type="datetime-local">` for setting countdown timers or deadlines relative to "now".

This applies to room timers, presentation timers, and any organizer-facing countdown control.

## Important Rules

- Never mount dev routes in production — `lib/api/index.ts` conditionally imports `devRoutes`
- Never import heavyweight services at the top of `dev.ts` — use dynamic `import()` to avoid circular deps
- The `devGuard()` check is defence-in-depth; even if the mount guard fails, individual handlers reject non-dev requests
- Seed cleanup must delete in dependency order (scores → assignments → criteria → room_teams → rooms → submissions → participants → teams) to respect foreign keys
- All seed data uses `SEED_USERS` IDs so cleanup can target only seeded rows without affecting real organizer data
