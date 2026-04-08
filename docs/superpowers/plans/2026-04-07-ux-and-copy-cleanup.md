# UX and Copy Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix seven UI inconsistencies: rename "Hosted by", fix Clerk ID bug, standardize edit buttons, convert all forms to auto-save, remove Rules field, make Create Event prominent, and auto-format prize currency.

**Architecture:** Mostly independent UI changes. Auto-save (Task 5-7) is the largest change, converting all edit drawer forms from manual save to immediate save-on-action. Other tasks are copy changes, styling tweaks, and a data backfill.

**Tech Stack:** Next.js 16, React 19, TypeScript, Clerk, Supabase, shadcn/ui, Bun test runner

**Design Spec:** `docs/superpowers/specs/2026-04-07-ux-and-copy-cleanup-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `scripts/backfill-tenant-names.ts` | One-time script to fix Clerk ID tenant names |
| `lib/utils/currency.ts` | Currency formatting utility for prize display values |
| `__tests__/lib/currency.test.ts` | Tests for currency formatter |

### Modified Files
| File | What Changes |
|------|-------------|
| `components/hackathon/event-hero.tsx:290,316,343,398` | "Organized by" copy; add Pencil icon to edit hovers |
| `app/(public)/e/[slug]/opengraph-image.tsx:86` | "Organized by" copy |
| `lib/services/tenants.ts:34` | Better fallback name when Clerk org name unavailable |
| `components/hackathon/edit-drawer/name-edit-form.tsx` | Convert to auto-save on blur |
| `components/hackathon/edit-drawer/about-edit-form.tsx` | Convert to auto-save on blur (debounced) |
| `components/hackathon/edit-drawer/location-edit-form.tsx` | Convert to auto-save on blur per field |
| `components/hackathon/edit-drawer/timeline-edit-form.tsx` | Convert to auto-save on date change |
| `components/hackathon/edit-drawer/prizes-edit-form.tsx` | Each action saves immediately; remove Save changes button; add currency formatting |
| `components/hackathon/edit-drawer/sponsors-edit-form.tsx` | Each action saves immediately; remove Save changes button |
| `components/hackathon/edit-drawer/judges-edit-form.tsx` | Each action saves immediately; remove Save changes button |
| `components/hackathon/preview/hackathon-preview-client.tsx:492-514` | Remove rules section rendering |
| `components/hackathon/preview/edit-context.tsx:26` | Remove "rules" from SECTION_ORDER |
| `components/hackathon/edit-drawer/hackathon-edit-drawer.tsx` | Remove rules drawer case |
| `components/app-sidebar-simple.tsx:300-325` | Move Create Event to top of Hackathons section with primary styling |

---

## Task 1: "Hosted by" → "Organized by"

**Files:**
- Modify: `components/hackathon/event-hero.tsx:398`
- Modify: `app/(public)/e/[slug]/opengraph-image.tsx:86`

- [ ] **Step 1: Update event hero**

In `components/hackathon/event-hero.tsx`, change line 398:

```tsx
// Change:
              Hosted by{" "}

// To:
              Organized by{" "}
```

- [ ] **Step 2: Update opengraph image**

In `app/(public)/e/[slug]/opengraph-image.tsx`, change line 86:

```tsx
// Change:
            Hosted by {hackathon.organizer.name}

// To:
            Organized by {hackathon.organizer.name}
```

- [ ] **Step 3: Run build**

Run: `bun run build`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add components/hackathon/event-hero.tsx app/(public)/e/[slug]/opengraph-image.tsx
git commit -m "fix: change 'Hosted by' to 'Organized by'"
```

---

## Task 2: Fix Clerk ID Org Name Bug

**Files:**
- Modify: `lib/services/tenants.ts:34,68`
- Create: `scripts/backfill-tenant-names.ts`

- [ ] **Step 1: Fix fallback name in getOrCreateTenant**

In `lib/services/tenants.ts`, change line 34:

```typescript
// Change:
      name: clerkOrgName ?? `Org ${clerkOrgId.slice(0, 8)}`,

// To:
      name: clerkOrgName ?? "Unnamed Organization",
```

