# Design: UX and Copy Cleanup

**Date:** 2026-04-07
**Status:** Draft
**Pitch:** [Notion Pitch](https://www.notion.so/33bffe5c4f748127b3c7f1df6e69d9c7)
**Appetite:** 1-2 weeks (small batch)

## Problem

Seven UI inconsistencies and bugs that erode trust and create friction for organizers:

1. "Hosted by" should say "Organized by"
2. Some organizer names display a Clerk ID fallback instead of the real org name
3. Edit buttons are inconsistent — sometimes an icon, sometimes text, sometimes both
4. Forms require manual "Save" / "Save changes" clicks instead of saving automatically
5. The "Rules" field is unnecessary
6. The Create Event button in the sidebar is not prominent enough
7. The prize Display Value field doesn't format as currency

## Solution

### Change 1: "Hosted by" → "Organized by"

Copy change in two files:
- `components/hackathon/event-hero.tsx:398` — "Hosted by" → "Organized by"
- `app/(public)/e/[slug]/opengraph-image.tsx:86` — same

### Change 2: Fix Clerk ID Org Name Bug

**Root cause:** When `getOrCreateTenant()` in `lib/services/tenants.ts:34` creates a tenant without a Clerk org name, it falls back to `"Org org_2abc..."`. This happens when the name isn't resolved from Clerk during provisioning.

**Fix:**
1. In `getOrCreateTenant()`, always attempt to fetch the org name from Clerk before inserting. If the Clerk API call fails, use a better fallback (e.g., "Unnamed Organization") rather than exposing the Clerk ID.
2. Backfill: write a one-time script that scans tenants with names matching the `"Org org_"` pattern, resolves their real names from Clerk, and updates the records.

**Files affected:**
- `lib/services/tenants.ts:34` — improve fallback name
- New script: `scripts/backfill-tenant-names.ts` — one-time backfill

### Change 3: Standardize Edit Buttons

Two patterns, applied by context:

| Context | Pattern | Example |
|---------|---------|---------|
| List items (schedule, announcements, rooms) | **Icon only** (pencil) | Already correct — no changes |
| Section-level editing (event hero name, dates, location) | **Pencil icon + "Edit" text** | Currently text-only — add pencil icon |

**Files affected:**
- `components/hackathon/event-hero.tsx:290,316,343` — add `Pencil` icon next to "Edit" text on hover states

### Change 4: Auto-Save All Forms

Remove all manual "Save" / "Save changes" buttons. All forms save automatically:

**Simple forms (single-field editors) — save on blur/change:**
- `components/hackathon/edit-drawer/name-edit-form.tsx` — save on blur
- `components/hackathon/edit-drawer/about-edit-form.tsx` — save on blur (debounced for textarea)
- `components/hackathon/edit-drawer/location-edit-form.tsx` — save on blur per field
- `components/hackathon/edit-drawer/timeline-edit-form.tsx` — save on date change

**Complex forms (multi-item editors) — each action saves immediately:**
- `components/hackathon/edit-drawer/prizes-edit-form.tsx` — add saves immediately, delete saves immediately, field edits save on blur. Remove "Save changes" button.
- `components/hackathon/edit-drawer/sponsors-edit-form.tsx` — same pattern
- `components/hackathon/edit-drawer/judges-edit-form.tsx` — same pattern

**Behavior:**
- Show a brief "Saved" indicator (toast or inline) after each successful save
- Show error inline if save fails — do not lose the user's input
- No loading spinners on the entire form — subtle per-field saving indicators only
- Optimistic updates: UI reflects the change immediately, reverts on failure

### Change 5: Remove Rules Field

Hide the Rules field from the UI entirely. Keep the database column for existing data.

**Files affected:**
- `components/hackathon/edit-drawer/rules-edit-form.tsx` — delete file (or stop rendering it)
- `components/hackathon/preview/hackathon-preview-client.tsx:492-512` — remove rules section rendering
- `components/hackathon/preview/edit-context.tsx:26` — remove "rules" from SECTION_ORDER
- `components/hackathon/edit-drawer/hackathon-edit-drawer.tsx` — remove rules drawer case
- `lib/api/routes/dashboard.ts:1300` — keep `rules` in API schema for backwards compatibility (CLI may use it)

### Change 6: Prominent Create Event Button

Move the Create Event button to the top of the "Hackathons" section in the sidebar and give it the primary color.

**Current:** Standard sidebar menu button with `Plus` icon, blends in with other items.
**New:** Primary-colored button pinned at the top of the Hackathons section, visually distinct.

**Files affected:**
- `components/app-sidebar-simple.tsx:314-318` — move button position, apply primary styling
- `components/mobile-header.tsx:319` — match styling for mobile

### Change 7: Prize Display Value Currency Formatting

Auto-format the Display Value field on blur. When the organizer types `5000`, the field formats to `$5,000` when they click away.

**Behavior:**
- On blur: parse the input as a number, format with `$` prefix and thousands separators
- If the input already has a `$`, strip it before parsing to avoid double-formatting
- If the input is not a valid number (e.g., "First place trophy"), leave it as-is (display_value is a text field, not all prizes are monetary)
- Non-numeric values are preserved without formatting

**Files affected:**
- `components/hackathon/edit-drawer/prizes-edit-form.tsx` — add `formatCurrencyOnBlur` handler to display_value input

## Decisions Made

| Decision | Choice | Alternatives Considered |
|----------|--------|------------------------|
| Edit button pattern | Icon-only for lists, icon+text for sections | All icon-only; all text-only |
| Auto-save scope | All forms including complex multi-item editors | Simple forms only; debounced auto-save |
| Complex form save behavior | Each action (add/delete/edit) saves immediately | Debounced batch save; keep manual save for complex forms |
| Rules field removal | Hide from UI, keep DB column | Delete DB column via migration; deprecation warning |
| Create Event button | Primary color, top of Hackathons section | Larger size; floating button; separate CTA area |
| Currency formatting | Auto-format on blur | Live formatting as you type; numeric input + currency dropdown |
| Clerk ID fallback | Resolve name from Clerk, better fallback text | Keep current fallback; require name at creation |

## Scope Boundaries

### In Scope
- "Hosted by" → "Organized by" copy change
- Fix Clerk ID fallback in tenant name provisioning + backfill script
- Standardize edit buttons (add pencil icon to event hero hover states)
- Convert all forms to auto-save (remove Save/Save Changes buttons)
- Remove Rules field from UI
- Restyle and reposition Create Event sidebar button
- Auto-format prize Display Value as currency on blur
- Tests for all changed components

### Out of Scope
- Removing `rules` database column (backwards compatibility)
- Internationalization of currency formatting (USD only for now)
- Undo/redo for auto-saved changes
- Sidebar redesign beyond the Create Event button
- Changing the edit drawer interaction model (click-to-open stays)

## Success Criteria

- Event pages show "Organized by [Real Org Name]" — never a Clerk ID
- All edit buttons follow the two standardized patterns
- No form has a manual Save or Save Changes button — all saves happen automatically
- Rules field is gone from the organizer UI
- Create Event button is visually prominent in the sidebar
- Typing "5000" in prize Display Value shows "$5,000" after blur
