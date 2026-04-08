# Simplify Event Creation Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate event dates, unify the schedule into a trigger-aware agenda with inline trigger rows and ghost templates, and fix the dialog reset bug.

**Architecture:** Remove registration dates as user-facing fields (derive them from publish action + `starts_at`). Add `trigger_type` column to schedule items so dedicated trigger rows can auto-fire challenge release and submission close. Build a reusable `AgendaItemRow` component for both regular and trigger items. Replace the empty schedule state with ghost template items including triggers. Rename "Schedule" to "[Name] Agenda" throughout.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (PostgreSQL), Elysia API, shadcn/ui, Bun test runner

**Design Spec:** `docs/superpowers/specs/2026-04-07-simplify-event-creation-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `supabase/migrations/2026XXXXXXXX_schedule_trigger_type.sql` | Add `trigger_type` column + unique partial index |
| `components/hackathon/agenda-item-row.tsx` | Reusable row component for regular and trigger agenda items |
| `components/hackathon/agenda-ghost-items.tsx` | Ghost template items for empty agenda state |
| `__tests__/components/hackathon/agenda-item-row.test.tsx` | Tests for reusable row component |
| `__tests__/components/hackathon/agenda-ghost-items.test.tsx` | Tests for ghost template items |

### Modified Files
| File | What Changes |
|------|-------------|
| `lib/utils/timeline.ts` | Simplify `validateTimelineDates` to only check start < end |
| `lib/services/schedule-items.ts` | Add `trigger_type` to types, add `getSubmissionDeadline` function |
| `lib/api/routes/dashboard.ts:1069-1328` | Remove `registrationOpensAt`/`registrationClosesAt` from body schema; auto-set on publish + startsAt change |
| `lib/api/routes/dashboard-event.ts:521-562` | Add `trigger_type` to schedule item body schemas |
| `components/hackathon/edit-drawer/timeline-edit-form.tsx` | Remove registration period picker; simplify to single date range |
| `components/hackathon/lifecycle-stepper.tsx:401-407,288-292` | Remove registration date requirements from publish gate; remove auto-close logic |
| `components/hackathon/create-flow/create-flow.tsx:39-40` | Remove `registrationOpensAt`/`registrationClosesAt` from DraftState |
| `components/hackathon/hackathon-draft-editor.tsx:32-33` | Remove registration date fields from DraftState type |
| `app/(public)/e/[slug]/manage/_event-tab.tsx:86-90,1091-1460` | Add `hackathonName`/`startsAt`/`endsAt` props; rename labels; replace ScheduleSubTab internals with AgendaItemRow + ghost items; fix dialog bug |
| `app/(public)/e/[slug]/manage/page.tsx:220` | Pass `hackathonName`, `startsAt`, `endsAt` to EventTabContent |
| `components/hackathon/overview-schedule.tsx:149,212-215` | Rename labels; fix dialog outside-click bug |
| `components/hackathon/time-remaining-bar.tsx` | Check submission deadline trigger before falling back to `ends_at` |
| `__tests__/lib/timeline.test.ts` | Remove registration validation tests; update remaining tests |
| `__tests__/components/hackathon/timeline-edit-form.test.tsx` | Remove registration picker tests |
| `__tests__/components/hackathon/lifecycle-stepper.test.tsx` | Update publish gate tests |
| `__tests__/services/schedule-items.test.ts` | Add tests for trigger functions |

---

## Task 1: Fix Dialog Reset Bug

**Files:**
- Modify: `app/(public)/e/[slug]/manage/_event-tab.tsx:1294`
- Modify: `components/hackathon/overview-schedule.tsx:212`

- [ ] **Step 1: Fix manage page dialog**

In `app/(public)/e/[slug]/manage/_event-tab.tsx`, add `onInteractOutside` to the `DialogContent` at line 1294:

```tsx
// Change:
<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
  <DialogContent>

// To:
<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
  <DialogContent onInteractOutside={(e) => e.preventDefault()}>
```

- [ ] **Step 2: Fix overview schedule dialog**

In `components/hackathon/overview-schedule.tsx`, same fix at line 212:

```tsx
// Change:
<Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
  <DialogContent className="max-h-[85vh] overflow-y-auto">

// To:
<Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
  <DialogContent className="max-h-[85vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
```

- [ ] **Step 3: Run tests**

Run: `bun test -- --grep "schedule\|Schedule"`
Expected: All existing schedule tests still pass.

- [ ] **Step 4: Commit**

```bash
git add app/(public)/e/[slug]/manage/_event-tab.tsx components/hackathon/overview-schedule.tsx
git commit -m "fix: prevent agenda dialog from resetting on outside click"
```

---

## Task 2: Database Migration — Add trigger_type Column

**Files:**
- Create: `supabase/migrations/2026XXXXXXXX_schedule_trigger_type.sql`

- [ ] **Step 1: Create the migration file**

Run:
```bash
supabase migration new schedule_trigger_type
```

- [ ] **Step 2: Write the migration SQL**

```sql
alter table hackathon_schedule_items
  add column trigger_type text
  check (trigger_type in ('challenge_release', 'submission_deadline'));

create unique index idx_schedule_items_trigger_unique
  on hackathon_schedule_items (hackathon_id, trigger_type)
  where trigger_type is not null;

comment on column hackathon_schedule_items.trigger_type is
  'Optional system trigger linked to this agenda item. Only one item per trigger_type per hackathon.';