- [ ] **Step 2: Fix fallback name in getOrCreatePersonalTenant**

Same file, change line 68:

```typescript
// Change:
      name: userName ?? `Personal ${clerkUserId.slice(0, 8)}`,

// To:
      name: userName ?? "Personal Account",
```

- [ ] **Step 3: Create backfill script**

Create `scripts/backfill-tenant-names.ts`:

```typescript
import { createClient } from "@supabase/supabase-js"
import { createClerkClient } from "@clerk/backend"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const clerkSecretKey = process.env.CLERK_SECRET_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const clerk = createClerkClient({ secretKey: clerkSecretKey })

async function backfillTenantNames() {
  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("id, name, clerk_org_id, clerk_user_id")
    .or("name.like.Org org_%,name.like.Personal user_%")

  if (error || !tenants) {
    console.error("Failed to fetch tenants:", error)
    process.exit(1)
  }

  console.log(`Found ${tenants.length} tenants with fallback names`)

  let updated = 0
  let failed = 0

  for (const tenant of tenants) {
    try {
      let resolvedName: string | null = null

      if (tenant.clerk_org_id) {
        const org = await clerk.organizations.getOrganization({
          organizationId: tenant.clerk_org_id,
        })
        resolvedName = org.name
      } else if (tenant.clerk_user_id) {
        const user = await clerk.users.getUser(tenant.clerk_user_id)
        resolvedName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.emailAddresses[0]?.emailAddress || null
      }

      if (resolvedName && resolvedName !== tenant.name) {
        const { error: updateErr } = await supabase
          .from("tenants")
          .update({ name: resolvedName, updated_at: new Date().toISOString() })
          .eq("id", tenant.id)

        if (updateErr) {
          console.error(`Failed to update tenant ${tenant.id}:`, updateErr)
          failed++
        } else {
          console.log(`Updated: "${tenant.name}" → "${resolvedName}"`)
          updated++
        }
      }
    } catch (err) {
      console.error(`Failed to resolve name for tenant ${tenant.id}:`, err)
      failed++
    }
  }

  console.log(`Done. Updated: ${updated}, Failed: ${failed}, Skipped: ${tenants.length - updated - failed}`)
}

backfillTenantNames()
```

- [ ] **Step 4: Run build**

Run: `bun run build`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add lib/services/tenants.ts scripts/backfill-tenant-names.ts
git commit -m "fix: improve tenant name fallback and add backfill script"
```

---

## Task 3: Standardize Edit Buttons

**Files:**
- Modify: `components/hackathon/event-hero.tsx:289-291,315-317,342-344`

- [ ] **Step 1: Add Pencil import**

In `components/hackathon/event-hero.tsx`, check if `Pencil` is already imported from lucide-react. If not, add it to the import statement.

- [ ] **Step 2: Update name section edit hover**

Find the edit text around lines 289-291. Change from text-only to icon+text:

```tsx
// Change:
<span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-end mb-2">
  Edit
</span>

// To:
<span className="flex items-center gap-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-end mb-2">
  <Pencil className="size-3" />
  Edit
</span>
```

- [ ] **Step 3: Update dates section edit hover**

Find the edit text around lines 315-317. Apply the same pattern:

```tsx
<span className="flex items-center gap-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
  <Pencil className="size-3" />
  Edit
</span>
```

- [ ] **Step 4: Update location section edit hover**

Find the edit text around lines 342-344. Apply the same pattern:

```tsx
<span className="flex items-center gap-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
  <Pencil className="size-3" />
  Edit
</span>
```

- [ ] **Step 5: Run build**

Run: `bun run build`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add components/hackathon/event-hero.tsx
git commit -m "fix: standardize edit buttons with pencil icon + text"
```

---

## Task 4: Remove Rules Field

**Files:**
- Modify: `components/hackathon/preview/edit-context.tsx:26`
- Modify: `components/hackathon/edit-drawer/hackathon-edit-drawer.tsx`
- Modify: `components/hackathon/preview/hackathon-preview-client.tsx:492-514`

