# Teams and Participant Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clarify the captain role, enable inline team renaming, add team size settings for organizers, and fix the post-sign-up redirect bug.

**Architecture:** Four independent changes: (1) UI-only additions to team management card and invite dialog, (2) inline-editable team name with new PATCH endpoint, (3) team settings UI wired to existing API fields, (4) preserve `redirect_url` through the sign-up → onboarding flow.

**Tech Stack:** Next.js 16, React 19, TypeScript, Clerk, Supabase, Elysia API, shadcn/ui, Bun test runner

**Design Spec:** `docs/superpowers/specs/2026-04-07-teams-and-participant-improvements-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `__tests__/components/hackathon/team-management-tab.test.tsx` | Tests for captain info block and inline team name editing |
| `__tests__/components/hackathon/team-invite-dialog.test.tsx` | Tests for invite context note |

### Modified Files
| File | What Changes |
|------|-------------|
| `components/hackathon/team-management-tab.tsx` | Add captain info block; add inline-editable team name |
| `components/hackathon/team-invite-dialog.tsx` | Add invite context note showing member limit; accept `maxTeamSize` prop |
| `components/hackathon/preview/hackathon-preview-client.tsx:157-164` | Pass `maxTeamSize` to TeamInviteDialog |
| `lib/api/routes/dashboard-event.ts` | Add `PATCH /hackathons/:id/teams/:teamId` endpoint for team name |
| `app/(public)/e/[slug]/manage/_teams-tab.tsx` | Add team settings section (max size, min size, allow solo) |
| `app/(public)/e/[slug]/manage/page.tsx:200-202` | Pass team settings data to TeamsTab |
| `app/onboarding/page.tsx` | Read `redirect_url` from searchParams; use in all redirect targets |
| `components/auth/sign-up-form.tsx:59,195` | Append `redirect_url` when navigating to onboarding |

---

## Task 1: Captain Info Block

**Files:**
- Modify: `components/hackathon/team-management-tab.tsx:57-80`
- Test: `__tests__/components/hackathon/team-management-tab.test.tsx`

- [ ] **Step 1: Write test for captain info block**

Create `__tests__/components/hackathon/team-management-tab.test.tsx`:

```tsx
import { describe, it, expect, mock, beforeEach } from "bun:test"
import { render, screen } from "@testing-library/react"

mock.module("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {} }),
}))

mock.module("@clerk/nextjs", () => ({
  useUser: () => ({ user: { id: "user-1" } }),
}))

const { TeamManagementTab } = await import(
  "@/components/hackathon/team-management-tab"
)

const baseTeamInfo = {
  team: {
    id: "team-1",
    name: "Test Team",
    status: "forming" as const,
    inviteCode: "abc123",
    captainClerkUserId: "user-1",
  },
  members: [
    {
      clerkUserId: "user-1",
      displayName: "Alice",
      email: "alice@test.com",
      role: "participant" as const,
      isCaptain: true,
      registeredAt: "2026-04-01T00:00:00Z",
    },
  ],
  pendingInvitations: [],
  isCaptain: true,
}