```

- [ ] **Step 3: Ask user if they want to run `bun db:sync`**

This resets the local DB and regenerates TypeScript types. The new `trigger_type` column will appear in `lib/db/types.ts`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add trigger_type column to hackathon_schedule_items"
```

---

## Task 3: Schedule Items Service — Add Trigger Support

**Files:**
- Modify: `lib/services/schedule-items.ts`
- Test: `__tests__/services/schedule-items.test.ts`

- [ ] **Step 1: Write failing tests for new trigger functions**

Add to `__tests__/services/schedule-items.test.ts`:

```typescript
import {
  listScheduleItems,
  createScheduleItem,
  updateScheduleItem,
  deleteScheduleItem,
  getSubmissionDeadline,
  getTriggerItem,
} from "@/lib/services/schedule-items"

describe("getSubmissionDeadline", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  it("returns starts_at of the submission_deadline item", async () => {
    const chain = createChainableMock({
      data: { id: "item-1", starts_at: "2026-04-10T17:00:00Z", trigger_type: "submission_deadline" },
      error: null,
    })
    setMockFromImplementation(() => chain)

    const result = await getSubmissionDeadline("hack-1")
    expect(result).toBe("2026-04-10T17:00:00Z")
  })

  it("returns null when no submission_deadline item exists", async () => {
    const chain = createChainableMock({ data: null, error: { code: "PGRST116" } })
    setMockFromImplementation(() => chain)

    const result = await getSubmissionDeadline("hack-1")
    expect(result).toBeNull()
  })
})

describe("getTriggerItem", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  it("returns the trigger item for a given type", async () => {
    const chain = createChainableMock({
      data: { id: "item-1", title: "Challenge Release", starts_at: "2026-04-10T09:00:00Z", trigger_type: "challenge_release" },
      error: null,
    })
    setMockFromImplementation(() => chain)

    const result = await getTriggerItem("hack-1", "challenge_release")
    expect(result).not.toBeNull()
    expect(result?.trigger_type).toBe("challenge_release")
  })

  it("returns null when no trigger item exists", async () => {
    const chain = createChainableMock({ data: null, error: { code: "PGRST116" } })
    setMockFromImplementation(() => chain)

    const result = await getTriggerItem("hack-1", "challenge_release")
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test __tests__/services/schedule-items.test.ts`
Expected: FAIL — `getSubmissionDeadline`, `getTriggerItem` not exported.

- [ ] **Step 3: Update types and add functions**

In `lib/services/schedule-items.ts`:

Update `ScheduleItem` type — add `trigger_type`:

```typescript
export type ScheduleItem = {
  id: string
  hackathon_id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string | null
  location: string | null
  sort_order: number
  trigger_type: "challenge_release" | "submission_deadline" | null
  created_at: string
  updated_at: string
}
```

Update `CreateScheduleItemInput` — add `triggerType`:

```typescript
export type CreateScheduleItemInput = {
  title: string
  description?: string
  startsAt: string
  endsAt?: string
  location?: string
  sortOrder?: number
  triggerType?: "challenge_release" | "submission_deadline" | null
}
```

In `createScheduleItem`, add to the insert object:

```typescript
trigger_type: input.triggerType ?? null,
```

Add new functions at end of file:

```typescript
export async function getSubmissionDeadline(hackathonId: string): Promise<string | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("hackathon_schedule_items")
    .select("starts_at")
    .eq("hackathon_id", hackathonId)
    .eq("trigger_type", "submission_deadline")
    .single()

  if (error || !data) return null
  return data.starts_at
}

export async function getTriggerItem(
  hackathonId: string,
  triggerType: "challenge_release" | "submission_deadline"
): Promise<ScheduleItem | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("hackathon_schedule_items")
    .select("*")
    .eq("hackathon_id", hackathonId)
    .eq("trigger_type", triggerType)
    .single()

  if (error || !data) return null
  return data as ScheduleItem
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test __tests__/services/schedule-items.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/services/schedule-items.ts __tests__/services/schedule-items.test.ts
git commit -m "feat: add trigger support to schedule items service"
```

---

## Task 4: Schedule Item API — Add trigger_type to Endpoints

**Files:**
- Modify: `lib/api/routes/dashboard-event.ts:527-552`

- [ ] **Step 1: Add triggerType to POST and PATCH body schemas**

In `lib/api/routes/dashboard-event.ts`, update the POST body schema (around line 537):

```typescript
body: t.Object({
  title: t.String(),
  startsAt: t.String(),
  description: t.Optional(t.String()),
  endsAt: t.Optional(t.String()),
  location: t.Optional(t.String()),
  sortOrder: t.Optional(t.Number()),
  triggerType: t.Optional(t.Union([
    t.Literal("challenge_release"),
    t.Literal("submission_deadline"),
    t.Null(),
  ])),
}),
```

Update the PATCH body schema similarly.

- [ ] **Step 2: Pass triggerType through to service calls**

In the POST handler, update the service call:

```typescript
const b = body as { title: string; startsAt: string; description?: string; endsAt?: string; location?: string; sortOrder?: number; triggerType?: "challenge_release" | "submission_deadline" | null }
const item = await createScheduleItem(params.id, b)
```

- [ ] **Step 3: Run build to verify types**