- [ ] **Step 1: Remove "rules" from SECTION_ORDER**

In `components/hackathon/preview/edit-context.tsx`, remove `"rules"` from the SECTION_ORDER array (line 26):

```typescript
// Change:
export const SECTION_ORDER: Exclude<EditSection, null>[] = [
  "name",
  "dates",
  "location",
  "sponsors",
  "judges",
  "prizes",
  "timeline",
  "about",
  "rules",
]

// To:
export const SECTION_ORDER: Exclude<EditSection, null>[] = [
  "name",
  "dates",
  "location",
  "sponsors",
  "judges",
  "prizes",
  "timeline",
  "about",
]
```

Also remove `"rules"` from the `EditSection` type if it's defined as a union in this file.

- [ ] **Step 2: Remove rules case from edit drawer**

In `components/hackathon/edit-drawer/hackathon-edit-drawer.tsx`, remove the rules conditional rendering:

```tsx
// DELETE this block:
{activeSection === "rules" && <RulesEditForm ... />}
```

Remove the `RulesEditForm` import as well.

- [ ] **Step 3: Remove rules section from preview client**

In `components/hackathon/preview/hackathon-preview-client.tsx`, remove lines 492-514 (the entire rules rendering block — both the edit form case and the display case).

- [ ] **Step 4: Run build to find any remaining references**

Run: `bun run build`
Expected: May show errors if other files reference the "rules" section. Fix any that appear.

- [ ] **Step 5: Commit**

```bash
git add components/hackathon/preview/edit-context.tsx components/hackathon/edit-drawer/hackathon-edit-drawer.tsx components/hackathon/preview/hackathon-preview-client.tsx
git commit -m "feat: remove Rules field from organizer UI"
```

---

## Task 5: Auto-Save Simple Forms

**Files:**
- Modify: `components/hackathon/edit-drawer/name-edit-form.tsx`
- Modify: `components/hackathon/edit-drawer/about-edit-form.tsx`
- Modify: `components/hackathon/edit-drawer/location-edit-form.tsx`
- Modify: `components/hackathon/edit-drawer/timeline-edit-form.tsx`

All four simple forms follow the same conversion pattern: remove the Save/Cancel/Reset buttons, save automatically on blur (or on date change for timeline).

- [ ] **Step 1: Convert name-edit-form to auto-save**

In `components/hackathon/edit-drawer/name-edit-form.tsx`:

Replace the `handleSubmit` function with an auto-save on blur:

```typescript
async function handleBlurSave() {
  if (!isDirty || !name.trim()) return
  await save()
}
```

Update the Input to call `handleBlurSave` on blur:

```tsx
<Input
  // ... existing props
  onBlur={handleBlurSave}
/>
```

Remove the entire button section (the `<div className="space-y-3">` block containing Save, Cancel, Reset buttons and keyboard hints). Keep only the `FieldGroup` with the input.

Update keyboard handler: keep `Cmd+Enter` for save & next, keep `Esc` to reset. Remove Enter-to-save (since Enter should be default input behavior).

```typescript
function handleKeyDown(e: React.KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !saving) {
    e.preventDefault()
    if (!isDirty) {
      if (onSaveAndNext) { onSaveAndNext() } else { closeDrawer() }
      return
    }
    save().then(ok => {
      if (ok) { if (onSaveAndNext) { onSaveAndNext() } else { closeDrawer() } }
    })
  }
  if (e.key === "Escape" && isDirty) {
    e.preventDefault()
    handleReset()
  }
}
```

Add a subtle "Saved" indicator that appears briefly after successful save:

```tsx
const [showSaved, setShowSaved] = useState(false)

// In the save function, after success:
setShowSaved(true)
setTimeout(() => setShowSaved(false), 2000)

// In JSX, after the FieldGroup:
{showSaved && (
  <p className="text-xs text-muted-foreground animate-in fade-in">Saved</p>
)}
```

- [ ] **Step 2: Convert about-edit-form to auto-save**

Same pattern as name-edit-form, but use a debounced save since the textarea can receive rapid input:

```typescript
const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

function handleChange(value: string) {
  setDescription(value)
  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
  saveTimeoutRef.current = setTimeout(() => {
    if (value !== initialData.description) {
      save()
    }
  }, 1500)
}
```

Remove Save/Cancel/Reset buttons. Keep `Cmd+Enter` and `Esc` keyboard shortcuts.

- [ ] **Step 3: Convert location-edit-form to auto-save**

Same pattern — each field saves on blur. Remove Save/Cancel/Reset buttons. The location form has multiple fields (type, name, URL, coordinates), so each field gets its own `onBlur={handleBlurSave}`.

- [ ] **Step 4: Convert timeline-edit-form to auto-save**

The DateTimeRangePicker already has an `onChange` handler. Save on change instead of blur (date pickers don't have a clear "blur" moment):

```typescript
function handleDateChange(range: DateTimeRange) {
  setHackathonRange(range)
  // Auto-save after date change
  const dateError = validateTimelineDates({
    startsAt: range.from,
    endsAt: range.to,
  })
  if (!dateError && (range.from || range.to)) {
    setSaving(true)
    // ... save logic
  }
}
```

Remove Save/Cancel/Reset buttons.

- [ ] **Step 5: Run build**

Run: `bun run build`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add components/hackathon/edit-drawer/name-edit-form.tsx components/hackathon/edit-drawer/about-edit-form.tsx components/hackathon/edit-drawer/location-edit-form.tsx components/hackathon/edit-drawer/timeline-edit-form.tsx
git commit -m "feat: convert simple edit forms to auto-save"
```

---

## Task 6: Auto-Save Complex Forms — Prizes

**Files:**
- Modify: `components/hackathon/edit-drawer/prizes-edit-form.tsx`
- Create: `lib/utils/currency.ts`
- Test: `__tests__/lib/currency.test.ts`

This is the most complex auto-save conversion. Each action (add, delete, field edit) must save immediately. The pending changes UI and "Save changes" button are removed.

- [ ] **Step 1: Write currency formatting tests**

Create `__tests__/lib/currency.test.ts`:

```typescript
import { describe, it, expect } from "bun:test"
import { formatCurrency } from "@/lib/utils/currency"

describe("formatCurrency", () => {
  it("formats a plain number", () => {
    expect(formatCurrency("5000")).toBe("$5,000")
  })

  it("formats a number with decimals", () => {
    expect(formatCurrency("5000.50")).toBe("$5,000.50")
  })

  it("strips existing $ before formatting", () => {
    expect(formatCurrency("$5000")).toBe("$5,000")
  })

  it("strips existing commas before formatting", () => {
    expect(formatCurrency("5,000")).toBe("$5,000")
  })

  it("returns non-numeric input unchanged", () => {
    expect(formatCurrency("First place trophy")).toBe("First place trophy")
  })

  it("returns empty string unchanged", () => {
    expect(formatCurrency("")).toBe("")
  })

  it("handles zero", () => {
    expect(formatCurrency("0")).toBe("$0")
  })

  it("handles decimals with trailing zeros", () => {
    expect(formatCurrency("1000.00")).toBe("$1,000")
  })

  it("handles value with currency code", () => {
    expect(formatCurrency("5000 USD")).toBe("5000 USD")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test __tests__/lib/currency.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create currency formatting utility**

Create `lib/utils/currency.ts`:

```typescript
export function formatCurrency(value: string): string {
  if (!value) return value

  const stripped = value.replace(/[$,]/g, "").trim()

  const num = Number(stripped)
  if (isNaN(num) || stripped !== String(num).replace(/\.?0+$/, "") && stripped !== String(num)) {
    return value
  }

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)

  return formatted
}
```

- [ ] **Step 4: Run tests**

Run: `bun test __tests__/lib/currency.test.ts`
Expected: All PASS. Adjust implementation if any edge cases fail.

- [ ] **Step 5: Convert prizes form to immediate save**

In `components/hackathon/edit-drawer/prizes-edit-form.tsx`:

The current pattern stages changes locally and commits them all on "Save changes" click. Convert to:

**Add prize:** Call the create API immediately when "Add Prize" is clicked. On success, add to local state. On failure, show error.

**Delete prize:** Call the delete API immediately. Optimistically remove from local state. Revert on failure.

**Field edit:** On blur, call the update API for that specific prize. Show brief "Saved" indicator.

Remove the pending changes tracking section (lines 825-854) and the Save changes / Discard buttons (lines 856-880).

**Add currency formatting to display_value input:** Add an `onBlur` handler:

```tsx
import { formatCurrency } from "@/lib/utils/currency"

// On the display_value Input (around line 693):
<Input
  value={prize.display_value ?? ""}
  onChange={(e) => handleFieldChange(prize.id, "display_value", e.target.value)}
  onBlur={(e) => {
    const formatted = formatCurrency(e.target.value)
    if (formatted !== e.target.value) {
      handleFieldChange(prize.id, "display_value", formatted)
    }
    handleSavePrize(prize.id)
  }}
  placeholder='e.g. 5000'
  // ... rest of props
/>
```

- [ ] **Step 6: Run build**

Run: `bun run build`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add lib/utils/currency.ts __tests__/lib/currency.test.ts components/hackathon/edit-drawer/prizes-edit-form.tsx
git commit -m "feat: auto-save prizes with currency formatting"
```

---

## Task 7: Auto-Save Complex Forms — Sponsors and Judges

**Files:**
- Modify: `components/hackathon/edit-drawer/sponsors-edit-form.tsx`
- Modify: `components/hackathon/edit-drawer/judges-edit-form.tsx`

Same conversion pattern as prizes: each action saves immediately, remove Save changes / Discard / Done buttons.

- [ ] **Step 1: Convert sponsors form**

In `components/hackathon/edit-drawer/sponsors-edit-form.tsx`:

**Add sponsor:** Call create API immediately on add.
**Delete sponsor:** Call delete API immediately, optimistic removal.
**Field edit:** Save on blur per field.

Remove the Save changes button area (lines 1295-1320). Remove pending changes tracking.

- [ ] **Step 2: Convert judges form**

In `components/hackathon/edit-drawer/judges-edit-form.tsx`:

**Add judge:** Call invite API immediately on add.
**Remove judge:** Call remove API immediately, optimistic removal.
**Field edit:** Save on blur per field.

Remove the Save changes button area (lines 682-700). Remove pending changes tracking.

- [ ] **Step 3: Run build**

Run: `bun run build`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add components/hackathon/edit-drawer/sponsors-edit-form.tsx components/hackathon/edit-drawer/judges-edit-form.tsx
git commit -m "feat: auto-save sponsors and judges forms"
```

---

## Task 8: Prominent Create Event Button

**Files:**
- Modify: `components/app-sidebar-simple.tsx:300-325`

- [ ] **Step 1: Move Create Event to top of Hackathons section with primary styling**

In `components/app-sidebar-simple.tsx`, find the Hackathons section (around line 300). Move the `CreateHackathonMenu` `SidebarMenuItem` from the bottom of the list to the top, before the `hackathonItems.map()`, and apply primary styling:

```tsx
<SidebarGroupLabel>Hackathons</SidebarGroupLabel>
<SidebarGroupContent>
  <SidebarMenu>
    <SidebarMenuItem>
      <CreateHackathonMenu
        trigger={
          <SidebarMenuButton className="h-10 bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground">
            <Plus />
            <span className="text-sm">Create Event</span>
          </SidebarMenuButton>
        }
      />
    </SidebarMenuItem>
    {hackathonItems.map((item) => (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton asChild isActive={isActive(item)} className="h-10">
          <Link href={item.href}>
            <item.icon />
            <span className="text-sm">{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ))}
  </SidebarMenu>
</SidebarGroupContent>
```

- [ ] **Step 2: Run build**

Run: `bun run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/app-sidebar-simple.tsx
git commit -m "feat: make Create Event button prominent in sidebar"
```

---

## Task 9: Run Full CI Checks

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

If any checks fail, fix and re-run.

```bash
git add -A
git commit -m "fix: resolve CI issues from UX and copy cleanup"
```
