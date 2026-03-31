# Build OS26: Implementation Plan

## Context

Build OS26 is a full-day AI hackathon on **April 28, 2026**, hosted by Mila Ventures in Montreal. 60-90 curated participants across 30+ teams compete for $30K in prizes over a 5-hour build window. This is a startup competition (not a coding competition) — both technical and business founders compete. Every attendee builds. No audience.

The Oatmeal platform needs 13 features to run this event end-to-end: 8 non-negotiable for April 28, plus 5 high-value additions.

### What Exists Today

| Capability | Current State | Key Files |
|-----------|--------------|-----------|
| Teams | Participant-initiated creation, email invitations, status (forming/locked/disbanded) | `lib/services/hackathons.ts`, `lib/services/team-invitations.ts` |
| Submissions | Form with title, description, github/live/video/screenshot URLs. Status-gated (not deadline-gated) | `lib/services/submissions.ts`, `components/hackathon/submission-button.tsx` |
| Judging | Judge invitations, auto-assignment, criteria-based weighted scoring OR subjective picks. Single flat criteria set per hackathon | `lib/services/judging.ts`, `lib/services/judge-invitations.ts`, `components/hackathon/judging/` |
| Results | Calculate via RPC (weighted scores, DENSE_RANK), publish with winner emails | `lib/services/results.ts`, `lib/email/winner-notifications.ts` |
| Lifecycle | draft → published → registration_open → active → judging → completed → archived | `components/hackathon/lifecycle-stepper.tsx`, `lib/utils/timeline.ts` |
| Timer | Basic `CountdownBadge` (60s client-side interval, shows time to event start) | `components/hackathon/countdown-badge.tsx` |
| Roles | `participant`, `judge`, `mentor` (unused), `organizer` (unused) in `hackathon_participants` | `lib/db/hackathon-types.ts` |
| Email | Resend for judge invitations, team invitations, winner notifications | `lib/email/resend.ts` |
| Real-time | **None.** Everything is page-refresh based. | — |
| Manage page | 3 tabs: edit, judges, prizes. URL-synced via `?tab=` query params | `app/(public)/e/[slug]/manage/page.tsx`, `lib/utils/manage-tabs.ts` |

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | All 13 features | Full event support needed |
| Real-time | Short polling | Simpler than Supabase Realtime, no new infra, sufficient for ~100 concurrent users |
| Phases | New `phase` column on `hackathons` | Sub-state within `active`/`judging` without expanding the status enum |
| Rooms | Practical segmentation | Teams in groups, timer per room, presentation tracking, organizer overview |
| Display routes | Public by slug, no auth | `/e/[slug]/display/*` — easy to open on projector laptops |
| Challenge push | Email + in-app banner + toast | Maximum coverage across devices |
| Team management | Full organizer UI + CSV import | Support pre-event bulk setup + day-of reshuffling |
| Judging model | Rounds + prize-linked criteria | Different rubrics per category, multi-stage flow (preliminaries → finals) |
| Categories | Organizer-defined, linked to prizes | Generic enough for any event format |
| Social media | URL submission + OG metadata | Realistic v1 — no platform API integrations |
| Mentors | Simple flag + queue | No expertise matching or quiet-team detection |
| Post-event | Winner pages + sponsor report | Skip Slack provisioning and participant directory |
| Reveal | Single "publish results" action | Reuse existing mechanism |
| Live dashboard | Separate fullscreen page | Optimized for MC podium, no nav chrome |
| PR strategy | ~5 feature-group PRs | Reviewable chunks with clear dependencies |

---

## Database Schema Changes

### Migration 1: `20260401000001_hackathon_phases.sql`

```sql
-- New enum for hackathon sub-phases
CREATE TYPE hackathon_phase AS ENUM (
  'build',
  'submission_open',
  'preliminaries',
  'finals',
  'results_pending'
);

-- Add phase and challenge columns to hackathons
ALTER TABLE hackathons
  ADD COLUMN phase hackathon_phase,
  ADD COLUMN challenge_title text,
  ADD COLUMN challenge_body text,
  ADD COLUMN challenge_released_at timestamptz;

-- phase is nullable: null means legacy hackathon without phases
-- Phase mapping:
--   active status -> build, submission_open
--   judging status -> preliminaries, finals, results_pending
```

**Edge cases:**
- `phase` is nullable — existing hackathons without phases continue to work unchanged
- Phase must be consistent with status: setting `phase = 'build'` when status is `judging` must be rejected
- When status transitions (e.g., `active` → `judging`), `phase` should auto-set to the first phase of the new status (`preliminaries`)
- When status transitions backward (e.g., `judging` → `active`), `phase` should reset to null or the first phase

### Migration 2: `20260401000002_rooms.sql`

```sql
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  timer_ends_at timestamptz,
  timer_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rooms_hackathon ON rooms(hackathon_id);
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to rooms" ON rooms FOR ALL USING (false);

CREATE TABLE IF NOT EXISTS room_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  has_presented boolean NOT NULL DEFAULT false,
  present_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, team_id)
);

CREATE INDEX idx_room_teams_room ON room_teams(room_id);
CREATE INDEX idx_room_teams_team ON room_teams(team_id);
ALTER TABLE room_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to room_teams" ON room_teams FOR ALL USING (false);
```

**Edge cases:**
- A team can only be in one room at a time. The UNIQUE constraint on `(room_id, team_id)` prevents duplicates within a room, but we also need an application-level check to prevent a team from being in multiple rooms. Add a unique index: `CREATE UNIQUE INDEX idx_room_teams_unique_team ON room_teams(team_id)` — or handle at service layer.
- Deleting a room cascades to `room_teams`, freeing those teams for reassignment
- `present_order` can be null (unordered) or set by organizer for explicit ordering
- `timer_ends_at` in the past means timer expired; null means no active timer

### Migration 3: `20260401000003_submission_categories.sql`

```sql
CREATE TABLE IF NOT EXISTS submission_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  prize_id uuid REFERENCES prizes(id) ON DELETE SET NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_submission_categories_hackathon ON submission_categories(hackathon_id);
ALTER TABLE submission_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to submission_categories" ON submission_categories FOR ALL USING (false);

CREATE TABLE IF NOT EXISTS submission_category_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES submission_categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(submission_id, category_id)
);

CREATE INDEX idx_sce_submission ON submission_category_entries(submission_id);
CREATE INDEX idx_sce_category ON submission_category_entries(category_id);
ALTER TABLE submission_category_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to submission_category_entries" ON submission_category_entries FOR ALL USING (false);
```

**Edge cases:**
- A submission can be in multiple categories (e.g., "Best Technical Build" AND "Best Business Application")
- Deleting a category cascades to entries, not to submissions — submissions remain, they just lose that category tag
- `prize_id` is nullable and SET NULL on delete — a category can exist without a linked prize
- Categories with no submissions should still appear in the organizer UI
- Submission with zero categories selected is valid (some hackathons may not use categories)

### Migration 4: `20260401000004_judging_rounds.sql`

```sql
CREATE TABLE IF NOT EXISTS judging_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  name text NOT NULL,
  round_type text NOT NULL DEFAULT 'preliminary',
  is_active boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_judging_rounds_hackathon ON judging_rounds(hackathon_id);
ALTER TABLE judging_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to judging_rounds" ON judging_rounds FOR ALL USING (false);

-- Scope criteria to rounds and categories
ALTER TABLE judging_criteria
  ADD COLUMN round_id uuid REFERENCES judging_rounds(id) ON DELETE SET NULL,
  ADD COLUMN category_id uuid REFERENCES submission_categories(id) ON DELETE SET NULL;

-- Scope assignments to rounds and rooms
ALTER TABLE judge_assignments
  ADD COLUMN round_id uuid REFERENCES judging_rounds(id) ON DELETE SET NULL,
  ADD COLUMN room_id uuid REFERENCES rooms(id) ON DELETE SET NULL;

-- Scope results to rounds
ALTER TABLE hackathon_results
  ADD COLUMN round_id uuid REFERENCES judging_rounds(id) ON DELETE SET NULL;
```