Run: `bun run build`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add lib/api/routes/dashboard-event.ts
git commit -m "feat: add trigger_type to schedule item API endpoints"
```

---

## Task 5: Simplify Timeline Validation

**Files:**
- Modify: `lib/utils/timeline.ts:127-160`
- Test: `__tests__/lib/timeline.test.ts`

- [ ] **Step 1: Update tests — remove registration validation, add simplified tests**

In `__tests__/lib/timeline.test.ts`, replace the `describe("validateTimelineDates")` block with:

```typescript
describe("validateTimelineDates", () => {
  it("returns null for valid dates (start before end)", () => {
    const result = validateTimelineDates({
      startsAt: "2026-03-01T09:00:00Z",
      endsAt: "2026-03-02T17:00:00Z",
    })
    expect(result).toBeNull()
  })

  it("returns null when dates are null", () => {
    expect(validateTimelineDates({})).toBeNull()
    expect(validateTimelineDates({ startsAt: null, endsAt: null })).toBeNull()
  })

  it("returns null when only start is set", () => {
    expect(validateTimelineDates({ startsAt: "2026-03-01T09:00:00Z" })).toBeNull()
  })

  it("returns null when only end is set", () => {
    expect(validateTimelineDates({ endsAt: "2026-03-02T17:00:00Z" })).toBeNull()
  })

  it("returns error when start equals end", () => {
    const result = validateTimelineDates({
      startsAt: "2026-03-01T09:00:00Z",
      endsAt: "2026-03-01T09:00:00Z",
    })
    expect(result).toBe("Event must start before it ends")
  })

  it("returns error when start is after end", () => {
    const result = validateTimelineDates({
      startsAt: "2026-03-02T09:00:00Z",
      endsAt: "2026-03-01T09:00:00Z",
    })
    expect(result).toBe("Event must start before it ends")
  })
})
```

- [ ] **Step 2: Run tests to see failures**

Run: `bun test __tests__/lib/timeline.test.ts`
Expected: FAIL — old tests removed, new error message doesn't match.

- [ ] **Step 3: Simplify the validation function and types**

In `lib/utils/timeline.ts`, replace `TimelineDates` and `validateTimelineDates` (lines 127-160):

```typescript
export interface TimelineDates {
  startsAt?: string | Date | null
  endsAt?: string | Date | null
}

export function validateTimelineDates(dates: TimelineDates): string | null {
  const starts = dates.startsAt ? new Date(dates.startsAt) : null
  const ends = dates.endsAt ? new Date(dates.endsAt) : null

  if (starts && ends && starts >= ends) {
    return "Event must start before it ends"
  }

  return null
}
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `bun test __tests__/lib/timeline.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/timeline.ts __tests__/lib/timeline.test.ts
git commit -m "refactor: simplify timeline validation to event dates only"
```

---

## Task 6: Simplify Timeline Edit Form

**Files:**
- Modify: `components/hackathon/edit-drawer/timeline-edit-form.tsx`
- Test: `__tests__/components/hackathon/timeline-edit-form.test.tsx`

- [ ] **Step 1: Update tests — remove registration picker tests**

In `__tests__/components/hackathon/timeline-edit-form.test.tsx`, update `baseData` to remove registration fields:

```typescript
const baseData = {
  startsAt: "2026-03-15T09:00:00Z",
  endsAt: "2026-03-16T17:00:00Z",
}

const emptyData = {
  startsAt: null,
  endsAt: null,
}
```

Remove any tests that reference `showRegistrationDates`, "Registration Period", `registrationOpensAt`, or `registrationClosesAt`.

- [ ] **Step 2: Run tests to see failures**

Run: `bun test __tests__/components/hackathon/timeline-edit-form.test.tsx`
Expected: FAIL — component still renders registration picker.

- [ ] **Step 3: Simplify the component**

In `components/hackathon/edit-drawer/timeline-edit-form.tsx`:

Update `initialData` prop type (line 24):
```typescript
initialData: {
  startsAt: string | null
  endsAt: string | null
}
```

Remove `showRegistrationDates` and `showHackathonDates` props. Remove `registrationRange` state (lines 55-58). Remove registration from `rangeChanged` dirty check (lines 70-72). Remove registration from `handleReset` (lines 75-78).

Simplify `save` function to only send event dates:

```typescript
const dateError = validateTimelineDates({
  startsAt: hackathonRange.from,
  endsAt: hackathonRange.to,
})
```

And the API body:
```typescript
body: JSON.stringify({
  startsAt: hackathonRange.from || null,
  endsAt: hackathonRange.to || null,
}),
```

Update `onSave` prop type:
```typescript
onSave?: (data: {
  startsAt: Date | null
  endsAt: Date | null
}) => Promise<boolean>
```

Remove the registration `<Field>` block (lines 165-177). Keep only the hackathon period picker. Update description text to "Set when the event starts and ends".

- [ ] **Step 4: Fix all callers of TimelineEditForm**

Search for `TimelineEditForm` usage and update callers that pass `registrationOpensAt`/`registrationClosesAt` in `initialData` or use `showRegistrationDates`/`showHackathonDates` props.

- [ ] **Step 5: Run tests**

