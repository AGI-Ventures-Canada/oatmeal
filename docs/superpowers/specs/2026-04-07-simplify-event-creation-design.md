# Design: Simplify Event Creation Flow

**Date:** 2026-04-07
**Status:** Draft (updated)
**Pitch:** [Notion Pitch](https://www.notion.so/33bffe5c4f74817d8743e266c3394722)
**Appetite:** 2-3 weeks (medium batch)

## Problem

Organizers face three friction points when setting up an event:

1. **Too many dates.** Separate Registration start/end and Event start/end dates create unnecessary complexity. Most organizers don't think in terms of "registration period" vs "event period" — they think "my event is on this date."
2. **Confusing schedule section.** The "Schedule" tab with "schedule items" feels redundant and disconnected. Organizers don't understand the distinction between the event timeline and schedule items.
3. **No starting point for the agenda.** An empty schedule with a generic "Add Item" button gives organizers no sense of what a good event agenda looks like.

## Solution

Consolidate dates into a single event date range, unify the schedule into a trigger-aware agenda with dedicated trigger rows, and provide ghost template items so organizers start with a useful default.

## Decisions Made

| Decision | Choice | Alternatives Considered |
|----------|--------|------------------------|
| Registration dates | Derived: opens at publish, closes at `starts_at` | Keep as explicit fields; auto-derive from event dates with offset |
| Time triggers (challenge release, submission deadline) | Dedicated trigger rows in the agenda list with default times, actions, and status | Dropdown pickers above list; separate fields on hackathon; per-item dropdown in form |
| Trigger row UX | Reusable agenda row component that accepts actions and statuses — trigger rows live inline in the chronological list | Separate UI section for triggers; trigger pickers as dropdowns |
| Trigger default time | Challenge release defaults to `starts_at`; submission deadline defaults to `ends_at - 1h` | No defaults; require manual setup |
| Trigger firing | Auto-fires at scheduled time via polling; organizer can also click "Release Now" for early manual release | Manual-only; cron-based |
| Trigger deletion behavior | Deleting a trigger row disables the automation — challenge must be released manually, submissions close at `ends_at` | Prevent deletion of trigger rows |
| Schedule rename | "[Hackathon Name] Agenda" | "Agenda"; "Timeline"; "Day-of Plan" |
| Prefill approach | Ghost UI (placeholder items, not database records) | Real database records created on event creation |
| Dialog outside-click | Prevent close on outside click (`onInteractOutside` prevention) | Preserve form state across close/reopen cycles |

## Architecture

### Change 1: Consolidate Dates

Remove `registration_opens_at` and `registration_closes_at` as user-facing fields. Registration behavior becomes derived:

- **Registration opens** when the organizer publishes the hackathon (status → `registration_open`)
- **Registration closes** at `starts_at` (event start time)

The database columns are retained for now but are no longer set by organizers. The system sets them automatically:

```
Organizer publishes event
  → registration_opens_at = now()
  → registration_closes_at = starts_at

Organizer changes starts_at
  → registration_closes_at = new starts_at
```

**Why keep the columns:** Downstream components (registration button, time remaining bar, lifecycle stepper, hackathon cards, CLI) all read these columns. Keeping them populated avoids rewriting every consumer. The columns become system-managed rather than user-managed.

#### Affected Layers

**API — settings PATCH endpoint:**
- Remove `registrationOpensAt` / `registrationClosesAt` from the request body schema
- When `status` changes to `registration_open`, auto-set `registration_opens_at = now()`
- When `startsAt` changes, auto-set `registration_closes_at = startsAt`

**Timeline edit form:**
- Remove "Registration Period" date range picker
- Show only the "Event Period" picker (start/end)
- Remove `showRegistrationDates` / `showHackathonDates` props

**Timeline validation:**
- Remove all 6 registration-related validation rules
- Keep only: "Event must start before it ends"

**Lifecycle stepper — publish gate:**
- Remove "Registration opens" and "Registration closes" from `missingDates` check
- Only require "Event starts" and "Event ends" to publish

**Lifecycle stepper — judging transition:**
- Remove the auto-close registration logic (lines 288-292) since registration_closes_at is already derived from starts_at

**Create flow:**
- Remove `registrationOpensAt` / `registrationClosesAt` from `DraftState` (already unused, just cleanup)

**Components that read registration dates (no changes needed):**
- Registration button, time remaining bar, hackathon cards, dashboard tabs, CLI — all continue to read the system-managed columns as before

### Change 2: Unified Agenda with Trigger Rows

Rename the "Schedule" tab to "[Hackathon Name] Agenda". Trigger items (challenge release, submission deadline) are dedicated rows that live inline in the chronological agenda list alongside regular items.

#### Tab Rename

All user-facing copy changes:
- Tab label: "Schedule" → "Agenda"
- Section header: "Schedule" → "[Hackathon Name] Agenda"
- Description: "Manage the event agenda" → removed (redundant with the new title)
- Dialog titles: "Add Schedule Item" / "Edit Schedule Item" → "Add agenda item" / "Edit agenda item"
- Empty state: "No schedule items yet" → "No agenda items yet"
- Error messages: "Failed to save schedule item" → "Failed to save agenda item"
- Delete dialog: "Delete schedule item?" → "Delete agenda item?"

API routes, database table names, and service layer names remain unchanged (internal naming doesn't affect organizers).

#### Trigger Rows

Trigger items are special rows in the agenda list. They use the same reusable row component as regular items but receive additional props for actions and status.

```
┌─────────────────────────────────────────────────────┐
│  AI Buildathon 2026 Agenda                          │
├─────────────────────────────────────────────────────┤
│  9:00 AM   Opening Kickoff                    ✏️ 🗑️  │
│  9:00 AM   ⚡ Challenge Release    [Release Now]    │  ← trigger row
│  9:30 AM   Hacking Begins                     ✏️ 🗑️  │
│  ...                                                │
│  5:00 PM   ⚡ Submissions Close                     │  ← trigger row
│  6:00 PM   Presentations                      ✏️ 🗑️  │
│  7:30 PM   Awards Ceremony                    ✏️ 🗑️  │
└─────────────────────────────────────────────────────┘
```

Edit and delete use icon-only buttons (pencil and trash) consistent with the list item pattern established in Pitch 1. Trigger rows use text action buttons ("Release Now") since those are domain-specific actions, not standard edit affordances.

**How trigger rows differ from regular rows:**
- Visual: lightning bolt icon (⚡) prefix, subtle highlight background
- Actions: trigger-specific actions ("Release Now" for challenge, none for submission deadline once locked)
- Status: shows state ("Scheduled", "Released", "Closed")
- Editable: organizer can change the scheduled time
- Deletable: organizer can delete the trigger row, which disables the automation

**Reusable row component (`AgendaItemRow`):**
A single component renders both regular and trigger items. Props:

```typescript
interface AgendaItemRowProps {
  item: {
    id: string
    title: string
    starts_at: string
    ends_at: string | null
    location: string | null
    trigger_type: "challenge_release" | "submission_deadline" | null
  }
  status?: "scheduled" | "released" | "closed" | null
  actions?: React.ReactNode
  onEdit: () => void
  onDelete: () => void
}
```

**Data model:** One new nullable column on `hackathon_schedule_items`:

```sql
alter table hackathon_schedule_items
  add column trigger_type text check (trigger_type in ('challenge_release', 'submission_deadline'));

create unique index idx_schedule_items_trigger_unique
  on hackathon_schedule_items (hackathon_id, trigger_type)
  where trigger_type is not null;
```

The unique partial index ensures at most one item per trigger type per hackathon.

**Default behavior:**
- Challenge release trigger row defaults to `starts_at` time
- Submission deadline trigger row defaults to `ends_at - 1h`
- Both are created as real database records (not ghosts) when the organizer adds them from the ghost template or manually

**When a trigger fires (polling):**
- `challenge_release`: when the scheduled time arrives, sets `challenge_released_at` on the hackathon (existing field/service). If the organizer clicks "Release Now", it fires immediately.
- `submission_deadline`: the submission close time is read from this item's `starts_at` instead of `ends_at`. Components that check "can user submit?" query for the submission deadline item first, fall back to `ends_at`.

**When a trigger row is deleted:**
- Challenge release: must be released manually (existing release button in Challenge tab)
- Submission deadline: submissions close at `ends_at` (default behavior)

**Trigger row statuses:**

| Trigger | Before fire | After fire |
|---------|------------|------------|
| Challenge Release | "Scheduled for 9:00 AM" + [Release Now] button | "Released" badge, no action button |
| Submission Deadline | "Closes at 5:00 PM" | "Closed" badge (after time passes) |

### Change 3: Ghost Template Items

When the agenda tab is empty AND the event has `starts_at` / `ends_at` set, display ghost placeholder items instead of the generic empty state.

#### Template Items

| Relative Time | Suggested Title | Trigger Type | Notes |
|--------------|----------------|-------------|-------|
| `starts_at` | Opening Kickoff | `null` | Regular item |
| `starts_at` | Challenge Release | `challenge_release` | Trigger row, defaults to hackathon start |
| `starts_at + 30min` | Hacking Begins | `null` | Regular item |
| `ends_at - 1h` | Submissions Close | `submission_deadline` | Trigger row |
| `ends_at - 30min` | Presentations | `null` | Regular item |
| `ends_at` | Awards Ceremony | `null` | Regular item |

Both trigger items (Challenge Release, Submissions Close) are included in the ghost template. They're part of a typical hackathon agenda. Since they're ghosts, the organizer can choose to add them or not.

#### Behavior

- Ghost items render as visually distinct (dashed border, muted colors) with an "Add" button per item
- Trigger ghost items show the lightning bolt icon to indicate they're special
- An "Add all" button adds the entire template at once
- Once any real agenda items exist, ghosts disappear
- Ghost items recompute from current `starts_at` / `ends_at` on every render (no stale data)
- Adding a trigger ghost item creates a real database record with the `trigger_type` set

### Change 4: Fix Dialog Reset Bug

The schedule item creation dialog in the manage page loses all form data when the user clicks outside the dialog.

**Root cause:** `<Dialog onOpenChange={setDialogOpen}>` closes the dialog on outside click. When the user reopens it, `openCreate()` resets all state to defaults.

**Fix:** Add `onInteractOutside={(e) => e.preventDefault()}` to `<DialogContent>` to prevent accidental closure. The dialog can still be closed via the X button or Cancel button (intentional actions).

Applied to both:
- `app/(public)/e/[slug]/manage/_event-tab.tsx` (manage page dialog)
- `components/hackathon/overview-schedule.tsx` (overview dialog)

## Scope Boundaries

### In Scope

- Derive registration dates from publish action + `starts_at`
- Remove registration date pickers from timeline edit form
- Simplify timeline validation
- Rename schedule tab to "[Hackathon Name] Agenda"
- Add `trigger_type` column to schedule items
- Reusable `AgendaItemRow` component for regular and trigger items
- Dedicated trigger rows with default times, actions, status badges, and manual override
- Ghost template items for empty agenda (including trigger items)
- Fix dialog outside-click reset bug
- Update lifecycle stepper publish gate (remove registration date requirements)
- Update tests for all changed components

### Out of Scope

- Removing `registration_opens_at` / `registration_closes_at` database columns (kept for backwards compatibility)
- Cron-based trigger execution (v1 uses polling, same as existing challenge release)
- Custom trigger types beyond challenge release and submission deadline
- Drag-and-drop reordering of agenda items
- Multi-day agenda views
- Public-facing agenda page for participants (future feature)

## Migration Strategy

- New migration adds `trigger_type` column to `hackathon_schedule_items`
- No destructive changes to `hackathons` table — registration columns stay, become system-managed
- Existing hackathons with manually set registration dates continue to work (values are preserved)
- New hackathons get registration dates set automatically on publish

## Success Criteria

- Organizer creates an event with only one date range (start/end) — no registration dates visible
- Publishing an event automatically opens registration
- Registration closes at event start time without organizer intervention
- Agenda tab shows hackathon name and ghost template items (including trigger items) for new events
- Challenge release trigger row appears in the agenda at `starts_at` by default, organizer can edit time or click "Release Now"
- Submission deadline trigger row appears at `ends_at - 1h`, organizer can edit time
- Deleting a trigger row disables the automation gracefully
- Schedule item dialog does not lose data on accidental outside click
- All existing tests pass; new tests cover derived registration dates and trigger behavior