**Edge cases:**
- Only one round should be `is_active = true` at a time per hackathon. Enforce at service layer: activating a round deactivates all others.
- `round_id = NULL` on criteria/assignments means "global" — backward compatible with hackathons that don't use rounds
- `category_id` on criteria allows different rubrics per category. When `category_id IS NOT NULL`, the criteria only applies to submissions in that category.
- Judges scoring a submission see only criteria matching: (a) the active round, AND (b) the submission's categories (or global criteria with `category_id IS NULL`)
- Deleting a round SET NULLs the FK on criteria/assignments/results — they become "unscoped" rather than deleted
- `round_type` is `text` not an enum for flexibility, but validated at service layer: `preliminary` or `finals`

### Migration 5: `20260401000005_social_media_submissions.sql`

```sql
CREATE TABLE IF NOT EXISTS social_media_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES hackathon_participants(id) ON DELETE SET NULL,
  url text NOT NULL,
  platform text,
  og_title text,
  og_description text,
  og_image_url text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_social_submissions_hackathon ON social_media_submissions(hackathon_id);
ALTER TABLE social_media_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to social_media_submissions" ON social_media_submissions FOR ALL USING (false);
```

**Edge cases:**
- `platform` is inferred from URL domain (twitter.com/x.com → twitter, linkedin.com → linkedin, etc.). Fallback to `other` for unrecognized domains.
- OG metadata fetch can fail (timeout, blocked, no OG tags). Store nulls and show "Preview unavailable" in UI.
- Duplicate URL submissions from same team should be rejected (add unique constraint or service-layer check)
- URL validation: must be a valid HTTP(S) URL. Normalize with `normalizeUrl()` from `lib/utils/url.ts`

### Migration 6: `20260401000006_mentor_requests.sql`

```sql
CREATE TYPE mentor_request_status AS ENUM (
  'open',
  'claimed',
  'resolved',
  'cancelled'
);

CREATE TABLE IF NOT EXISTS mentor_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  requester_participant_id uuid NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  category text NOT NULL,
  description text NOT NULL,
  status mentor_request_status NOT NULL DEFAULT 'open',
  claimed_by_participant_id uuid REFERENCES hackathon_participants(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mentor_requests_hackathon ON mentor_requests(hackathon_id);
CREATE INDEX idx_mentor_requests_status ON mentor_requests(hackathon_id, status);
ALTER TABLE mentor_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to mentor_requests" ON mentor_requests FOR ALL USING (false);
```

**Edge cases:**
- `category` validated at service layer: `technical`, `design`, `pitch`, `general`
- A team should only have one open request at a time (prevent spam). Check at service layer before insert.
- Claiming a request that's already claimed should return an error (race condition — two mentors click claim simultaneously). Use optimistic locking: `UPDATE ... WHERE status = 'open' RETURNING id` and check row count.
- Resolving a request that wasn't claimed by the resolving mentor should be allowed (organizer override)
- Cancelled requests (by the team) should not appear in the queue

### Migration 7: `20260401000007_rpc_round_results.sql`

```sql
CREATE OR REPLACE FUNCTION calculate_round_results(p_hackathon_id UUID, p_round_id UUID)
RETURNS TABLE (success boolean, results_count integer) AS $$
BEGIN
  -- Delete existing results for this round
  DELETE FROM hackathon_results
  WHERE hackathon_id = p_hackathon_id AND round_id = p_round_id;

  -- Calculate weighted scores scoped to round criteria and assignments
  INSERT INTO hackathon_results (hackathon_id, submission_id, round_id, rank, total_score, weighted_score, judge_count)
  SELECT
    p_hackathon_id,
    ja.submission_id,
    p_round_id,
    DENSE_RANK() OVER (ORDER BY
      SUM(s.score::numeric * jc.weight) / NULLIF(SUM(jc.weight * jc.max_score), 0) DESC
    ),
    SUM(s.score),
    SUM(s.score::numeric * jc.weight) / NULLIF(SUM(jc.weight * jc.max_score), 0) * 100,
    COUNT(DISTINCT ja.judge_participant_id)
  FROM judge_assignments ja
  JOIN scores s ON s.judge_assignment_id = ja.id
  JOIN judging_criteria jc ON jc.id = s.criteria_id
  WHERE ja.hackathon_id = p_hackathon_id
    AND ja.round_id = p_round_id
    AND ja.is_complete = true
  GROUP BY ja.submission_id;

  RETURN QUERY SELECT true, (SELECT COUNT(*)::integer FROM hackathon_results WHERE hackathon_id = p_hackathon_id AND round_id = p_round_id);
END;
$$ LANGUAGE plpgsql;
```

**Edge cases:**
- If no completed assignments exist for the round, returns `results_count = 0` (not an error)
- Submissions with no scores in this round are excluded from results
- Running this multiple times is safe (deletes + reinserts)

### Migration 8: `20260401000008_rpc_bulk_team_assign.sql`

```sql
CREATE OR REPLACE FUNCTION bulk_assign_teams(p_hackathon_id UUID, p_assignments JSONB)
RETURNS TABLE (success boolean, moved_count integer) AS $$
DECLARE
  assignment JSONB;
  moved integer := 0;
BEGIN
  FOR assignment IN SELECT * FROM jsonb_array_elements(p_assignments)
  LOOP
    UPDATE hackathon_participants
    SET team_id = (assignment->>'team_id')::uuid
    WHERE hackathon_id = p_hackathon_id
      AND clerk_user_id = assignment->>'clerk_user_id'
      AND role = 'participant';

    IF FOUND THEN moved := moved + 1; END IF;
  END LOOP;

  RETURN QUERY SELECT true, moved;
END;
$$ LANGUAGE plpgsql;
```

**Edge cases:**
- Assignments for non-existent users are silently skipped (not errors)
- Only moves `participant` role users, not judges/mentors/organizers
- Team must exist and belong to the same hackathon (FK constraint will catch mismatches)
- Atomic: all-or-nothing within the transaction

---

## Service Layer

### New Services

#### `lib/services/phases.ts`

```typescript
// Valid transitions per status
const PHASE_TRANSITIONS: Record<HackathonStatus, HackathonPhase[]> = {
  active: ['build', 'submission_open'],
  judging: ['preliminaries', 'finals', 'results_pending'],
  // All other statuses: no phases
}

export function validatePhaseTransition(status: HackathonStatus, currentPhase: HackathonPhase | null, targetPhase: HackathonPhase): string | null
// Returns error message or null if valid. Rules:
// - Target phase must be in PHASE_TRANSITIONS[status]
// - Phases must advance forward (build → submission_open, not reverse)
// - Exception: organizer can go backward if needed (warn but allow)

export async function setPhase(hackathonId: string, tenantId: string, phase: HackathonPhase): Promise<{ success: true } | { error: string }>
// Validates transition, updates hackathon, triggers webhook

export function getPhaseLabel(phase: HackathonPhase): string
// 'build' → 'Building', 'submission_open' → 'Submissions Open', etc.

export function getPhasesForStatus(status: HackathonStatus): HackathonPhase[]
// Returns ordered array of valid phases for a status
```

