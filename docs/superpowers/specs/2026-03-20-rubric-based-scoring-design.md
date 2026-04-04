# Rubric-Based Scoring Design

**Date:** 2026-03-20
**Status:** Approved
**Replaces:** Weighted slider-based scoring (points mode)

## Overview

Replace the current weighted slider scoring system with rubric-based scoring. Each criterion gets defined levels with descriptive labels (e.g., "Far Below Expectations" → "Far Exceeds Expectations") instead of raw numeric sliders. Organizers control criterion importance via simple categories (Core = 2x, Bonus = 1x) instead of arbitrary weight numbers.

Subjective mode (prize-based ranking) is untouched.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Default levels | 5, anchored around expectations | Provides enough granularity without overwhelming judges |
| Custom level count | Organizer can add/delete levels (minimum 2) | Flexibility for different hackathon formats |
| Level labels | Auto-generated defaults, organizer can edit | Low friction setup with customization option |
| Criterion importance | Core (2x) / Bonus (1x) categories | Simpler than arbitrary weights, still allows prioritization |
| Tiebreaker | Count of highest-level scores | Rewards excellence over consistency |
| Subjective mode | Kept as-is | Clean separation, no unnecessary coupling |
| Architecture | Evolve existing schema (Approach A) | Minimal migration risk, backward compatible |
| Judging mode | Add `rubric` to `judging_mode` enum | Explicit mode detection, no fragile data-existence heuristics |
| Level renumbering | Auto-renumber after deletion | Prevents gaps that distort score calculations |

## Data Model

### New Table: `rubric_levels`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| criteria_id | uuid | FK → judging_criteria.id, ON DELETE CASCADE |
| level_number | integer | Position (1 = lowest, N = highest) |
| label | text | NOT NULL |
| description | text | Nullable, optional longer explanation |
| created_at | timestamptz | Default now() |

**Unique constraint:** `(criteria_id, level_number)`

### Changes to `judging_criteria`

| Change | Detail |
|--------|--------|
| Add `category` | enum type `criterion_category`: `core` \| `bonus`, default `core` |
| Deprecate `weight` | Keep column for legacy hackathons, ignored for rubric-based hackathons |
| Deprecate `max_score` | Derived from number of rubric levels, ignored for rubric-based hackathons |

### Changes to `scores`

No schema change. The `score` column stores the selected `level_number`. Validation changes from `0 <= score <= max_score` to `1 <= score <= max_level_number_for_criteria`.

The existing schema-level CHECK constraint (`score >= 0`) is kept for backward compatibility with legacy hackathons. The stricter rubric validation (`score >= 1`) is enforced in the `submit_scores()` RPC function, which checks `judging_mode = 'rubric'` before applying rubric-specific rules.

### Changes to `hackathons`

Add `rubric` to the existing `judging_mode` enum (`points` | `subjective` | `rubric`). New hackathons default to `rubric`. Existing hackathons with `points` mode continue using the legacy weighted formula. The UI and API use this enum — not data-existence heuristics — to determine which scoring path to use.

### Default Rubric Levels

Auto-created when organizer adds a criterion:

| Level | Label |
|-------|-------|
| 1 | Far Below Expectations |
| 2 | Below Expectations |
| 3 | Meets Expectations |
| 4 | Exceeds Expectations |
| 5 | Far Exceeds Expectations |

Organizers can:
- Edit labels and descriptions for any level
- Delete levels (minimum 2 enforced) — remaining levels are automatically renumbered sequentially (e.g., deleting level 3 from 1-5 results in levels 1-4, not 1,2,4,5)
- Add new levels (appended at next sequential number)

## Scoring & Results Calculation

### Judge Scoring Flow

1. Judge opens assignment — sees submission details alongside scoring panel
2. For each criterion, a vertical list of rubric levels is displayed (highest to lowest)
3. Each level shows: level number, label, and description (if provided)
4. Judge clicks/taps to select one level per criterion
5. Clicking a selected level deselects it
6. Notes field at bottom with auto-save (unchanged)
7. "Submit Scores" validates all criteria have a selection, marks assignment complete

Judges see rubric levels but do NOT see criterion categories (Core/Bonus). This matches the existing philosophy where weights were organizer-facing only.