Run: `bun test __tests__/components/hackathon/timeline-edit-form.test.tsx`
Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add components/hackathon/edit-drawer/timeline-edit-form.tsx __tests__/components/hackathon/timeline-edit-form.test.tsx
git commit -m "refactor: simplify timeline form to single event date range"
```

---

## Task 7: Auto-Derive Registration Dates in API

**Files:**
- Modify: `lib/api/routes/dashboard.ts:1069-1328`

- [ ] **Step 1: Remove registration fields from body schema**

In `lib/api/routes/dashboard.ts`, remove lines 1303-1304:
```typescript
// DELETE:
registrationOpensAt: t.Optional(t.Union([t.String(), t.Null()])),
registrationClosesAt: t.Optional(t.Union([t.String(), t.Null()])),
```

- [ ] **Step 2: Simplify hasDateUpdate check**

At lines 1073-1074:
```typescript
// Change:
const hasDateUpdate = body.startsAt !== undefined || body.endsAt !== undefined ||
  body.registrationOpensAt !== undefined || body.registrationClosesAt !== undefined

// To:
const hasDateUpdate = body.startsAt !== undefined || body.endsAt !== undefined
```

- [ ] **Step 3: Simplify date validation**

At lines 1098-1112:
```typescript
if (hasDateUpdate && !isTransition) {
  const { validateTimelineDates } = await import("@/lib/utils/timeline")
  const dateError = validateTimelineDates({
    startsAt: body.startsAt !== undefined ? body.startsAt : currentHackathon.starts_at,
    endsAt: body.endsAt !== undefined ? body.endsAt : currentHackathon.ends_at,
  })
  if (dateError) {
    return new Response(JSON.stringify({ error: dateError }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }
}
```

- [ ] **Step 4: Remove registration from hasOtherFields and updateHackathonSettings**

Remove `body.registrationOpensAt` and `body.registrationClosesAt` from the `hasOtherFields` condition (lines 1116-1125) and the `updateHackathonSettings` call (lines 1132-1154).

- [ ] **Step 5: Auto-set registration_closes_at on startsAt change**

After the `updateHackathonSettings` call:

```typescript
if (body.startsAt !== undefined && body.startsAt !== null) {
  const { updateHackathonSettings: updateSettings } = await import("@/lib/services/public-hackathons")
  await updateSettings(params.id, principal.tenantId, {
    registrationClosesAt: body.startsAt,
  })
}
```

- [ ] **Step 6: Auto-set registration dates on publish**

Inside the status transition block (after line 1183 where `previousStatus === "draft"` is checked):

```typescript
if (previousStatus === "draft" && body.status !== "draft") {
  const { updateHackathonSettings: updateReg } = await import("@/lib/services/public-hackathons")
  await updateReg(params.id, principal.tenantId, {
    registrationOpensAt: new Date().toISOString(),
    registrationClosesAt: hackathon.starts_at ?? new Date().toISOString(),
  })
  // ... existing judge invitation code continues
```

- [ ] **Step 7: Run build**

Run: `bun run build`
Expected: No type errors.

- [ ] **Step 8: Commit**

```bash
git add lib/api/routes/dashboard.ts
git commit -m "feat: auto-derive registration dates from publish action and startsAt"
```

---

## Task 8: Update Lifecycle Stepper

**Files:**
- Modify: `components/hackathon/lifecycle-stepper.tsx:288-292,401-407`
- Test: `__tests__/components/hackathon/lifecycle-stepper.test.tsx`

- [ ] **Step 1: Update tests — remove registration date requirements from publish gate**

In `__tests__/components/hackathon/lifecycle-stepper.test.tsx`, update tests that check for "Registration opens" or "Registration closes" in publish warnings to only check for "Event starts" and "Event ends".

- [ ] **Step 2: Run tests to see failures**

Run: `bun test __tests__/components/hackathon/lifecycle-stepper.test.tsx`
Expected: FAIL — component still checks for registration dates.

- [ ] **Step 3: Simplify publish gate**

In `components/hackathon/lifecycle-stepper.tsx`, update `missingDates` (lines 401-407):

```typescript
const missingDates = [
  !startsAt && "Event starts",
  !endsAt && "Event ends",
].filter(Boolean) as string[]
```

- [ ] **Step 4: Remove auto-close registration on judging transition**

At lines 288-292, delete:
```typescript
if (
  !registrationClosesAt ||
  new Date(registrationClosesAt) > new Date()
)
  body.registrationClosesAt = now
```

- [ ] **Step 5: Run tests**

Run: `bun test __tests__/components/hackathon/lifecycle-stepper.test.tsx`
Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add components/hackathon/lifecycle-stepper.tsx __tests__/components/hackathon/lifecycle-stepper.test.tsx
git commit -m "refactor: remove registration date requirements from lifecycle stepper"
```

---

## Task 9: Clean Up DraftState

**Files:**
- Modify: `components/hackathon/hackathon-draft-editor.tsx:32-33`
- Modify: `components/hackathon/create-flow/create-flow.tsx:39-40`
- Test: `__tests__/components/hackathon/create-flow/create-flow.test.tsx`

- [ ] **Step 1: Remove registration fields from DraftState type**

In `components/hackathon/hackathon-draft-editor.tsx`, remove:
```typescript
registrationOpensAt: string | null
registrationClosesAt: string | null
```

- [ ] **Step 2: Remove from create flow default state**

In `components/hackathon/create-flow/create-flow.tsx`, remove:
```typescript
registrationOpensAt: null,
registrationClosesAt: null,
```

- [ ] **Step 3: Update stateToHackathon mapping**

In `components/hackathon/hackathon-draft-editor.tsx`, find `stateToHackathon` and remove the lines that map `registrationOpensAt` / `registrationClosesAt`.

- [ ] **Step 4: Update create flow test**

In `__tests__/components/hackathon/create-flow/create-flow.test.tsx`, remove `registrationOpensAt` and `registrationClosesAt` from test state objects.

- [ ] **Step 5: Run build to catch remaining references**

Run: `bun run build`
Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add components/hackathon/hackathon-draft-editor.tsx components/hackathon/create-flow/create-flow.tsx __tests__/components/hackathon/create-flow/create-flow.test.tsx
git commit -m "refactor: remove registration date fields from DraftState"
```

---

## Task 10: Rename Schedule to Agenda

**Files:**
- Modify: `app/(public)/e/[slug]/manage/_event-tab.tsx:86-90,1228-1297,1421-1445`
- Modify: `app/(public)/e/[slug]/manage/page.tsx:220`
- Modify: `components/hackathon/overview-schedule.tsx:149`

- [ ] **Step 1: Add hackathonName, startsAt, endsAt to EventTabContentProps**

In `app/(public)/e/[slug]/manage/_event-tab.tsx`, update the interface (around line 86):

```typescript
interface EventTabContentProps {
  hackathonId: string
  hackathonName: string
  startsAt: string | null
  endsAt: string | null
  activeEtab: string
  hackathonStatus: HackathonStatus
  hackathonPhase: HackathonPhase | null
}
```

Update the function signature (line 1421):
```typescript
export function EventTabContent({ hackathonId, hackathonName, startsAt, endsAt, activeEtab, hackathonStatus, hackathonPhase }: EventTabContentProps) {
```

- [ ] **Step 2: Pass props from manage page**

In `app/(public)/e/[slug]/manage/page.tsx` (line 220):

```tsx
<EventTabContent
  hackathonId={hackathon.id}
  hackathonName={hackathon.name}
  startsAt={hackathon.starts_at}
  endsAt={hackathon.ends_at}
  activeEtab={activeEtab}
  hackathonStatus={hackathon.status}
  hackathonPhase={hackathon.phase}
/>
```

- [ ] **Step 3: Pass props to ScheduleSubTab**

Update ScheduleSubTab signature (line 1091):
```typescript
function ScheduleSubTab({ hackathonId, hackathonName, startsAt, endsAt }: {
  hackathonId: string
  hackathonName: string
  startsAt: string | null
  endsAt: string | null
}) {
```

Update usage in EventTabContent (line 1444):
```tsx
<ScheduleSubTab hackathonId={hackathonId} hackathonName={hackathonName} startsAt={startsAt} endsAt={endsAt} />
```

- [ ] **Step 4: Rename all user-facing labels**

In `_event-tab.tsx`:

Tab trigger (line 1428):
```tsx
<TabsTrigger value="schedule"><Calendar className="size-4" /><span className="hidden sm:inline">Agenda</span></TabsTrigger>
```

Section header (line 1231):
```tsx
<h3 className="text-sm font-medium">{hackathonName} Agenda</h3>
```

Remove description `<p>` tag (line 1232).

Dialog title (line 1297):
```tsx
<DialogTitle>{editing ? "Edit agenda item" : "Add agenda item"}</DialogTitle>
```

Empty state (line 1245):
```tsx
<p className="text-sm">No agenda items yet</p>
```

Delete dialog (line 1279):
```tsx
<AlertDialogTitle>Delete agenda item?</AlertDialogTitle>
```

Error messages (lines 1191, 1203):
```tsx
setError("Failed to save agenda item")
setError("Failed to delete agenda item")
```

- [ ] **Step 5: Rename in overview-schedule**

In `components/hackathon/overview-schedule.tsx`:

Line 149: `<h3 className="text-sm font-semibold">Agenda</h3>`

Line 161: `<p className="text-sm text-muted-foreground mb-2">No agenda items</p>`

Line 215: `<DialogTitle>Add agenda item</DialogTitle>`

- [ ] **Step 6: Run build**

Run: `bun run build`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add app/(public)/e/[slug]/manage/_event-tab.tsx app/(public)/e/[slug]/manage/page.tsx components/hackathon/overview-schedule.tsx
git commit -m "feat: rename Schedule to [Hackathon Name] Agenda"
```

---

## Task 11: Reusable AgendaItemRow Component

**Files:**
- Create: `components/hackathon/agenda-item-row.tsx`
- Test: `__tests__/components/hackathon/agenda-item-row.test.tsx`

- [ ] **Step 1: Write tests**

Create `__tests__/components/hackathon/agenda-item-row.test.tsx`:

```tsx
import { describe, it, expect } from "bun:test"
import { render, screen } from "@testing-library/react"
import { AgendaItemRow } from "@/components/hackathon/agenda-item-row"

const regularItem = {
  id: "item-1",
  title: "Opening Kickoff",
  starts_at: "2026-04-10T09:00:00Z",
  ends_at: "2026-04-10T09:30:00Z",
  location: "Main Hall",
  trigger_type: null,
}

const challengeItem = {
  id: "item-2",
  title: "Challenge Release",
  starts_at: "2026-04-10T09:00:00Z",
  ends_at: null,
  location: null,
  trigger_type: "challenge_release" as const,
}

describe("AgendaItemRow", () => {
  it("renders a regular item with title and time", () => {
    render(
      <AgendaItemRow
        item={regularItem}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )
    expect(screen.getByText("Opening Kickoff")).toBeDefined()
  })

  it("renders location when provided", () => {
    render(
      <AgendaItemRow
        item={regularItem}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )
    expect(screen.getByText("Main Hall")).toBeDefined()
  })

  it("renders trigger indicator for trigger items", () => {
    render(
      <AgendaItemRow
        item={challengeItem}
        status="scheduled"
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )
    expect(screen.getByText("Challenge Release")).toBeDefined()
    expect(screen.getByText("Scheduled")).toBeDefined()
  })

  it("renders custom actions for trigger items", () => {
    render(
      <AgendaItemRow
        item={challengeItem}
        status="scheduled"
        actions={<button>Release Now</button>}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )
    expect(screen.getByText("Release Now")).toBeDefined()
  })

  it("renders released status badge", () => {
    render(
      <AgendaItemRow
        item={challengeItem}
        status="released"
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )
    expect(screen.getByText("Released")).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test __tests__/components/hackathon/agenda-item-row.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `components/hackathon/agenda-item-row.tsx`:

```tsx
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Pencil, Trash2, Clock, MapPin, Zap } from "lucide-react"

type AgendaItem = {
  id: string
  title: string
  starts_at: string
  ends_at: string | null
  location: string | null
  trigger_type: "challenge_release" | "submission_deadline" | null
}

type TriggerStatus = "scheduled" | "released" | "closed" | null

interface AgendaItemRowProps {
  item: AgendaItem
  status?: TriggerStatus
  actions?: React.ReactNode
  onEdit: () => void
  onDelete: () => void
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  scheduled: "secondary",
  released: "default",
  closed: "outline",
}

const statusLabel: Record<string, string> = {
  scheduled: "Scheduled",
  released: "Released",
  closed: "Closed",
}

export function AgendaItemRow({ item, status, actions, onEdit, onDelete }: AgendaItemRowProps) {
  const isTrigger = !!item.trigger_type

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${isTrigger ? "bg-muted/30 border-primary/20" : ""}`}>
      <div className="shrink-0 pt-0.5 text-muted-foreground">
        {isTrigger ? (
          <Zap className="size-4 text-primary" />
        ) : (
          <Clock className="size-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{item.title}</p>
          {status && (
            <Badge variant={statusVariant[status] ?? "secondary"} className="text-xs">
              {statusLabel[status] ?? status}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
          <span>{formatTime(item.starts_at)}{item.ends_at ? ` – ${formatTime(item.ends_at)}` : ""}</span>
          {item.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {item.location}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {actions}
        <Button size="sm" variant="ghost" onClick={onEdit}>
          <Pencil className="size-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost">
              <Trash2 className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete agenda item?</AlertDialogTitle>
              <AlertDialogDescription>
                {isTrigger
                  ? `This will remove the ${item.trigger_type === "challenge_release" ? "challenge release" : "submission deadline"} automation. You can add it back later.`
                  : "This cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `bun test __tests__/components/hackathon/agenda-item-row.test.tsx`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add components/hackathon/agenda-item-row.tsx __tests__/components/hackathon/agenda-item-row.test.tsx
git commit -m "feat: add reusable AgendaItemRow component for regular and trigger items"
```

---

## Task 12: Ghost Template Items Component

**Files:**
- Create: `components/hackathon/agenda-ghost-items.tsx`
- Test: `__tests__/components/hackathon/agenda-ghost-items.test.tsx`

- [ ] **Step 1: Write tests**

Create `__tests__/components/hackathon/agenda-ghost-items.test.tsx`:

```tsx
import { describe, it, expect } from "bun:test"
import { render, screen } from "@testing-library/react"
import { AgendaGhostItems, buildGhostItems } from "@/components/hackathon/agenda-ghost-items"

describe("buildGhostItems", () => {
  it("returns 6 template items from start/end dates", () => {
    const items = buildGhostItems("2026-04-10T09:00:00Z", "2026-04-10T18:00:00Z")
    expect(items).toHaveLength(6)
    expect(items[0].title).toBe("Opening Kickoff")
    expect(items[1].title).toBe("Challenge Release")
    expect(items[2].title).toBe("Hacking Begins")
    expect(items[3].title).toBe("Submissions Close")
    expect(items[4].title).toBe("Presentations")
    expect(items[5].title).toBe("Awards Ceremony")
  })

  it("marks Challenge Release with challenge_release trigger", () => {
    const items = buildGhostItems("2026-04-10T09:00:00Z", "2026-04-10T18:00:00Z")
    const challenge = items.find((i) => i.title === "Challenge Release")
    expect(challenge?.triggerType).toBe("challenge_release")
  })

  it("marks Submissions Close with submission_deadline trigger", () => {
    const items = buildGhostItems("2026-04-10T09:00:00Z", "2026-04-10T18:00:00Z")
    const submission = items.find((i) => i.title === "Submissions Close")
    expect(submission?.triggerType).toBe("submission_deadline")
  })

  it("defaults challenge release to starts_at", () => {
    const items = buildGhostItems("2026-04-10T09:00:00Z", "2026-04-10T18:00:00Z")
    const challenge = items.find((i) => i.title === "Challenge Release")
    expect(challenge?.startsAt).toBe("2026-04-10T09:00:00.000Z")
  })

  it("defaults submissions close to ends_at - 1h", () => {
    const items = buildGhostItems("2026-04-10T09:00:00Z", "2026-04-10T18:00:00Z")
    const submission = items.find((i) => i.title === "Submissions Close")
    expect(submission?.startsAt).toBe("2026-04-10T17:00:00.000Z")
  })
})

describe("AgendaGhostItems", () => {
  it("renders all ghost items with Add buttons", () => {
    render(
      <AgendaGhostItems
        startsAt="2026-04-10T09:00:00Z"
        endsAt="2026-04-10T18:00:00Z"
        onAddItem={() => {}}
        onAddAll={() => {}}
      />
    )
    expect(screen.getByText("Opening Kickoff")).toBeDefined()
    expect(screen.getByText("Challenge Release")).toBeDefined()
    expect(screen.getByText("Submissions Close")).toBeDefined()
    expect(screen.getByText("Awards Ceremony")).toBeDefined()
    expect(screen.getByText("Add all")).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test __tests__/components/hackathon/agenda-ghost-items.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the component**

Create `components/hackathon/agenda-ghost-items.tsx`:

```tsx
"use client"

import { Button } from "@/components/ui/button"
import { Calendar, Plus, Zap } from "lucide-react"

export type GhostItem = {
  title: string
  startsAt: string
  endsAt: string
  triggerType: "challenge_release" | "submission_deadline" | null
}

export function buildGhostItems(startsAt: string, endsAt: string): GhostItem[] {
  const start = new Date(startsAt)
  const end = new Date(endsAt)

  function offset(base: Date, minutes: number): string {
    return new Date(base.getTime() + minutes * 60_000).toISOString()
  }

  return [
    {
      title: "Opening Kickoff",
      startsAt: start.toISOString(),
      endsAt: offset(start, 30),
      triggerType: null,
    },
    {
      title: "Challenge Release",
      startsAt: start.toISOString(),
      endsAt: start.toISOString(),
      triggerType: "challenge_release",
    },
    {
      title: "Hacking Begins",
      startsAt: offset(start, 30),
      endsAt: offset(start, 60),
      triggerType: null,
    },
    {
      title: "Submissions Close",
      startsAt: offset(end, -60),
      endsAt: offset(end, -60),
      triggerType: "submission_deadline",
    },
    {
      title: "Presentations",
      startsAt: offset(end, -30),
      endsAt: end.toISOString(),
      triggerType: null,
    },
    {
      title: "Awards Ceremony",
      startsAt: end.toISOString(),
      endsAt: offset(end, 30),
      triggerType: null,
    },
  ]
}

function formatGhostTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}

interface AgendaGhostItemsProps {
  startsAt: string
  endsAt: string
  onAddItem: (item: GhostItem) => void
  onAddAll: (items: GhostItem[]) => void
}

export function AgendaGhostItems({ startsAt, endsAt, onAddItem, onAddAll }: AgendaGhostItemsProps) {
  const items = buildGhostItems(startsAt, endsAt)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Suggested agenda</p>
        <Button variant="outline" size="sm" onClick={() => onAddAll(items)}>
          <Plus className="size-3.5" />
          Add all
        </Button>
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.title}
            className={`flex items-center gap-3 rounded-lg border border-dashed p-3 text-muted-foreground ${item.triggerType ? "border-primary/30" : ""}`}
          >
            {item.triggerType ? (
              <Zap className="size-4 shrink-0 opacity-50 text-primary" />
            ) : (
              <Calendar className="size-4 shrink-0 opacity-50" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm">{item.title}</p>
              <p className="text-xs opacity-70">{formatGhostTime(item.startsAt)}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={() => onAddItem(item)}
            >
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `bun test __tests__/components/hackathon/agenda-ghost-items.test.tsx`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add components/hackathon/agenda-ghost-items.tsx __tests__/components/hackathon/agenda-ghost-items.test.tsx
git commit -m "feat: add ghost template items with trigger items for empty agenda"
```

---

## Task 13: Integrate AgendaItemRow + Ghost Items + Trigger Actions into Agenda Tab

**Files:**
- Modify: `app/(public)/e/[slug]/manage/_event-tab.tsx:1091-1418`

This task wires everything together: replaces the existing schedule item rendering with `AgendaItemRow`, adds ghost items, and adds the "Release Now" action for challenge triggers.

- [ ] **Step 1: Add imports**

At the top of `_event-tab.tsx`:

```typescript
import { AgendaItemRow } from "@/components/hackathon/agenda-item-row"
import { AgendaGhostItems, type GhostItem } from "@/components/hackathon/agenda-ghost-items"
```

- [ ] **Step 2: Update ScheduleItemData type**

At line 1052, add `trigger_type`:

```typescript
type ScheduleItemData = {
  id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string | null
  location: string | null
  sort_order: number
  trigger_type: "challenge_release" | "submission_deadline" | null
}
```

- [ ] **Step 3: Add challenge release handler**

Inside `ScheduleSubTab`, add a handler for the "Release Now" action:

```typescript
const [releasing, setReleasing] = useState(false)

async function handleReleaseChallenge() {
  setReleasing(true)
  try {
    const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/challenge/release`, {
      method: "POST",
    })
    if (!res.ok) throw new Error("Failed to release")
    setItems((prev) =>
      prev.map((i) =>
        i.trigger_type === "challenge_release"
          ? { ...i, _released: true } as any
          : i
      )
    )
  } catch {
    setError("Failed to release challenge")
  } finally {
    setReleasing(false)
  }
}
```

- [ ] **Step 4: Add ghost item handlers**

```typescript
async function handleAddGhostItem(ghost: GhostItem) {
  const payload: Record<string, unknown> = {
    title: ghost.title,
    startsAt: ghost.startsAt,
    endsAt: ghost.endsAt,
  }
  if (ghost.triggerType) payload.triggerType = ghost.triggerType

  const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (res.ok) {
    const saved = await res.json()
    setItems((prev) => [...prev, saved].sort((a, b) => a.starts_at.localeCompare(b.starts_at)))
  }
}

async function handleAddAllGhostItems(ghosts: GhostItem[]) {
  for (const ghost of ghosts) {
    await handleAddGhostItem(ghost)
  }
}
```

- [ ] **Step 5: Determine trigger status**

Add a helper to compute trigger row status:

```typescript
function getTriggerStatus(item: ScheduleItemData): "scheduled" | "released" | "closed" | null {
  if (!item.trigger_type) return null
  if (item.trigger_type === "challenge_release") {
    // Check if challenge has been released (we'd need this from parent or a fetch)
    // For now, check if starts_at has passed
    return new Date(item.starts_at) <= new Date() ? "released" : "scheduled"
  }
  if (item.trigger_type === "submission_deadline") {
    return new Date(item.starts_at) <= new Date() ? "closed" : "scheduled"
  }
  return null
}
```

- [ ] **Step 6: Replace item list rendering with AgendaItemRow**

Replace the existing items map (lines 1248-1292) with:

```tsx
{items.length === 0 ? (
  startsAt && endsAt ? (
    <AgendaGhostItems
      startsAt={startsAt}
      endsAt={endsAt}
      onAddItem={handleAddGhostItem}
      onAddAll={handleAddAllGhostItems}
    />
  ) : (
    <div className="rounded-lg border p-8 text-center text-muted-foreground">
      <Calendar className="size-8 mx-auto mb-2 opacity-50" />
      <p className="text-sm">Set event dates to see suggested agenda items</p>
    </div>
  )
) : (
  <div className="space-y-2">
    {items.map((item) => (
      <AgendaItemRow
        key={item.id}
        item={item}
        status={getTriggerStatus(item)}
        actions={
          item.trigger_type === "challenge_release" && getTriggerStatus(item) === "scheduled" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReleaseChallenge}
              disabled={releasing}
            >
              {releasing ? "Releasing..." : "Release Now"}
            </Button>
          ) : undefined
        }
        onEdit={() => openEdit(item)}
        onDelete={() => handleDelete(item.id)}
      />
    ))}
  </div>
)}
```

- [ ] **Step 7: Remove old inline item rendering and delete confirmation dialog**

Remove the old `<div>` blocks that rendered items with inline pencil/trash buttons (lines 1248-1292) and the old `<AlertDialog>` per item (lines 1271-1288) — these are now handled inside `AgendaItemRow`.

- [ ] **Step 8: Run build**

Run: `bun run build`
Expected: No type errors.

- [ ] **Step 9: Commit**

```bash
git add app/(public)/e/[slug]/manage/_event-tab.tsx
git commit -m "feat: integrate AgendaItemRow, ghost items, and trigger actions into agenda tab"
```

---

## Task 14: Update Time Remaining Bar for Submission Deadline

**Files:**
- Modify: `components/hackathon/time-remaining-bar.tsx:48-56`
- Modify: `app/(public)/e/[slug]/manage/page.tsx`

- [ ] **Step 1: Add submissionDeadline prop**

In `components/hackathon/time-remaining-bar.tsx`, update the `Props` type:

```typescript
type Props = {
  status: HackathonStatus
  registrationOpensAt: string | null
  registrationClosesAt: string | null
  startsAt: string | null
  endsAt: string | null
  submissionDeadline?: string | null
}
```

- [ ] **Step 2: Use submissionDeadline in active status milestone**

Update the `active` status block (lines 48-57):

```typescript
if (props.status === "active") {
  const deadline = props.submissionDeadline ?? props.endsAt
  if (deadline) {
    const d = new Date(deadline)
    if (d > now) {
      const start = props.startsAt ? new Date(props.startsAt) : now
      return { label: "Submissions close", deadline: d, startRef: start }
    }
  }
  return null
}
```

- [ ] **Step 3: Pass submissionDeadline from manage page**

In `app/(public)/e/[slug]/manage/page.tsx`, add to data fetching:

```typescript
import { getSubmissionDeadline } from "@/lib/services/schedule-items"

// In the page's parallel data fetching:
const submissionDeadline = await getSubmissionDeadline(hackathon.id)
```

Pass it to the component:
```tsx
<TimeRemainingBar
  status={hackathon.status}
  registrationOpensAt={hackathon.registration_opens_at}
  registrationClosesAt={hackathon.registration_closes_at}
  startsAt={hackathon.starts_at}
  endsAt={hackathon.ends_at}
  submissionDeadline={submissionDeadline}
/>
```

- [ ] **Step 4: Run build**

Run: `bun run build`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add components/hackathon/time-remaining-bar.tsx app/(public)/e/[slug]/manage/page.tsx
git commit -m "feat: time remaining bar respects submission deadline trigger"
```

---

## Task 15: Run Full CI Checks

**Files:** None (verification only)

- [ ] **Step 1: Lint**

Run: `bun lint`
Expected: No errors.

- [ ] **Step 2: Build**

Run: `bun run build`
Expected: Clean build, no type errors.

- [ ] **Step 3: Unit + integration tests**

Run: `bun test:all`
Expected: All tests pass.

- [ ] **Step 4: CLI build**

Run: `bun cli:build`
Expected: Produces `packages/cli/dist/cli.mjs` without errors.

- [ ] **Step 5: Fix any failures and commit**

```bash
git add -A
git commit -m "fix: resolve CI issues from event creation simplification"
```