#### `lib/services/polling.ts`

```typescript
export async function buildPollPayload(hackathonId: string): Promise<PollResponse>
// Single function that runs 3-4 lightweight queries:
// 1. hackathons row (phase, status, starts_at, ends_at, challenge_released_at)
// 2. rooms with team counts (rooms + room_teams aggregate)
// 3. submission count + judge_assignments completion counts
// 4. mentor_requests open count
//
// All queries use indexed columns. Target: <50ms total.
// Returns compact payload with server timestamp for clock sync.
```

**Edge cases:**
- Hackathon not found: return 404 (not a poll-specific error)
- No rooms/mentors/categories: return empty arrays/zero counts (never error)
- Poll endpoint must never trigger Clerk API calls (no user lookups) — too slow for 5-10s polling

#### `lib/services/rooms.ts`

```typescript
export async function listRooms(hackathonId: string): Promise<RoomWithTeams[]>
export async function createRoom(hackathonId: string, name: string): Promise<Room>
export async function updateRoom(roomId: string, hackathonId: string, updates: { name?: string }): Promise<Room>
export async function deleteRoom(roomId: string, hackathonId: string): Promise<boolean>
export async function assignTeamsToRoom(roomId: string, teamIds: string[]): Promise<void>
export async function removeTeamFromRoom(roomId: string, teamId: string): Promise<void>
export async function togglePresented(roomId: string, teamId: string, hasPresented: boolean): Promise<void>
export async function setRoomTimer(roomId: string, endsAt: string | null, label: string | null): Promise<void>
export async function getRoomWithTeams(roomId: string): Promise<RoomWithTeams>
```

**Edge cases:**
- `assignTeamsToRoom`: Must check team isn't already in another room. If it is, either error or auto-remove from old room (prefer error with clear message).
- `deleteRoom` with teams assigned: cascade removes `room_teams` entries, teams become unassigned
- `setRoomTimer` with `endsAt = null`: clears the timer
- `togglePresented`: idempotent — setting `true` when already `true` is a no-op
- Room names should be unique within a hackathon (service-layer check)

#### `lib/services/categories.ts`

```typescript
export async function listCategories(hackathonId: string): Promise<Category[]>
export async function createCategory(hackathonId: string, input: { name: string; description?: string; prizeId?: string }): Promise<Category>
export async function updateCategory(categoryId: string, hackathonId: string, input: Partial<CategoryInput>): Promise<Category>
export async function deleteCategory(categoryId: string, hackathonId: string): Promise<boolean>
export async function getSubmissionCategories(submissionId: string): Promise<Category[]>
export async function setSubmissionCategories(submissionId: string, categoryIds: string[]): Promise<void>
```

**Edge cases:**
- `setSubmissionCategories`: delete all existing entries, insert new ones (replace strategy)
- `deleteCategory`: cascades to `submission_category_entries` only, not to submissions
- `prizeId` validation: must be a prize belonging to the same hackathon
- Empty `categoryIds` array: remove all category entries for that submission (valid)

#### `lib/services/judging-rounds.ts`

```typescript
export async function listRounds(hackathonId: string): Promise<JudgingRound[]>
export async function createRound(hackathonId: string, input: { name: string; roundType: 'preliminary' | 'finals' }): Promise<JudgingRound>
export async function updateRound(roundId: string, hackathonId: string, input: Partial<RoundInput>): Promise<JudgingRound>
export async function deleteRound(roundId: string, hackathonId: string): Promise<boolean>
export async function activateRound(hackathonId: string, roundId: string): Promise<void>
// Deactivates all other rounds for this hackathon, activates this one
export async function getActiveRound(hackathonId: string): Promise<JudgingRound | null>
```

**Edge cases:**
- Activating a round while judges are mid-scoring in the current round: warn the organizer (UI-level) but allow. Judges in the old round can finish; new scoring uses the new active round.
- Deleting a round with completed scores: SET NULL on `judge_assignments.round_id`, `scores` remain attached to assignments (not lost)
- Maximum 2 rounds expected for Build OS26 but no hard limit in code

#### `lib/services/social-submissions.ts`

```typescript
export async function submitSocialUrl(hackathonId: string, teamId: string | null, participantId: string, url: string): Promise<SocialSubmission>
export async function fetchOgMetadata(url: string): Promise<{ title: string | null; description: string | null; imageUrl: string | null }>
export async function listSocialSubmissions(hackathonId: string): Promise<SocialSubmission[]>
export async function reviewSocialSubmission(id: string, hackathonId: string, status: 'approved' | 'rejected'): Promise<void>
```

**Edge cases:**
- OG metadata fetch timeout: 5 second timeout. If fails, save submission with null metadata. Do not block the user.
- OG metadata fetch as fire-and-forget: insert the row first, then update with metadata async (or fetch inline with timeout)
- Detect platform from URL: `x.com`, `twitter.com` → `twitter`; `linkedin.com` → `linkedin`; `instagram.com` → `instagram`; else `other`
- Prevent duplicate URLs: check existing submissions for same URL + hackathon
- URL must be HTTP(S). No file:// or javascript:// (security)

#### `lib/services/mentor-requests.ts`

```typescript
export async function createRequest(hackathonId: string, teamId: string | null, participantId: string, category: string, description: string): Promise<MentorRequest>
export async function listOpenRequests(hackathonId: string): Promise<MentorRequest[]>
// Sorted by created_at ASC (oldest first). Includes team name via join.
export async function claimRequest(requestId: string, mentorParticipantId: string): Promise<void>
export async function resolveRequest(requestId: string, mentorParticipantId: string): Promise<void>
export async function cancelRequest(requestId: string, participantId: string): Promise<void>
export async function getQueueStats(hackathonId: string): Promise<{ open: number; claimed: number; resolved: number }>
```

**Edge cases:**
- Race condition on claim: Use `UPDATE ... WHERE status = 'open' RETURNING *`. If no rows returned, request was already claimed. Return clear error message.
- One open request per team: Before creating, check if team already has an open/claimed request. If so, reject with "Your team already has an active help request."
- Category validation: must be one of `technical`, `design`, `pitch`, `general`
- Mentor role check: only participants with `role = 'mentor'` can claim/resolve
- Organizer can see all requests (claimed and open) for the overview

#### `lib/services/challenge.ts`

```typescript
export async function getChallenge(hackathonId: string): Promise<{ title: string | null; body: string | null; releasedAt: string | null }>
export async function saveChallenge(hackathonId: string, tenantId: string, title: string, body: string): Promise<void>
export async function releaseChallenge(hackathonId: string, tenantId: string): Promise<void>
```

**Edge cases:**
- Release is one-time: if `challenge_released_at` is already set, return error "Challenge already released"
- Release triggers: (1) set `challenge_released_at = now()`, (2) send email to all registered participants, (3) poll endpoint picks up `challenge.released = true`
- Email sending failure should not prevent the release — log errors but mark as released
- Save is idempotent — organizer can edit the challenge before releasing
- After release, challenge content should be immutable (or at least warn organizer before editing)

#### `lib/services/event-dashboard.ts`

```typescript
export async function getLiveStats(hackathonId: string): Promise<LiveStats>

interface LiveStats {
  phase: HackathonPhase | null
  status: HackathonStatus
  teamCount: number
  participantCount: number
  submissionCount: number
  submittedTeamCount: number
  rooms: { id: string; name: string; teamsTotal: number; teamsPresented: number; timerEndsAt: string | null }[]
  judging: { roundName: string; assignmentsTotal: number; assignmentsComplete: number }[]
  mentorQueue: { open: number; claimed: number; avgWaitMinutes: number | null }
  challenge: { released: boolean; releasedAt: string | null }
}
```