### Results Calculation

Updated `calculate_results()` formula:

```
For each submission:
  total = SUM(score * multiplier) across all criteria and all judges

  where multiplier = 2 if category is "core", 1 if category is "bonus"
```

Rank by `total DESC`.

### Result Storage

| Column | Rubric mode | Legacy points mode |
|--------|------------|-------------------|
| `total_score` | Raw sum: `SUM(score * multiplier)` across all judges and criteria | Same as before: raw sum of weighted scores |
| `weighted_score` | Normalized percentage: `total_score / (max_possible_score * judge_count) * 100` | Same as before: `SUM(score * weight) / SUM(weight)` |
| `judge_count` | Number of judges who scored this submission | Unchanged |

`max_possible_score` = `SUM(max_level_number * multiplier)` across all criteria. This normalization ensures `weighted_score` is always 0-100 regardless of how many judges, criteria, or levels a hackathon has.

### Tiebreaker

When two submissions have the same total:

1. Count how many highest-level scores each submission received across all judges and all criteria
2. "Highest level" = the maximum `level_number` for that specific criterion (not always 5 — an organizer may have customized the count)
3. Submission with more highest-level scores ranks higher
4. If still tied — true tie, same rank displayed

Pseudocode for the tiebreaker in `calculate_results()`:

```sql
-- After computing totals, add tiebreaker count
top_level_counts AS (
  SELECT
    s.submission_id,
    COUNT(*) AS top_scores
  FROM scores s
  JOIN judge_assignments ja ON ja.id = s.judge_assignment_id
  JOIN judging_criteria jc ON jc.id = s.criteria_id
  JOIN (
    SELECT criteria_id, MAX(level_number) AS max_level
    FROM rubric_levels
    GROUP BY criteria_id
  ) rl ON rl.criteria_id = s.criteria_id
  WHERE ja.hackathon_id = target_hackathon_id
    AND s.score = rl.max_level
  GROUP BY s.submission_id
)
-- Final ranking uses ORDER BY total DESC, top_scores DESC
-- DENSE_RANK() applied after this ordering
-- True ties (same total AND same top_scores) share the same rank
```

## Organizer Experience

### Creating Criteria

1. Organizer clicks "Add Criterion" — enters name
2. System auto-creates criterion with 5 default rubric levels, category = `core`
3. Criterion appears showing: name, category badge (Core/Bonus), level count

### Editing Criteria

- Name and category — inline editable, category is a toggle/dropdown
- Rubric levels — expandable section:
  - Edit label and description for any level
  - Delete a level (minimum 2 enforced)
  - Add a new level (next sequential number)
  - No reorder needed — level numbers define their meaning

### What Organizers No Longer See

- Weight input (replaced by Core/Bonus category)
- Max score input (derived from level count)
- Slider preview (replaced by rubric level preview)

### Setup Status Validation

Updated `getJudgingSetupStatus` return type for rubric mode:

```typescript
type JudgingSetupStatus = {
  hasCriteria: boolean          // at least one criterion exists
  allCriteriaHaveLevels: boolean // every criterion has >= 2 rubric levels
  judgeCount: number            // number of assigned judges
  hasSubmissions: boolean       // at least one submission exists
  hasUnassignedSubmissions: boolean // submissions without judge assignments
  isReady: boolean              // all above conditions met
}
```

`isReady` is true when: `hasCriteria && allCriteriaHaveLevels && judgeCount > 0 && hasSubmissions && !hasUnassignedSubmissions`

## Judge Experience

### Scoring Panel

- Rubric levels displayed as a vertical selectable list per criterion
- Highest level at top, lowest at bottom
- Selected level is highlighted
- No partial saves — scores held in component state until submission
- Mobile: levels stack naturally as vertical list

### Focus Scoring View

Same navigation between assignments. Only change is the scoring widget — rubric level selector instead of slider.

### Anonymous Judging

Unchanged — hides team names when enabled.

## API Changes

### Dashboard Judging Routes (Organizer)