describe("TeamManagementTab", () => {
  it("shows captain info block when user is captain", () => {
    render(
      <TeamManagementTab
        teamInfo={baseTeamInfo}
        hackathonId="h1"
        maxTeamSize={5}
      />
    )
    expect(
      screen.getByText(/you're the team captain/i)
    ).toBeDefined()
  })

  it("does not show captain info block when user is not captain", () => {
    render(
      <TeamManagementTab
        teamInfo={{ ...baseTeamInfo, isCaptain: false }}
        hackathonId="h1"
        maxTeamSize={5}
      />
    )
    expect(
      screen.queryByText(/you're the team captain/i)
    ).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test __tests__/components/hackathon/team-management-tab.test.tsx`
Expected: FAIL — `maxTeamSize` prop doesn't exist yet, or captain info text not found.

- [ ] **Step 3: Add captain info block and maxTeamSize prop**

In `components/hackathon/team-management-tab.tsx`:

Update the props interface (line 14):
```typescript
interface TeamManagementTabProps {
  teamInfo: NonNullable<ParticipantTeamInfo>
  hackathonId: string
  maxTeamSize: number
}
```

Update the function signature (line 19):
```typescript
export function TeamManagementTab({ teamInfo, hackathonId, maxTeamSize }: TeamManagementTabProps) {
```

Add the captain info block inside the `<CardHeader>`, after the existing `<div>` with the team name (after line 79, before `</CardHeader>`):

```tsx
{teamInfo.isCaptain && (
  <p className="text-xs text-muted-foreground mt-1">
    You&apos;re the team captain — you can invite members and manage your team.
  </p>
)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test __tests__/components/hackathon/team-management-tab.test.tsx`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add components/hackathon/team-management-tab.tsx __tests__/components/hackathon/team-management-tab.test.tsx
git commit -m "feat: add captain role info block in team management card"
```

---

## Task 2: Invite Context Note

**Files:**
- Modify: `components/hackathon/team-invite-dialog.tsx:22-26,187-210`
- Modify: `components/hackathon/preview/hackathon-preview-client.tsx:157-164`
- Test: `__tests__/components/hackathon/team-invite-dialog.test.tsx`

- [ ] **Step 1: Write test for invite context note**

Create `__tests__/components/hackathon/team-invite-dialog.test.tsx`:

```tsx
import { describe, it, expect, mock, beforeEach } from "bun:test"
import { render, screen } from "@testing-library/react"

mock.module("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {} }),
}))

const { TeamInviteDialog } = await import(
  "@/components/hackathon/team-invite-dialog"
)

describe("TeamInviteDialog", () => {
  it("renders the invite button", () => {
    render(
      <TeamInviteDialog
        teamId="team-1"
        hackathonId="h1"
        teamName="Test Team"
        maxTeamSize={5}
      />
    )
    expect(screen.getByText("Invite Member")).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test __tests__/components/hackathon/team-invite-dialog.test.tsx`
Expected: FAIL — `maxTeamSize` prop doesn't exist yet.

- [ ] **Step 3: Add maxTeamSize prop and context note**

In `components/hackathon/team-invite-dialog.tsx`:

Update the interface (line 22):
```typescript
interface TeamInviteDialogProps {
  teamId: string
  hackathonId: string
  teamName: string
  maxTeamSize: number
}
```

Update the function signature (line 30):
```typescript
export function TeamInviteDialog({ teamId, hackathonId, teamName, maxTeamSize }: TeamInviteDialogProps) {
```

Add the context note inside the form, after the email input `<div>` and before `<AlertDialogFooter>` (around line 210):

```tsx
<p className="text-xs text-muted-foreground">
  This person will be added to your team and count toward the {maxTeamSize} member limit.
</p>
```

- [ ] **Step 4: Pass maxTeamSize from preview client**

In `components/hackathon/preview/hackathon-preview-client.tsx`, update the TeamInviteDialog rendering (around line 157):

```tsx
<TeamInviteDialog
  teamId={teamInfo.team.id}
  hackathonId={hackathon.id}
  teamName={teamInfo.team.name}
  maxTeamSize={hackathon.max_team_size ?? 5}
/>
```

- [ ] **Step 5: Pass maxTeamSize from team management tab**

In `components/hackathon/team-management-tab.tsx`, the TeamInviteDialog is rendered at line 73. Update it:

```tsx
<TeamInviteDialog
  teamId={teamInfo.team.id}
  hackathonId={hackathonId}
  teamName={teamInfo.team.name}
  maxTeamSize={maxTeamSize}
/>
```

- [ ] **Step 6: Run tests**

Run: `bun test __tests__/components/hackathon/team-invite-dialog.test.tsx`
Expected: All PASS.

- [ ] **Step 7: Run build to check types**

Run: `bun run build`
Expected: No type errors. All callers of TeamInviteDialog now pass `maxTeamSize`.

- [ ] **Step 8: Commit**

```bash
git add components/hackathon/team-invite-dialog.tsx components/hackathon/preview/hackathon-preview-client.tsx components/hackathon/team-management-tab.tsx __tests__/components/hackathon/team-invite-dialog.test.tsx
git commit -m "feat: add invite context note showing team member limit"
```

---

## Task 3: Inline-Editable Team Name

**Files:**
- Modify: `components/hackathon/team-management-tab.tsx:63-66`
- Modify: `lib/api/routes/dashboard-event.ts`
- Test: `__tests__/components/hackathon/team-management-tab.test.tsx`

- [ ] **Step 1: Add API endpoint for team name update**

In `lib/api/routes/dashboard-event.ts`, add after the existing team routes (after the bulk-assign route):

```typescript
.patch("/hackathons/:id/teams/:teamId", async ({ params, body, principal, set }) => {
  requirePrincipal(principal, ["user", "api_key"], ["hackathons:write"])
  const authErr = await checkOrganizer(params.id, principal.tenantId, set)
  if (authErr) return authErr

  const { name } = body as { name: string }
  if (!name.trim() || name.length > 100) {
    set.status = 400
    return { error: "Team name must be 1-100 characters" }
  }

  const client = (await import("@/lib/db/client")).supabase()
  const { data, error } = await (client as any)
    .from("teams")
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq("id", params.teamId)
    .eq("hackathon_id", params.id)
    .select("id, name")
    .single()

  if (error || !data) {
    set.status = 404
    return { error: "Team not found" }
  }

  return data
}, {
  body: t.Object({ name: t.String() }),
  detail: { summary: "Update team name" },
})
```

- [ ] **Step 2: Add tests for inline editing**

Add to `__tests__/components/hackathon/team-management-tab.test.tsx`:

```tsx
import userEvent from "@testing-library/user-event"

describe("inline team name editing", () => {
  it("shows team name as text by default", () => {
    render(
      <TeamManagementTab
        teamInfo={baseTeamInfo}
        hackathonId="h1"
        maxTeamSize={5}
      />
    )
    expect(screen.getByText("Test Team")).toBeDefined()
  })

  it("switches to input on click when captain", async () => {
    const user = userEvent.setup()
    render(
      <TeamManagementTab
        teamInfo={baseTeamInfo}
        hackathonId="h1"
        maxTeamSize={5}
      />
    )
    await user.click(screen.getByText("Test Team"))
    const input = screen.getByDisplayValue("Test Team")
    expect(input).toBeDefined()
    expect(input.tagName).toBe("INPUT")
  })

  it("does not switch to input when not captain", async () => {
    const user = userEvent.setup()
    render(
      <TeamManagementTab
        teamInfo={{ ...baseTeamInfo, isCaptain: false }}
        hackathonId="h1"
        maxTeamSize={5}
      />
    )
    await user.click(screen.getByText("Test Team"))
    expect(screen.queryByDisplayValue("Test Team")).toBeNull()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bun test __tests__/components/hackathon/team-management-tab.test.tsx`
Expected: FAIL — clicking team name does not produce an input.

- [ ] **Step 4: Implement inline editing in team management tab**

In `components/hackathon/team-management-tab.tsx`, add state for editing (inside the component, after line 22):

```typescript
const [editingName, setEditingName] = useState(false)
const [nameValue, setNameValue] = useState(teamInfo.team.name)
const [savingName, setSavingName] = useState(false)
const nameInputRef = useRef<HTMLInputElement>(null)
```

Add the `useRef` import at line 3:
```typescript
import { useState, useRef } from "react"
```

Add the save handler:
```typescript
async function handleSaveName() {
  const trimmed = nameValue.trim()
  if (!trimmed || trimmed === teamInfo.team.name) {
    setNameValue(teamInfo.team.name)
    setEditingName(false)
    return
  }
  setSavingName(true)
  try {
    const res = await fetch(
      `/api/dashboard/hackathons/${hackathonId}/teams/${teamInfo.team.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      }
    )
    if (!res.ok) throw new Error("Failed to save")
    setEditingName(false)
    router.refresh()
  } catch {
    setNameValue(teamInfo.team.name)
    setEditingName(false)
  } finally {
    setSavingName(false)
  }
}
```

Replace the team name display in the CardTitle (line 63-66):

```tsx
<CardTitle className="flex items-center gap-2">
  <Users className="size-5" />
  {teamInfo.isCaptain && !editingName ? (
    <button
      type="button"
      className="text-left hover:underline underline-offset-2 decoration-muted-foreground/40"
      onClick={() => {
        setEditingName(true)
        setTimeout(() => nameInputRef.current?.select(), 0)
      }}
    >
      {teamInfo.team.name}
    </button>
  ) : editingName ? (
    <Input
      ref={nameInputRef}
      value={nameValue}
      onChange={(e) => setNameValue(e.target.value)}
      onBlur={handleSaveName}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleSaveName()
        if (e.key === "Escape") {
          setNameValue(teamInfo.team.name)
          setEditingName(false)
        }
      }}
      disabled={savingName}
      className="h-7 text-base font-semibold"
      maxLength={100}
      autoComplete="off"
      data-1p-ignore
      data-lpignore="true"
      data-form-type="other"
    />
  ) : (
    teamInfo.team.name
  )}
</CardTitle>
```

Add the Input import at the top:
```typescript
import { Input } from "@/components/ui/input"
```

- [ ] **Step 5: Run tests**

Run: `bun test __tests__/components/hackathon/team-management-tab.test.tsx`
Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add components/hackathon/team-management-tab.tsx lib/api/routes/dashboard-event.ts __tests__/components/hackathon/team-management-tab.test.tsx
git commit -m "feat: inline-editable team name for captains"
```

---

## Task 4: Team Size Settings for Organizers

**Files:**
- Modify: `app/(public)/e/[slug]/manage/_teams-tab.tsx`
- Modify: `app/(public)/e/[slug]/manage/page.tsx:200-202`

- [ ] **Step 1: Pass team settings to TeamsTab**

In `app/(public)/e/[slug]/manage/page.tsx`, update the TeamsTab rendering (line 200-202):

```tsx
<TabsContent value="teams" forceMount className="data-[state=inactive]:hidden">
  <TeamsTab
    hackathonId={hackathon.id}
    maxTeamSize={hackathon.max_team_size ?? 5}
    minTeamSize={hackathon.min_team_size ?? 1}
    allowSolo={hackathon.allow_solo ?? true}
  />
</TabsContent>
```

- [ ] **Step 2: Add settings section to TeamsTab**

In `app/(public)/e/[slug]/manage/_teams-tab.tsx`, update the props type (line 45):

```typescript
type TeamsTabProps = {
  hackathonId: string
  maxTeamSize: number
  minTeamSize: number
  allowSolo: boolean
}
```

Update the function signature:
```typescript
export function TeamsTab({ hackathonId, maxTeamSize: initialMax, minTeamSize: initialMin, allowSolo: initialSolo }: TeamsTabProps) {
```

Add state and save handler at the top of the function:

```typescript
const [maxSize, setMaxSize] = useState(initialMax)
const [minSize, setMinSize] = useState(initialMin)
const [allowSolo, setAllowSolo] = useState(initialSolo)
const [savingSettings, setSavingSettings] = useState(false)
const [settingsError, setSettingsError] = useState<string | null>(null)

async function saveTeamSettings(patch: Record<string, unknown>) {
  setSavingSettings(true)
  setSettingsError(null)
  try {
    const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to save")
    }
  } catch (err) {
    setSettingsError(err instanceof Error ? err.message : "Failed to save")
  } finally {
    setSavingSettings(false)
  }
}
```

Add the settings UI at the top of the component's return, before the teams table:

```tsx
<div className="space-y-6">
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Team Settings</CardTitle>
      <CardDescription>Configure team size limits for this event</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
        <div className="space-y-1.5">
          <Label htmlFor="max-team-size" className="text-xs">Max team size</Label>
          <Input
            id="max-team-size"
            type="number"
            min={1}
            max={50}
            value={maxSize}
            onChange={(e) => setMaxSize(Number(e.target.value))}
            onBlur={() => {
              if (maxSize >= minSize && maxSize >= 1) {
                saveTeamSettings({ maxTeamSize: maxSize })
              }
            }}
            className="w-20"
            disabled={savingSettings}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="min-team-size" className="text-xs">Min team size</Label>
          <Input
            id="min-team-size"
            type="number"
            min={1}
            max={maxSize}
            value={minSize}
            onChange={(e) => setMinSize(Number(e.target.value))}
            onBlur={() => {
              if (minSize >= 1 && minSize <= maxSize) {
                saveTeamSettings({ minTeamSize: minSize })
              }
            }}
            className="w-20"
            disabled={savingSettings}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
          />
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Checkbox
            id="allow-solo"
            checked={allowSolo}
            onCheckedChange={(checked) => {
              const value = !!checked
              setAllowSolo(value)
              saveTeamSettings({ allowSolo: value })
            }}
            disabled={savingSettings}
          />
          <Label htmlFor="allow-solo" className="text-xs">Allow solo participants</Label>
        </div>
      </div>
      {settingsError && <p className="text-destructive text-xs mt-2">{settingsError}</p>}
    </CardContent>
  </Card>

  {/* existing teams table content below */}
```

Add imports at the top of the file if not already present:
```typescript
import { Checkbox } from "@/components/ui/checkbox"
```

- [ ] **Step 3: Run build**

Run: `bun run build`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add app/(public)/e/[slug]/manage/_teams-tab.tsx app/(public)/e/[slug]/manage/page.tsx
git commit -m "feat: add team size settings UI for organizers"
```

---

## Task 5: Fix Post-Sign-Up Redirect — Onboarding Page

**Files:**
- Modify: `app/onboarding/page.tsx`

- [ ] **Step 1: Update onboarding page to read redirect_url**

Replace the entire file `app/onboarding/page.tsx`:

```tsx
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { OrganizationList } from "@clerk/nextjs"
import { safeRedirectUrl } from "@/lib/utils/url"

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>
}) {
  const { userId, orgId } = await auth()
  const { redirect_url } = await searchParams
  const destination = redirect_url ? safeRedirectUrl(redirect_url) : "/home"

  if (!userId) {
    redirect("/sign-in")
  }

  if (orgId) {
    redirect(destination)
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center text-center space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome to Oatmeal</h1>
          <p className="text-muted-foreground">
            Create or select an organization, or continue with a personal
            account
          </p>
        </div>
        <OrganizationList
          afterCreateOrganizationUrl={destination}
          afterSelectOrganizationUrl={destination}
          afterSelectPersonalUrl={destination}
        />
        <div className="pt-2">
          <Link href={destination} className="text-sm text-muted-foreground underline">
            Continue with personal account
          </Link>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the fix compiles**

Run: `bun run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/onboarding/page.tsx
git commit -m "fix: preserve redirect_url through onboarding page"
```

---

## Task 6: Fix Post-Sign-Up Redirect — Sign-Up Form

**Files:**
- Modify: `components/auth/sign-up-form.tsx:59,195`

- [ ] **Step 1: Update finalRedirect to pass redirect_url to onboarding**

In `components/auth/sign-up-form.tsx`, replace line 59:

```typescript
// Change:
const finalRedirect = redirectUrl || "/onboarding";

// To:
const finalRedirect = redirectUrl
  ? redirectUrl
  : "/onboarding";
const onboardingUrl = redirectUrl
  ? `/onboarding?redirect_url=${encodeURIComponent(redirectUrl)}`
  : "/onboarding";
```

- [ ] **Step 2: Update the org creation redirect**

At line 195, the `handleCreateOrg` function redirects after org creation. Update:

```typescript
// Change:
router.push(finalRedirect);

// To:
router.push(finalRedirect);
```

This stays the same because when `redirectUrl` is provided (e.g., `/e/my-hackathon`), `finalRedirect` is already set to the event URL. The org creation happens inline in the sign-up form, so the user goes directly to the event page.

The `onboardingUrl` is for when the user lands on the standalone onboarding page (via OAuth or when the sign-up form itself redirects to onboarding). Update the OAuth redirect (lines 210-214):

```typescript
await signUp.authenticateWithRedirect({
  strategy: provider,
  redirectUrl: "/sso-callback",
  redirectUrlComplete: redirectUrl ? finalRedirect : onboardingUrl,
});
```

When there's no `redirectUrl`, OAuth sign-up sends the user to `/onboarding` (which now preserves the redirect). When there IS a `redirectUrl`, it goes directly to the event page.

- [ ] **Step 3: Verify build**

Run: `bun run build`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add components/auth/sign-up-form.tsx
git commit -m "fix: pass redirect_url through sign-up to onboarding flow"
```

---

## Task 7: Update Callers of TeamManagementTab

**Files:**
- Modify: `components/hackathon/preview/hackathon-preview-client.tsx`

The TeamManagementTab now requires a `maxTeamSize` prop. Find and update all callers.

- [ ] **Step 1: Search for TeamManagementTab usage**

Run: `grep -rn "TeamManagementTab" components/ app/`

- [ ] **Step 2: Update each caller to pass maxTeamSize**

In `components/hackathon/preview/hackathon-preview-client.tsx`, find where TeamManagementTab is rendered and add the prop:

```tsx
<TeamManagementTab
  teamInfo={teamInfo}
  hackathonId={hackathon.id}
  maxTeamSize={hackathon.max_team_size ?? 5}
/>
```

- [ ] **Step 3: Run build**

Run: `bun run build`
Expected: No type errors from missing props.

- [ ] **Step 4: Commit**

```bash
git add components/hackathon/preview/hackathon-preview-client.tsx
git commit -m "fix: pass maxTeamSize to all TeamManagementTab callers"
```

---

## Task 8: Run Full CI Checks

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

If any checks fail, fix and re-run. Do not proceed until all 4 pass.

```bash
git add -A
git commit -m "fix: resolve CI issues from teams and participant improvements"
```