**Edge cases:**
- `avgWaitMinutes` calculated from open requests' `created_at` to now. Null if no open requests.
- This endpoint is heavier than the poll endpoint (more joins). Cache at API level with `Cache-Control: max-age=3`.
- When no rooms/rounds exist, return empty arrays (not errors)

#### `lib/services/participant-emails.ts`

```typescript
export async function sendBulkEmail(
  hackathonId: string,
  tenantId: string,
  subject: string,
  htmlBody: string,
  recipientFilter: 'all' | 'participants' | 'judges' | 'mentors'
): Promise<{ sent: number; failed: number }>
```

**Edge cases:**
- Clerk user lookup by `clerk_user_id` to get emails. Batch in groups of 100 (Clerk API limit).
- Resend batch send has a 100-recipient limit per call. Loop in batches.
- Some participants may not have an email (rare but possible). Skip with warning.
- Rate limiting: add a cooldown — don't allow another blast within 5 minutes (prevent accidental double-sends)
- HTML body should be sanitized (no script tags). Use the same email template wrapper as existing emails.

#### `lib/services/winner-pages.ts`

```typescript
export async function getWinnerPageData(hackathonId: string): Promise<WinnerPageData | null>
// Returns null if results not published. Includes all prize winners with team, members, project details.

export async function generateSponsorReport(hackathonId: string): Promise<SponsorReport>
// Aggregates: hackathon name, dates, location, total participants, total teams,
// total submissions, submissions per category, sponsors list with tier,
// all prize winners, social media submission count.
```

**Edge cases:**
- Winner page only accessible when `results_published_at` is not null
- Sponsor report should work even without results published (shows event stats without winners)
- Team members need Clerk user lookup for names — cache or fetch at report generation time

### Modified Services

#### `lib/services/hackathons.ts` — additions:

```typescript
export async function listTeamsWithMembers(hackathonId: string): Promise<TeamWithMembers[]>
// Joins teams with hackathon_participants to get member details

export async function createTeamWithMembers(hackathonId: string, name: string, memberClerkUserIds: string[]): Promise<Team>
// Creates team, assigns captain (first member), moves participants to team

export async function modifyTeamMembers(hackathonId: string, teamId: string, add: string[], remove: string[]): Promise<void>
// Add/remove participants from a team. Validates all users are registered.

export async function bulkAssignTeams(hackathonId: string, assignments: { clerkUserId: string; teamId: string }[]): Promise<{ success: boolean; moved: number }>
// Calls the bulk_assign_teams RPC

export async function importParticipantsFromCsv(hackathonId: string, rows: CsvRow[]): Promise<ImportResult>
// CSV format: name, email, team_name
// 1. Parse rows
// 2. Look up Clerk users by email (batch)
// 3. Register unregistered users (if they exist in Clerk)
// 4. Create teams as needed
// 5. Assign to teams
// Returns: { created: number, assigned: number, skipped: { email: string; reason: string }[] }
```