| Method | Route | Change |
|--------|-------|--------|
| POST | `/hackathons/:id/judging/criteria` | Auto-creates 5 default rubric levels; accepts `category` param |
| PATCH | `/hackathons/:id/judging/criteria/:criteriaId` | Accepts `category` field |
| GET | `/hackathons/:id/judging/criteria/:criteriaId/levels` | **New** — list rubric levels |
| POST | `/hackathons/:id/judging/criteria/:criteriaId/levels` | **New** — add a level |
| PATCH | `/hackathons/:id/judging/criteria/:criteriaId/levels/:levelId` | **New** — edit label/description |
| DELETE | `/hackathons/:id/judging/criteria/:criteriaId/levels/:levelId` | **New** — delete level (min 2 enforced) |

#### Rubric Level Endpoint Schemas

**GET `/criteria/:criteriaId/levels`**
Response: `{ levels: RubricLevel[] }` — sorted by `level_number` ascending

**POST `/criteria/:criteriaId/levels`**
Request: `{ label: string, description?: string }`
`level_number` is auto-assigned as `max(existing level_numbers) + 1`
Response: `{ level: RubricLevel }`

**PATCH `/criteria/:criteriaId/levels/:levelId`**
Request: `{ label?: string, description?: string }`
Response: `{ level: RubricLevel }`

**DELETE `/criteria/:criteriaId/levels/:levelId`**
Validates minimum 2 levels remain. Auto-renumbers remaining levels sequentially.
Response: `{ levels: RubricLevel[] }` — returns updated full list after renumbering

```typescript
type RubricLevel = {
  id: string
  criteria_id: string
  level_number: number
  label: string
  description: string | null
  created_at: string
}
```

### Judge Routes

| Method | Route | Change |
|--------|-------|--------|
| GET | `/e/:slug/judge/assignments/:assignmentId` | Response includes rubric levels nested under criteria |
| POST | `/e/:slug/judge/assignments/:assignmentId/scores` | Validation: `1 <= score <= max_level_number` |

### Results Routes

No route changes. Internal calculation logic updated.

## CLI Changes

### Modified Commands

| Command | Change |
|---------|--------|
| `criteria-create` | Add `--category core\|bonus` flag (default: core); remove `--weight`, `--max-score` |
| `criteria-update` | Add `--category` flag; deprecate `--weight`, `--max-score` |
| `criteria-list` | Show category and level count instead of weight and max_score |

### New Commands

| Command | Purpose |
|---------|---------|
| `levels-list` | List rubric levels for a criterion |
| `levels-add` | Add a rubric level to a criterion |
| `levels-update` | Edit a rubric level's label/description |
| `levels-delete` | Delete a rubric level (min 2 enforced) |

New CLI commands live in `packages/cli/src/commands/judging/` alongside existing `criteria-*` commands.

### Unchanged Commands

All judge assignment, invitation, results, and subjective/pick commands remain unchanged.

## Migration & Backward Compatibility

### Database Migration

1. Add `rubric` to the `judging_mode` enum type
2. Create `criterion_category` enum type (`core`, `bonus`)
3. Create `rubric_levels` table with index on `criteria_id`
4. Add `category` column to `judging_criteria` (default `core`, nullable for legacy)
5. Update `submit_scores()` RPC — check `judging_mode` to apply rubric validation (`score >= 1`, `score <= max_level_number`) or legacy validation (`score >= 0`, `score <= max_score`)
6. Update `calculate_results()` RPC — check `judging_mode` to dispatch rubric formula (with tiebreaker) or legacy weighted formula

### Legacy Handling

- Existing hackathons keep their `judging_mode = 'points'`, `weight`, and `max_score` values — everything works as before
- `calculate_results()` checks `hackathons.judging_mode`: `rubric` → new formula, `points` → legacy formula, `subjective` → existing JavaScript ranking
- No retroactive data migration — old scores stay as-is
- Old hackathons with `points` mode continue to show slider-based view
- New hackathons default to `rubric` mode

### Mode Detection

The `judging_mode` enum on the `hackathons` table is the single source of truth for which scoring path to use. No data-existence heuristics. The UI, API, services, and RPC functions all branch on this value.

### Test Scenarios

The `scripts/test-scenario.ts` scenarios (`judging`, `judging-in-progress`, `results-ready`) must be updated to create `rubric_levels` rows and use `judging_mode = 'rubric'` for new test data.
