# Design: Teams and Participant Improvements

**Date:** 2026-04-07
**Status:** Draft
**Pitch:** [Notion Pitch](https://www.notion.so/33bffe5c4f748159af8ec7df81a5b7b4)
**Appetite:** 1-2 weeks (small batch)

## Problem

Participants face friction and confusion in three areas of the team experience:

1. **Captain role is unexplained.** Users become team captain automatically during registration with no explanation of what that means. Non-captains see "Only the team captain can invite new members" but captains themselves get no guidance.
2. **Team names can't be edited.** Teams get an auto-generated name ("{DisplayName}'s Team") during registration. There's no way to change it afterward, even though the database supports custom names.
3. **Team size limit is invisible to organizers.** The `max_team_size` field defaults to 5 and is only settable via the API or CLI. Organizers have no UI to configure it.
4. **Post-sign-up redirect is broken.** When an unauthenticated user clicks "Register" on an event page, they're sent to sign-in with a `redirect_url`. After signing up and going through onboarding (org creation), the `redirect_url` is lost and they land on `/home` instead of the event page.

## Solution

### Change 1: Captain Role Explanation + Invite Confirmation

**Info block in team management card:**

Add a brief info block inside the team card (`components/hackathon/team-management-tab.tsx`), visible only to the captain, in the card header area below the team name:

> "You're the team captain — you can invite members and manage your team."

Uses muted styling (`text-muted-foreground`, small text) so it's informative without being heavy.

**Confirmation context in invite dialog:**

Add a brief note in the existing invite dialog (`components/hackathon/team-invite-dialog.tsx`), below the email input field and above the action buttons:

> "This person will be added to your team and count toward the {maxTeamSize} member limit."

This provides context about the consequence of inviting without adding a separate confirmation modal. The `maxTeamSize` value is passed as a prop to the dialog.

**Files affected:**
- `components/hackathon/team-management-tab.tsx` — add captain info block
- `components/hackathon/team-invite-dialog.tsx` — add invite context note, accept `maxTeamSize` prop
- `components/hackathon/preview/hackathon-preview-client.tsx` — pass `maxTeamSize` to invite dialog

### Change 2: Editable Team Name

**Inline-editable team name** in the team management card. The captain clicks the team name → it becomes an input field → they type a new name → it saves on blur or Enter. Non-captains see the name as read-only (current behavior).

**Behavior:**
- Click team name (captain only) → switches to input with current name pre-filled
- Enter or blur → saves via API, reverts on error
- Escape → cancels edit, reverts to original name
- Empty name → rejected, reverts to original
- Optimistic update: name changes immediately, reverts on API failure

**API endpoint:**

New endpoint: `PATCH /api/dashboard/teams/:teamId` with body `{ name: string }`.
- Auth: Clerk user, must be team captain
- Validation: non-empty string, max 100 characters
- Returns updated team object

**Files affected:**
- `components/hackathon/team-management-tab.tsx` — add inline edit for captain
- `lib/api/routes/dashboard.ts` — add team PATCH endpoint
- `lib/services/teams.ts` or inline in route — update team name service function

### Change 3: Team Size Settings for Organizers

Add a "Team Settings" section in the organizer's manage page, inside the existing "Teams" tab. Three fields:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| Max team size | Number input | 5 | Maximum members per team |
| Min team size | Number input | 1 | Minimum members to submit |
| Allow solo | Checkbox | true | Whether individuals can participate without a team |

These fields already exist in the database (`hackathons.max_team_size`, `hackathons.min_team_size`, `hackathons.allow_solo`) and are accepted by the settings PATCH endpoint (`PATCH /api/dashboard/hackathons/:id/settings` with `maxTeamSize`, `minTeamSize`, `allowSolo`). This change is purely a UI addition.

**Behavior:**
- Auto-save on change (consistent with other settings in the manage page)
- Number inputs have min/max constraints: min_team_size >= 1, max_team_size >= min_team_size
- Validation: if organizer sets max below current team sizes, show a warning but allow it (existing teams are grandfathered)

**Files affected:**
- `app/(public)/e/[slug]/manage/page.tsx` — pass team settings data to Teams tab
- Teams tab component (existing or new section within it) — add settings UI
- No API changes needed — endpoint already supports these fields

### Change 4: Fix Post-Sign-Up Redirect

**Root cause:** The `redirect_url` query parameter is preserved from the registration button through sign-in and into sign-up, but is lost during the onboarding/org-creation flow. After completing onboarding, the user lands on `/home` instead of the original event page.

**Fix:** Preserve `redirect_url` through the entire auth flow:

1. **Sign-up form → onboarding:** When `SignUpForm` redirects to onboarding after account creation, append `?redirect_url={originalUrl}` to the onboarding URL.
2. **Onboarding → final destination:** After org creation completes, read `redirect_url` from the query params and redirect there instead of `/home`.
3. **OrgGateDialog:** The `OrgGateDialog` component (used in the create flow) should also preserve any pending redirect after org selection.

**Edge cases:**
- If `redirect_url` is not present, fall back to current behavior (`/home` for sign-in, `/onboarding` for sign-up)
- Validate redirect URLs with `safeRedirectUrl()` at every step to prevent open redirect attacks
- If the event page no longer exists (deleted hackathon), the user lands on a 404 — acceptable

**Specific bug locations:**
- `app/onboarding/page.tsx:14` — `redirect("/home")` when user already has an org (should use `redirect_url` if present)
- `app/onboarding/page.tsx:28-30` — Clerk `OrganizationList` hardcodes `afterCreateOrganizationUrl="/home"`, `afterSelectOrganizationUrl="/home"`, `afterSelectPersonalUrl="/home"` (should use `redirect_url` if present)
- `components/auth/sign-up-form.tsx:59` — `finalRedirect` defaults to `"/onboarding"` but doesn't append `redirect_url` as a query param for the onboarding page to read

**Files affected:**
- `components/auth/sign-up-form.tsx:59` — append `?redirect_url={originalUrl}` when redirecting to onboarding
- `app/onboarding/page.tsx` — read `redirect_url` from searchParams, use it in all redirect targets instead of `/home`
- `components/org-gate-dialog.tsx` — preserve pending redirect URL

## Decisions Made

| Decision | Choice | Alternatives Considered |
|----------|--------|------------------------|
| Captain explanation | Info block in team card, visible to captain only | Tooltip on crown icon; one-time modal after registration |
| Invite confirmation | Contextual note in existing dialog | Separate confirmation modal before sending |
| Team name editing | Inline edit in team card (click to edit) | Separate "Edit team" dialog; dedicated settings page |
| Team size UI location | Inside existing Teams tab on manage page | New "Settings" sub-tab; in the edit drawer |
| Redirect fix scope | Preserve redirect_url through onboarding flow | Store redirect in localStorage; use Clerk's built-in redirect |

## Scope Boundaries

### In Scope
- Captain info block in team management card
- Invite context note with team size in invite dialog
- Inline-editable team name for captains
- Team PATCH API endpoint for name updates
- Team size settings UI in organizer manage page
- Fix redirect_url preservation through sign-up → onboarding → event page
- Tests for all new components and API endpoints

### Out of Scope
- Captain transfer (changing who is captain) — separate feature
- Team disbanding UI — separate feature
- Drag-and-drop team member reordering
- Team avatar/logo
- Changing team size limits retroactively (enforcing on existing oversized teams)
- Custom onboarding flow for participants (vs organizers)

## Success Criteria

- Captain sees a clear explanation of their role in the team management card
- Invite dialog shows the consequence of inviting (member count toward limit)
- Captain can rename their team inline with optimistic UI
- Organizer can set max team size, min team size, and allow solo from the manage page
- User who clicks "Register" while signed out → signs up → completes onboarding → lands back on the event page (not `/home`)