**Edge cases for CSV import:**
- User exists in Clerk but not registered → register them automatically
- User doesn't exist in Clerk → skip with reason "User not found in Clerk"
- Duplicate email rows → process first occurrence, skip subsequent
- Team name collision → reuse existing team with that name (don't create duplicate)
- Captain assignment: first member added to a new team becomes captain
- Empty team_name → leave participant unassigned (solo)
- CSV encoding: handle UTF-8 BOM, CRLF line endings

#### `lib/services/submissions.ts` — modifications:

- `createSubmission()`: accept optional `categoryIds: string[]`. After insert, call `categories.setSubmissionCategories()`.
- `updateSubmission()`: same pattern — accept `categoryIds`, update entries.

#### `lib/services/judging.ts` — modifications:

- `listJudgingCriteria(hackathonId, options?: { roundId?: string; categoryId?: string })`: Filter by round and/or category when provided. When `roundId` is set, return criteria where `round_id = roundId OR round_id IS NULL` (global + round-specific).
- `autoAssignJudges(hackathonId, submissionsPerJudge, options?: { roundId?: string; roomId?: string })`: When `roundId` set, create assignments with that `round_id`. When `roomId` set, only assign submissions from teams in that room.
- `getJudgingProgress(hackathonId, options?: { roundId?: string })`: Filter by round.

#### `lib/services/results.ts` — additions:

```typescript
export async function calculateRoundResults(hackathonId: string, roundId: string): Promise<{ success: boolean; resultsCount: number }>
// Calls the calculate_round_results RPC

export async function getResultsByRound(hackathonId: string, roundId: string): Promise<HackathonResult[]>
// Filtered by round_id
```

---

## API Routes

### New Route File: `lib/api/routes/dashboard-event.ts`

All day-of-event management endpoints. Mounted into the main API instance.

```
PATCH  /dashboard/hackathons/:id/phase                              → setPhase
GET    /dashboard/hackathons/:id/rooms                              → listRooms
POST   /dashboard/hackathons/:id/rooms                              → createRoom
PATCH  /dashboard/hackathons/:id/rooms/:roomId                      → updateRoom
DELETE /dashboard/hackathons/:id/rooms/:roomId                      → deleteRoom
POST   /dashboard/hackathons/:id/rooms/:roomId/teams                → assignTeamsToRoom
DELETE /dashboard/hackathons/:id/rooms/:roomId/teams/:teamId        → removeTeamFromRoom
PATCH  /dashboard/hackathons/:id/rooms/:roomId/teams/:teamId        → togglePresented
PATCH  /dashboard/hackathons/:id/rooms/:roomId/timer                → setRoomTimer
GET    /dashboard/hackathons/:id/teams                              → listTeamsWithMembers
POST   /dashboard/hackathons/:id/teams                              → createTeamWithMembers
PATCH  /dashboard/hackathons/:id/teams/:teamId/members              → modifyTeamMembers
POST   /dashboard/hackathons/:id/teams/bulk-assign                  → bulkAssignTeams
POST   /dashboard/hackathons/:id/teams/import-csv                   → importParticipantsFromCsv
GET    /dashboard/hackathons/:id/categories                         → listCategories
POST   /dashboard/hackathons/:id/categories                         → createCategory
PATCH  /dashboard/hackathons/:id/categories/:categoryId             → updateCategory
DELETE /dashboard/hackathons/:id/categories/:categoryId             → deleteCategory
GET    /dashboard/hackathons/:id/judging/rounds                     → listRounds
POST   /dashboard/hackathons/:id/judging/rounds                     → createRound
PATCH  /dashboard/hackathons/:id/judging/rounds/:roundId            → updateRound
DELETE /dashboard/hackathons/:id/judging/rounds/:roundId            → deleteRound
POST   /dashboard/hackathons/:id/judging/rounds/:roundId/activate   → activateRound
GET    /dashboard/hackathons/:id/challenge                          → getChallenge
PUT    /dashboard/hackathons/:id/challenge                          → saveChallenge
POST   /dashboard/hackathons/:id/challenge/release                  → releaseChallenge
GET    /dashboard/hackathons/:id/social-submissions                 → listSocialSubmissions
PATCH  /dashboard/hackathons/:id/social-submissions/:subId          → reviewSocialSubmission
GET    /dashboard/hackathons/:id/mentor-requests                    → listAllMentorRequests
POST   /dashboard/hackathons/:id/email-blast                        → sendBulkEmail
GET    /dashboard/hackathons/:id/live-stats                         → getLiveStats
```

### New Route File: `lib/api/routes/public-event.ts`

Public-facing endpoints (optional or role-based auth).

```
GET    /public/hackathons/:slug/poll                                → buildPollPayload (no auth)
GET    /public/hackathons/:slug/categories                          → listCategories (no auth)
POST   /public/hackathons/:slug/social-submit                       → submitSocialUrl (participant auth)
POST   /public/hackathons/:slug/mentor-request                      → createRequest (participant auth)
GET    /public/hackathons/:slug/mentor-queue                        → listOpenRequests (mentor auth)
POST   /public/hackathons/:slug/mentor-request/:id/claim            → claimRequest (mentor auth)
POST   /public/hackathons/:slug/mentor-request/:id/resolve          → resolveRequest (mentor auth)
GET    /public/hackathons/:slug/winners                             → getWinnerPageData (no auth, only when published)
```

### Modified Existing Routes

**`lib/api/routes/dashboard.ts`** — PATCH `/hackathons/:id/settings`:
- Add `phase` to the accepted body schema

**`lib/api/routes/public.ts`** — POST `/hackathons/:slug/submissions`:
- Add `categoryIds: string[]` (optional) to the body schema

**`lib/api/routes/dashboard-judging.ts`**:
- POST `/hackathons/:id/judging/criteria`: accept optional `roundId`, `categoryId`
- POST `/hackathons/:id/judging/auto-assign`: accept optional `roundId`, `roomId`
- GET `/hackathons/:id/judging/assignments`: accept optional `?roundId=` query param

**`lib/api/routes/dashboard-results.ts`**:
- POST `/hackathons/:id/results/calculate`: accept optional `roundId`

**`lib/api/index.ts`**:
- Import and `.use()` `dashboardEventRoutes` and `publicEventRoutes`

---

## UI Components & Pages

### New Pages

| Route | Auth | Purpose |
|-------|------|---------|
| `app/(public)/e/[slug]/display/layout.tsx` | None | Strips parent layout chrome for all display routes |
| `app/(public)/e/[slug]/display/timer/page.tsx` | None | Fullscreen countdown. `?room=<id>` for room-specific. Polls at 3s. |
| `app/(public)/e/[slug]/display/rooms/page.tsx` | None | Grid of all rooms with team lists, timers, presented status |
| `app/(public)/e/[slug]/display/challenge/page.tsx` | None | Fullscreen challenge text for projection |
| `app/(public)/e/[slug]/display/winners/page.tsx` | None | Projection-optimized winners display |
| `app/(public)/e/[slug]/display/leaderboard/page.tsx` | None | Live score display during judging |
| `app/(public)/e/[slug]/dashboard/page.tsx` | Organizer | Fullscreen live dashboard, no nav, polls at 5s |
| `app/(public)/e/[slug]/mentors/page.tsx` | Mentor | Dedicated mentor queue page |
| `app/(public)/e/[slug]/winners/page.tsx` | None | Public winners page with OG metadata for social sharing |

**Display route architecture:**
- All display routes share `display/layout.tsx` which renders only `{children}` — no header, no sidebar, no footer
- Dark background by default for projection readability
- Auto-scaling text using CSS `clamp()` / viewport units
- Client component with `useEventPoll()` for live updates
- Server-rendered page loads initial data, client component takes over

### New Manage Tabs

| Tab file | Tab value | Sub-tabs |
|----------|-----------|----------|
| `app/(public)/e/[slug]/manage/_teams-tab.tsx` | `teams` | — |
| `app/(public)/e/[slug]/manage/_rooms-tab.tsx` | `rooms` | — |
| `app/(public)/e/[slug]/manage/_event-tab.tsx` | `event` | `challenge`, `mentors`, `social`, `email` (via `?etab=`) |

Updated `lib/utils/manage-tabs.ts`:
```typescript
export const VALID_TABS = ["edit", "teams", "rooms", "judges", "prizes", "event"] as const
export const VALID_ETABS = ["challenge", "mentors", "social", "email"] as const
```

Default tab by status:
- `draft`/`published` → `edit`
- `registration_open` → `teams`
- `active` → `event` (challenge/mentors)
- `judging` → `judges`
- `completed`/`archived` → `prizes`

### New Components

**Phase & Timer (~5 files):**
- `components/hackathon/phase-badge.tsx` — Current phase label ("Building", "Submissions Open", etc.)
- `components/hackathon/phase-controls.tsx` — Forward/back phase buttons for organizer
- `components/hackathon/event-timer.tsx` — Phase-aware countdown, 1s interval when <5min. Replaces `CountdownBadge` on event pages.
- `components/hackathon/display/fullscreen-wrapper.tsx` — Shared display wrapper: dark bg, viewport-sized text, no chrome
- `components/hackathon/display/fullscreen-timer.tsx` — Large-format projection timer

**Rooms (~5 files):**
- `components/hackathon/rooms/room-manager.tsx` — Create/edit rooms UI
- `components/hackathon/rooms/room-card.tsx` — Single room card: team list, timer, presented count
- `components/hackathon/rooms/room-timer-control.tsx` — Duration picker / set specific time
- `components/hackathon/rooms/room-team-list.tsx` — Checkable list with "presented" toggle
- `components/hackathon/display/room-grid.tsx` — All rooms in grid for display route

**Teams (~3 files):**
- `components/hackathon/teams/organizer-team-manager.tsx` — Table of teams + members, inline editing
- `components/hackathon/teams/csv-import-dialog.tsx` — Upload CSV, preview parsed data, confirm
- `components/hackathon/teams/unassigned-participants.tsx` — Solo participants list

**Categories (~2 files):**
- `components/hackathon/categories/category-manager.tsx` — Organizer CRUD, link to prize
- `components/hackathon/categories/category-select.tsx` — Multi-checkbox in submission form

**Judging Rounds (~2 files):**
- `components/hackathon/judging/round-manager.tsx` — Create preliminary/finals rounds
- `components/hackathon/judging/round-selector.tsx` — Dropdown to switch rounds

**Social Media (~3 files):**
- `components/hackathon/social/social-submit-form.tsx` — URL input for participants
- `components/hackathon/social/social-submission-card.tsx` — OG preview card
- `components/hackathon/social/social-review-list.tsx` — Organizer approve/reject table

**Mentors (~4 files):**
- `components/hackathon/mentors/help-request-form.tsx` — Category dropdown + description
- `components/hackathon/mentors/mentor-queue.tsx` — Sorted queue with claim buttons
- `components/hackathon/mentors/request-card.tsx` — Team name, category, elapsed time, claim/resolve
- `components/hackathon/mentors/mentor-status-badge.tsx` — "3 requests open" badge

**Challenge (~3 files):**
- `components/hackathon/challenge/challenge-editor.tsx` — Markdown editor for organizer
- `components/hackathon/challenge/challenge-banner.tsx` — Dismissable banner after release
- `components/hackathon/challenge/challenge-toast.tsx` — Toast when poll detects release

**Dashboard (~5 files):**
- `components/hackathon/dashboard/live-stats-grid.tsx` — Stat cards (teams, submissions, judging %)
- `components/hackathon/dashboard/phase-timeline.tsx` — Horizontal phase indicator
- `components/hackathon/dashboard/quick-actions.tsx` — Advance phase, release challenge, etc.
- `components/hackathon/dashboard/room-overview-grid.tsx` — Compact room status cards
- `components/hackathon/dashboard/mentor-queue-summary.tsx` — Open count + oldest

**Winners (~3 files):**
- `components/hackathon/winners/winner-card.tsx` — Prize, team, project links
- `components/hackathon/winners/winner-grid.tsx` — Responsive grid of winner cards
- `components/hackathon/winners/sponsor-report.tsx` — Downloadable summary

**Email (~1 file):**
- `components/hackathon/email/blast-composer.tsx` — Subject, body, recipient filter, send

**Hooks (~1 file):**
- `hooks/use-event-poll.ts` — Short polling hook

### Modified Components

| Component | Change |
|-----------|--------|
| `countdown-badge.tsx` | Accept phase info, switch to 1s interval when <5min, accept `pollUrl` prop |
| `submission-button.tsx` | Add category multi-select step after title step |
| `lifecycle-stepper.tsx` | Add phase sub-indicators below active/judging steps |
| `judging/criteria-config.tsx` | Add round/category selector dropdowns |
| `judging/scoring-panel.tsx` | Filter criteria by active round |
| `judging/focus-scoring-view.tsx` | Filter criteria by active round |
| `judging/judge-assignments.tsx` | Add round filter dropdown |
| `manage/page.tsx` | Render new tabs (teams, rooms, event), show display links |

---

## Short Polling Architecture

### Poll Endpoint

`GET /api/public/hackathons/:slug/poll` — no auth, cached at edge.

```typescript
type PollResponse = {
  ts: number                    // Server timestamp (ms) for clock sync
  phase: HackathonPhase | null
  status: HackathonStatus
  timers: {
    global?: { endsAt: string; label: string }
    rooms: { id: string; name: string; endsAt: string | null; label: string | null }[]
  }
  challenge: {
    released: boolean
    releasedAt: string | null
    title: string | null
  } | null
  stats: {
    submissionCount: number
    teamCount: number
    judgingComplete: number
    judgingTotal: number
    mentorQueueOpen: number
  }
  version: number               // Monotonically increasing; client skips if <= last seen
}
```

**Cache headers:**
```
Cache-Control: public, max-age=2, stale-while-revalidate=5
```

### Client Hook

`hooks/use-event-poll.ts`:

```typescript
export function useEventPoll(slug: string, options?: { interval?: number }): {
  data: PollResponse | null
  isStale: boolean
  lastUpdated: number | null
}
```

- Default intervals: 10s (participant pages), 5s (organizer dashboard), 3s (display routes)
- Pauses when `document.hidden === true` (tab not visible)
- `isStale = true` when 3+ consecutive polls fail (show "Connection lost" indicator)
- Uses `AbortController` to cancel in-flight requests on unmount

### Performance Budget

- ~100 concurrent users polling at 5-10s = ~15 requests/second
- Each poll query: 3-4 indexed Supabase queries, target <50ms total
- No Clerk API calls in poll path
- CDN caching (2s max-age) absorbs burst requests

---

## PR Grouping

### PR 1: Foundation — Schema, Phases, Polling, Timer
**Branch:** `feature/build-os26-foundation`
**Dependencies:** None

Contains:
- Migration `20260401000001_hackathon_phases.sql`
- Services: `phases.ts`, `polling.ts`
- API: `dashboard-event.ts` (phase endpoint only), `public-event.ts` (poll endpoint only), mount in `index.ts`
- Hook: `use-event-poll.ts`
- Components: `phase-badge.tsx`, `phase-controls.tsx`, `event-timer.tsx`, `display/fullscreen-wrapper.tsx`, `display/fullscreen-timer.tsx`
- Pages: `display/layout.tsx`, `display/timer/page.tsx`
- Modified: `countdown-badge.tsx`, `lifecycle-stepper.tsx`, `manage-tabs.ts`, `hackathon-types.ts`, `dashboard.ts` (phase in settings)

### PR 2: Teams, Rooms, Categories
**Branch:** `feature/build-os26-teams-rooms-categories`
**Dependencies:** PR 1 (polling, manage-tabs)

Contains:
- Migrations: `rooms.sql`, `submission_categories.sql`, `rpc_bulk_team_assign.sql`
- Services: `rooms.ts`, `categories.ts`
- API: Room, team, category endpoints in `dashboard-event.ts` and `public-event.ts`
- Components: All `rooms/*`, `teams/*`, `categories/*` components
- Pages: `manage/_teams-tab.tsx`, `manage/_rooms-tab.tsx`, `display/rooms/page.tsx`
- Modified: `hackathons.ts` (team management), `submissions.ts` (categories), `submission-button.tsx`, `manage/page.tsx`

### PR 3: Judging Rounds, Social Media, Mentors
**Branch:** `feature/build-os26-judging-social-mentors`
**Dependencies:** PR 2 (rooms, categories)

Contains:
- Migrations: `judging_rounds.sql`, `social_media_submissions.sql`, `mentor_requests.sql`, `rpc_round_results.sql`
- Services: `judging-rounds.ts`, `social-submissions.ts`, `mentor-requests.ts`
- API: Round, social, mentor endpoints
- Components: `judging/round-manager.tsx`, `judging/round-selector.tsx`, all `social/*`, all `mentors/*`
- Pages: `mentors/page.tsx`
- Modified: `judging.ts`, `results.ts`, `dashboard-judging.ts`, `dashboard-results.ts`, `criteria-config.tsx`, `scoring-panel.tsx`, `focus-scoring-view.tsx`, `judge-assignments.tsx`

### PR 4: Challenge, Live Dashboard, Email
**Branch:** `feature/build-os26-challenge-dashboard-email`
**Dependencies:** PR 1 (polling), PR 2 (rooms), PR 3 (mentor stats)

Contains:
- Services: `challenge.ts`, `event-dashboard.ts`, `participant-emails.ts`
- API: Challenge, live-stats, email-blast endpoints
- Components: All `challenge/*`, all `dashboard/*`, `email/blast-composer.tsx`
- Pages: `manage/_event-tab.tsx`, `dashboard/page.tsx`, `display/challenge/page.tsx`
- Modified: `manage/page.tsx` (event tab), `manage-tabs.ts` (VALID_ETABS), event page (challenge banner)

### PR 5: Winners, Sponsor Report, Remaining Displays
**Branch:** `feature/build-os26-winners-post-event`
**Dependencies:** PR 3 (judging rounds results)

Contains:
- Services: `winner-pages.ts`
- API: Winners endpoint
- Components: All `winners/*`
- Pages: `winners/page.tsx` (with OG metadata), `display/winners/page.tsx`, `display/leaderboard/page.tsx`

---

## Test Plan

### Unit Tests

Every new service file gets a corresponding test file in `__tests__/services/`.

#### `__tests__/services/phases.test.ts`
- `validatePhaseTransition`: Valid transitions return null
- `validatePhaseTransition`: Invalid status/phase combo returns error
- `validatePhaseTransition`: Backward transitions return warning but succeed
- `setPhase`: Updates hackathon phase column
- `setPhase`: Rejects phase invalid for current status
- `getPhaseLabel`: Returns correct label for each phase
- `getPhasesForStatus`: Returns ordered phases for active/judging, empty for others

#### `__tests__/services/rooms.test.ts`
- `createRoom`: Creates room with correct hackathon_id
- `createRoom`: Rejects duplicate name within hackathon
- `assignTeamsToRoom`: Assigns teams correctly
- `assignTeamsToRoom`: Rejects team already in another room
- `removeTeamFromRoom`: Removes team, team becomes unassigned
- `togglePresented`: Toggles has_presented flag
- `togglePresented`: Idempotent (setting true when true = no-op)
- `setRoomTimer`: Sets timer_ends_at and timer_label
- `setRoomTimer`: Clears timer when null passed
- `deleteRoom`: Cascades to room_teams
- `listRooms`: Returns rooms with team counts

#### `__tests__/services/categories.test.ts`
- `createCategory`: Creates with correct hackathon_id
- `createCategory`: Links prize_id when provided
- `setSubmissionCategories`: Replaces existing entries
- `setSubmissionCategories`: Empty array removes all entries
- `deleteCategory`: Cascades to entries, not submissions
- `listCategories`: Returns categories with submission counts

#### `__tests__/services/judging-rounds.test.ts`
- `createRound`: Creates with correct type
- `activateRound`: Deactivates other rounds
- `activateRound`: Only one active per hackathon
- `getActiveRound`: Returns active round or null
- `deleteRound`: SET NULLs related criteria/assignments

#### `__tests__/services/social-submissions.test.ts`
- `submitSocialUrl`: Creates submission with platform detection
- `submitSocialUrl`: Rejects duplicate URL for same hackathon
- `submitSocialUrl`: Normalizes URL before storing
- `fetchOgMetadata`: Parses og:title, og:description, og:image
- `fetchOgMetadata`: Returns nulls on timeout
- `fetchOgMetadata`: Returns nulls on invalid HTML
- `reviewSocialSubmission`: Updates status and reviewed_at

#### `__tests__/services/mentor-requests.test.ts`
- `createRequest`: Creates with correct fields
- `createRequest`: Rejects if team already has open request
- `createRequest`: Validates category
- `claimRequest`: Sets status=claimed, claimed_by, claimed_at
- `claimRequest`: Race condition — returns error if already claimed
- `resolveRequest`: Sets status=resolved, resolved_at
- `cancelRequest`: Only requester can cancel
- `listOpenRequests`: Sorted by created_at ASC
- `listOpenRequests`: Excludes cancelled/resolved
- `getQueueStats`: Returns correct counts

#### `__tests__/services/challenge.test.ts`
- `saveChallenge`: Updates title and body
- `releaseChallenge`: Sets challenge_released_at
- `releaseChallenge`: Rejects if already released
- `releaseChallenge`: Triggers email (mock)
- `getChallenge`: Returns challenge data or nulls

#### `__tests__/services/polling.test.ts`
- `buildPollPayload`: Returns correct shape with all fields
- `buildPollPayload`: Handles hackathon with no rooms
- `buildPollPayload`: Handles hackathon with no mentor requests
- `buildPollPayload`: Challenge field reflects released state
- `buildPollPayload`: Timer reflects current phase

#### `__tests__/services/event-dashboard.test.ts`
- `getLiveStats`: Returns all aggregate counts
- `getLiveStats`: Handles empty state (no teams, no submissions)
- `getLiveStats`: avgWaitMinutes calculates correctly
- `getLiveStats`: Room data includes timer state

#### `__tests__/services/participant-emails.test.ts`
- `sendBulkEmail`: Sends to all participants
- `sendBulkEmail`: Filters by role
- `sendBulkEmail`: Handles Clerk lookup failures gracefully
- `sendBulkEmail`: Batches correctly (100 per batch)

#### `__tests__/services/winner-pages.test.ts`
- `getWinnerPageData`: Returns null when results not published
- `getWinnerPageData`: Returns all winners with details when published
- `generateSponsorReport`: Includes all expected fields
- `generateSponsorReport`: Works without results published

### API Route Tests

Every new API endpoint gets tests in `__tests__/api/`.

#### `__tests__/api/dashboard-event.test.ts`
- Each endpoint: 200 on valid request
- Each endpoint: 401 when not authenticated
- Each endpoint: 403 when not organizer
- UUID validation: 404 on invalid hackathon ID
- Phase endpoint: validates transition
- Room endpoints: full CRUD lifecycle
- Team endpoints: bulk assign, CSV import
- Category endpoints: CRUD + prize linking
- Round endpoints: CRUD + activate
- Challenge: save + release lifecycle
- Email blast: validates recipient filter
- Room timer: set + clear

#### `__tests__/api/public-event.test.ts`
- Poll: returns correct shape, no auth needed
- Poll: 404 on invalid slug
- Categories: returns list, no auth needed
- Social submit: requires auth, validates URL
- Mentor request: requires participant auth
- Mentor queue: requires mentor auth
- Mentor claim: race condition handling
- Winners: 404 when results not published

### Integration Tests

Integration tests in `__tests__/integration/` test full flows.

#### `__tests__/integration/event-lifecycle.integration.test.ts`
Full Build OS26 lifecycle:
1. Create hackathon, set to active
2. Set phase to `build`
3. Release challenge
4. Register participants, create teams (bulk import)
5. Create rooms, assign teams
6. Set phase to `submission_open`
7. Teams submit with categories
8. Create judging round (preliminary)
9. Set phase to `preliminaries`
10. Assign judges to rooms/round
11. Submit scores
12. Calculate round results
13. Create finals round, activate
14. Set phase to `finals`
15. Score finalists
16. Calculate final results
17. Publish results
18. Verify winner page data

#### `__tests__/integration/mentor-flow.integration.test.ts`
1. Team creates help request
2. Second request from same team rejected
3. Mentor sees request in queue
4. Mentor claims request
5. Second mentor claim rejected (race)
6. Team sees "Mentor on the way"
7. Mentor resolves request
8. Team can create new request

#### `__tests__/integration/room-management.integration.test.ts`
1. Create rooms
2. Assign teams to rooms
3. Try assigning team to second room (error)
4. Remove team from room
5. Assign to different room (success)
6. Toggle presented
7. Set room timer
8. Delete room (teams freed)

### Component Tests

Test key UI components in `__tests__/components/`.

#### `__tests__/components/hackathon/event-timer.test.tsx`
- Renders countdown from poll data
- Switches to 1s interval when <5min
- Shows phase label
- Shows "Time's up!" when timer expires

#### `__tests__/components/hackathon/rooms/room-manager.test.tsx`
- Renders room list
- Create room form
- Delete room confirmation
- Room card shows team count and timer

#### `__tests__/components/hackathon/categories/category-select.test.tsx`
- Renders checkboxes for each category
- Allows multi-select
- Passes selected IDs to parent

#### `__tests__/components/hackathon/mentors/mentor-queue.test.tsx`
- Renders sorted queue
- Claim button calls API
- Shows elapsed time
- Updates on poll

#### `__tests__/hooks/use-event-poll.test.ts`
- Polls at specified interval
- Pauses when document hidden
- Sets isStale after 3 failures
- Returns latest data
- Cleans up on unmount

### Manual QA Checklist

For each PR, verify in browser:

**PR 1 — Foundation:**
- [ ] Phase badge shows on event page
- [ ] Phase controls advance phase correctly
- [ ] Timer counts down with 1s precision when <5min
- [ ] Display timer page renders fullscreen
- [ ] Display timer syncs with server via polling
- [ ] Poll endpoint returns valid data
- [ ] Poll pauses when tab is hidden

**PR 2 — Teams, Rooms, Categories:**
- [ ] Organizer can create/edit/delete teams from manage page
- [ ] CSV import: upload, preview, confirm flow works
- [ ] CSV import: skipped rows show clear reasons
- [ ] Room create/edit/delete works
- [ ] Teams can be assigned to rooms
- [ ] "Presented" toggle works per team
- [ ] Room timer can be set and counts down
- [ ] Room display page shows all rooms with correct state
- [ ] Category CRUD works in manage page
- [ ] Submission form shows category checkboxes
- [ ] Categories persist on submission
- [ ] Organizer can find display links easily

**PR 3 — Judging, Social, Mentors:**
- [ ] Create preliminary + finals rounds
- [ ] Criteria can be scoped to round and category
- [ ] Activating a round deactivates others
- [ ] Scoring panel shows only active round's criteria
- [ ] Judge assignments filterable by round
- [ ] Social URL submission works from event page
- [ ] OG metadata appears on social cards
- [ ] Organizer can approve/reject social submissions
- [ ] Help request form works (category + description)
- [ ] Mentor queue shows sorted requests
- [ ] Claim flow works (updates status)
- [ ] Second claim attempt shows error
- [ ] Resolve flow works

**PR 4 — Challenge, Dashboard, Email:**
- [ ] Challenge editor saves draft
- [ ] Release challenge triggers banner on event page
- [ ] Challenge banner dismissable but re-accessible
- [ ] Email sent to all participants on release
- [ ] Live dashboard shows all stats
- [ ] Dashboard polls and updates without refresh
- [ ] Quick actions work (advance phase, etc.)
- [ ] Email blast sends with correct filter
- [ ] Display challenge page renders fullscreen

**PR 5 — Winners:**
- [ ] Winner page accessible after results published
- [ ] Winner cards show team, prize, project links
- [ ] OG metadata works for social sharing (preview with og:image)
- [ ] Sponsor report downloads with correct data
- [ ] Display winners page renders for projection

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Poll endpoint slow under load | Degraded experience for all users | Keep queries indexed, add cache headers, test with 100 concurrent |
| CSV import with unregistered Clerk users | Partial import failures | Clear error reporting per row, allow re-import |
| Race condition on mentor claim | Two mentors respond to same request | Optimistic locking with `WHERE status = 'open' RETURNING` |
| Phase transition during active scoring | Judge confusion | Warn organizer in UI, allow in-flight scores to complete |
| OG metadata fetch timeout | Slow social submission | Fire-and-forget metadata, don't block user |
| Manage page tab overflow on mobile | Unusable on small screens | Horizontal scroll wrapper (existing pattern) |
| Display route leaking sensitive data | Public URLs showing internal state | Display routes only show non-sensitive data (timer, team names, results) |
| Email blast double-send | Spam to all participants | 5-minute cooldown between blasts, confirmation dialog |
| Large CSV file processing | Timeout on import | Limit to 200 rows per import, process synchronously |

---

## File Inventory

### New Files (~60)

**Migrations (8):**
`supabase/migrations/20260401000001_hackathon_phases.sql`
`supabase/migrations/20260401000002_rooms.sql`
`supabase/migrations/20260401000003_submission_categories.sql`
`supabase/migrations/20260401000004_judging_rounds.sql`
`supabase/migrations/20260401000005_social_media_submissions.sql`
`supabase/migrations/20260401000006_mentor_requests.sql`
`supabase/migrations/20260401000007_rpc_round_results.sql`
`supabase/migrations/20260401000008_rpc_bulk_team_assign.sql`

**Services (11):**
`lib/services/phases.ts`
`lib/services/polling.ts`
`lib/services/rooms.ts`
`lib/services/categories.ts`
`lib/services/judging-rounds.ts`
`lib/services/social-submissions.ts`
`lib/services/mentor-requests.ts`
`lib/services/challenge.ts`
`lib/services/event-dashboard.ts`
`lib/services/participant-emails.ts`
`lib/services/winner-pages.ts`

**API Routes (2):**
`lib/api/routes/dashboard-event.ts`
`lib/api/routes/public-event.ts`

**Pages (9):**
`app/(public)/e/[slug]/display/layout.tsx`
`app/(public)/e/[slug]/display/timer/page.tsx`
`app/(public)/e/[slug]/display/rooms/page.tsx`
`app/(public)/e/[slug]/display/challenge/page.tsx`
`app/(public)/e/[slug]/display/winners/page.tsx`
`app/(public)/e/[slug]/display/leaderboard/page.tsx`
`app/(public)/e/[slug]/dashboard/page.tsx`
`app/(public)/e/[slug]/mentors/page.tsx`
`app/(public)/e/[slug]/winners/page.tsx`

**Manage Tabs (3):**
`app/(public)/e/[slug]/manage/_teams-tab.tsx`
`app/(public)/e/[slug]/manage/_rooms-tab.tsx`
`app/(public)/e/[slug]/manage/_event-tab.tsx`

**Hooks (1):**
`hooks/use-event-poll.ts`

**Components (~35):**
`components/hackathon/phase-badge.tsx`
`components/hackathon/phase-controls.tsx`
`components/hackathon/event-timer.tsx`
`components/hackathon/display/fullscreen-wrapper.tsx`
`components/hackathon/display/fullscreen-timer.tsx`
`components/hackathon/display/room-grid.tsx`
`components/hackathon/rooms/room-manager.tsx`
`components/hackathon/rooms/room-card.tsx`
`components/hackathon/rooms/room-timer-control.tsx`
`components/hackathon/rooms/room-team-list.tsx`
`components/hackathon/teams/organizer-team-manager.tsx`
`components/hackathon/teams/csv-import-dialog.tsx`
`components/hackathon/teams/unassigned-participants.tsx`
`components/hackathon/categories/category-manager.tsx`
`components/hackathon/categories/category-select.tsx`
`components/hackathon/judging/round-manager.tsx`
`components/hackathon/judging/round-selector.tsx`
`components/hackathon/social/social-submit-form.tsx`
`components/hackathon/social/social-submission-card.tsx`
`components/hackathon/social/social-review-list.tsx`
`components/hackathon/mentors/help-request-form.tsx`
`components/hackathon/mentors/mentor-queue.tsx`
`components/hackathon/mentors/request-card.tsx`
`components/hackathon/mentors/mentor-status-badge.tsx`
`components/hackathon/challenge/challenge-editor.tsx`
`components/hackathon/challenge/challenge-banner.tsx`
`components/hackathon/challenge/challenge-toast.tsx`
`components/hackathon/dashboard/live-stats-grid.tsx`
`components/hackathon/dashboard/phase-timeline.tsx`
`components/hackathon/dashboard/quick-actions.tsx`
`components/hackathon/dashboard/room-overview-grid.tsx`
`components/hackathon/dashboard/mentor-queue-summary.tsx`
`components/hackathon/winners/winner-card.tsx`
`components/hackathon/winners/winner-grid.tsx`
`components/hackathon/winners/sponsor-report.tsx`
`components/hackathon/email/blast-composer.tsx`

### Modified Files (~20)

`lib/db/hackathon-types.ts` — new type interfaces
`lib/utils/timeline.ts` — phase-aware timeline
`lib/utils/manage-tabs.ts` — new tabs + sub-tabs
`lib/api/index.ts` — mount new route plugins
`lib/api/routes/dashboard.ts` — phase in settings body
`lib/api/routes/dashboard-judging.ts` — round/room/category params
`lib/api/routes/dashboard-results.ts` — round param
`lib/api/routes/public.ts` — categoryIds on submit
`lib/services/hackathons.ts` — team management functions
`lib/services/submissions.ts` — category entries
`lib/services/judging.ts` — round/room/category filtering
`lib/services/results.ts` — round results
`components/hackathon/countdown-badge.tsx` — phase-aware, 1s mode
`components/hackathon/submission-button.tsx` — category step
`components/hackathon/lifecycle-stepper.tsx` — phase sub-steps
`components/hackathon/judging/criteria-config.tsx` — round/category scope
`components/hackathon/judging/scoring-panel.tsx` — round criteria filter
`components/hackathon/judging/focus-scoring-view.tsx` — round criteria filter
`components/hackathon/judging/judge-assignments.tsx` — round filter
`app/(public)/e/[slug]/manage/page.tsx` — new tabs, display links
`app/(public)/e/[slug]/page.tsx` — challenge banner, mentor badge
