# Rubric-Based Scoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace weighted slider scoring with rubric-based scoring where judges select descriptive levels per criterion, and organizers control importance via Core/Bonus categories.

**Architecture:** Evolve the existing judging schema by adding a `rubric_levels` table, a `criterion_category` enum, and extending the `judging_mode` enum with `rubric`. The `scores` table stores the selected level_number. RPC functions branch on `judging_mode` for validation and calculation.

**Tech Stack:** Supabase (PostgreSQL migrations, RPC functions), TypeScript services, Elysia API routes, React components (shadcn/ui), Bun CLI

**Spec:** `docs/superpowers/specs/2026-03-20-rubric-based-scoring-design.md`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260320000001_rubric_scoring.sql` | Schema: enum, table, column additions |
| `supabase/migrations/20260320000002_rubric_rpc_functions.sql` | Updated RPC functions (submit_scores, calculate_results) |
| `lib/services/rubric-levels.ts` | CRUD service for rubric levels |
| `__tests__/services/rubric-levels.test.ts` | Unit tests for rubric level service |
| `components/hackathon/judging/rubric-level-selector.tsx` | Judge-facing rubric level picker (replaces slider) |
| `components/hackathon/judging/rubric-level-editor.tsx` | Organizer-facing rubric level CRUD |
| `packages/cli/src/commands/judging/levels-list.ts` | CLI: list rubric levels |
| `packages/cli/src/commands/judging/levels-add.ts` | CLI: add rubric level |
| `packages/cli/src/commands/judging/levels-update.ts` | CLI: update rubric level |
| `packages/cli/src/commands/judging/levels-delete.ts` | CLI: delete rubric level |

### Modified Files

| File | Changes |
|------|---------|
| `lib/db/hackathon-types.ts` | Add `RubricLevel` interface, `CriterionCategory` type, update `JudgingMode` |
| `lib/services/judging.ts` | Update `createJudgingCriteria` to auto-create levels, add `category` to inputs, update `getJudgingSetupStatus` |
| `lib/services/judging.ts` | Also update `UpdateCriteriaInput` and `updateJudgingCriteria` for `category` |
| `lib/services/results.ts` | Add test for rubric mode routing (code already handles it) |
| `lib/api/routes/dashboard-judging.ts` | Add rubric level CRUD endpoints, update criteria endpoints (create + update + PATCH for category) |
| `lib/api/routes/public.ts` | Include rubric levels in assignment detail, update score body schema minimum |
| `components/hackathon/judging/criteria-config.tsx` | Replace weight/maxScore with category toggle and rubric level editor |
| `components/hackathon/judging/scoring-panel.tsx` | Replace slider with rubric-level-selector |
| `components/hackathon/judging/judging-mode-toggle.tsx` | Add "rubric" option |
| `packages/cli/src/commands/judging/criteria-create.ts` | Replace `--weight`/`--max-score` with `--category` |
| `packages/cli/src/commands/judging/criteria-update.ts` | Add `--category`, deprecate `--weight`/`--max-score` |
| `packages/cli/src/commands/judging/criteria-list.ts` | Show category and level count |
| `__tests__/services/judging.test.ts` | Update tests for new createCriteria behavior, add setup status tests |
| `__tests__/services/results.test.ts` | Add rubric calculation tests |

---

## Task 1: Database Migration — Schema

**Files:**
- Create: `supabase/migrations/20260320000001_rubric_scoring.sql`
- Modify: `lib/db/hackathon-types.ts:354`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Add 'rubric' to judging_mode enum
ALTER TYPE judging_mode ADD VALUE IF NOT EXISTS 'rubric';

-- Default new hackathons to rubric mode
ALTER TABLE hackathons ALTER COLUMN judging_mode SET DEFAULT 'rubric';

-- Create criterion category enum
CREATE TYPE criterion_category AS ENUM ('core', 'bonus');

-- Add category column to judging_criteria
ALTER TABLE judging_criteria
  ADD COLUMN IF NOT EXISTS category criterion_category DEFAULT 'core';

-- Create rubric_levels table
CREATE TABLE IF NOT EXISTS rubric_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  criteria_id uuid NOT NULL REFERENCES judging_criteria(id) ON DELETE CASCADE,
  level_number integer NOT NULL,
  label text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(criteria_id, level_number)
);

CREATE INDEX idx_rubric_levels_criteria ON rubric_levels(criteria_id);

ALTER TABLE rubric_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to rubric_levels" ON rubric_levels FOR ALL USING (false);
```

- [ ] **Step 2: Update TypeScript types in `lib/db/hackathon-types.ts`**

Add after line 354 (`JudgingMode`):

```typescript
export type JudgingMode = "points" | "subjective" | "rubric"

export type CriterionCategory = "core" | "bonus"

export interface RubricLevel {
  id: string
  criteria_id: string
  level_number: number
  label: string
  description: string | null
  created_at: string
}
```

Update `JudgingCriteria` interface (line 288) to add:

```typescript
export interface JudgingCriteria {
  id: string
  hackathon_id: string
  name: string
  description: string | null
  max_score: number
  weight: number
  category: CriterionCategory | null
  display_order: number
  created_at: string
  updated_at: string
}
```

- [ ] **Step 3: Run migration locally**

Run: `supabase db reset`
Expected: Migration applies without errors

- [ ] **Step 4: Regenerate types**

Run: `bun update-types`
Expected: `lib/db/types.ts` updated with new table and columns

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260320000001_rubric_scoring.sql lib/db/hackathon-types.ts lib/db/types.ts
git commit -m "feat(db): add rubric_levels table and criterion_category enum"
```

---

## Task 2: Database Migration — RPC Functions

**Files:**
- Create: `supabase/migrations/20260320000002_rubric_rpc_functions.sql`

- [ ] **Step 1: Write the updated `submit_scores` RPC**

```sql
CREATE OR REPLACE FUNCTION submit_scores(
  p_judge_assignment_id UUID,
  p_scores JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  error_code TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment RECORD;
  v_hackathon RECORD;
  v_score_entry RECORD;
  v_criteria RECORD;
  v_max_level INTEGER;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT ja.*, hp.clerk_user_id
  INTO v_assignment
  FROM judge_assignments ja
  JOIN hackathon_participants hp ON hp.id = ja.judge_participant_id
  WHERE ja.id = p_judge_assignment_id
  FOR UPDATE OF ja;

  IF v_assignment IS NULL THEN
    RETURN QUERY SELECT FALSE, 'assignment_not_found'::TEXT, 'Judge assignment not found'::TEXT;
    RETURN;
  END IF;

  SELECT id, status, judging_mode
  INTO v_hackathon
  FROM hackathons
  WHERE id = v_assignment.hackathon_id;

  IF v_hackathon.status != 'judging' AND v_hackathon.status != 'active' THEN
    RETURN QUERY SELECT FALSE, 'not_judging'::TEXT, 'Hackathon is not in judging phase'::TEXT;
    RETURN;
  END IF;

  FOR v_score_entry IN SELECT * FROM jsonb_to_recordset(p_scores) AS x(criteria_id UUID, score INTEGER)
  LOOP
    SELECT id, max_score, hackathon_id
    INTO v_criteria
    FROM judging_criteria
    WHERE id = v_score_entry.criteria_id;

    IF v_criteria IS NULL THEN
      RETURN QUERY SELECT FALSE, 'criteria_not_found'::TEXT, ('Criteria not found: ' || v_score_entry.criteria_id::TEXT)::TEXT;
      RETURN;
    END IF;

    IF v_criteria.hackathon_id != v_assignment.hackathon_id THEN
      RETURN QUERY SELECT FALSE, 'criteria_mismatch'::TEXT, 'Criteria does not belong to this hackathon'::TEXT;
      RETURN;
    END IF;

    IF v_hackathon.judging_mode = 'rubric' THEN
      SELECT MAX(level_number) INTO v_max_level
      FROM rubric_levels WHERE criteria_id = v_score_entry.criteria_id;

      IF v_score_entry.score < 1 OR v_score_entry.score > COALESCE(v_max_level, 5) THEN
        RETURN QUERY SELECT FALSE, 'score_out_of_range'::TEXT,
          ('Score must be between 1 and ' || COALESCE(v_max_level, 5)::TEXT)::TEXT;
        RETURN;
      END IF;
    ELSE
      IF v_score_entry.score < 0 OR v_score_entry.score > v_criteria.max_score THEN
        RETURN QUERY SELECT FALSE, 'score_out_of_range'::TEXT,
          ('Score must be between 0 and ' || v_criteria.max_score::TEXT)::TEXT;
        RETURN;
      END IF;
    END IF;

    INSERT INTO scores (judge_assignment_id, criteria_id, score)
    VALUES (p_judge_assignment_id, v_score_entry.criteria_id, v_score_entry.score)
    ON CONFLICT (judge_assignment_id, criteria_id)
    DO UPDATE SET score = EXCLUDED.score, updated_at = v_now;
  END LOOP;

  UPDATE judge_assignments
  SET
    is_complete = true,
    completed_at = v_now,
    notes = COALESCE(p_notes, notes)
  WHERE id = p_judge_assignment_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::TEXT;
END;
$$;
```

- [ ] **Step 2: Write the updated `calculate_results` RPC**

```sql
CREATE OR REPLACE FUNCTION calculate_results(p_hackathon_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  error_code TEXT,
  error_message TEXT,
  results_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hackathon RECORD;
  v_count INTEGER;
  v_max_possible NUMERIC;
BEGIN
  SELECT id, status, judging_mode
  INTO v_hackathon
  FROM hackathons
  WHERE id = p_hackathon_id;

  IF v_hackathon IS NULL THEN
    RETURN QUERY SELECT FALSE, 'hackathon_not_found'::TEXT, 'Hackathon not found'::TEXT, 0;
    RETURN;
  END IF;

  IF v_hackathon.status NOT IN ('judging', 'completed') THEN
    RETURN QUERY SELECT FALSE, 'invalid_status'::TEXT, 'Hackathon must be in judging or completed status'::TEXT, 0;
    RETURN;
  END IF;

  DELETE FROM hackathon_results WHERE hackathon_id = p_hackathon_id;

  IF v_hackathon.judging_mode = 'rubric' THEN
    SELECT SUM(
      max_level * CASE WHEN jc.category = 'core' THEN 2 ELSE 1 END
    )
    INTO v_max_possible
    FROM judging_criteria jc
    JOIN (
      SELECT criteria_id, MAX(level_number) AS max_level
      FROM rubric_levels
      GROUP BY criteria_id
    ) rl ON rl.criteria_id = jc.id
    WHERE jc.hackathon_id = p_hackathon_id;

    WITH scored_submissions AS (
      SELECT
        ja.submission_id,
        COUNT(DISTINCT ja.id) AS judge_count,
        SUM(s.score * CASE WHEN jc.category = 'core' THEN 2 ELSE 1 END) AS total_score
      FROM judge_assignments ja
      JOIN scores s ON s.judge_assignment_id = ja.id
      JOIN judging_criteria jc ON jc.id = s.criteria_id
      WHERE ja.hackathon_id = p_hackathon_id
        AND ja.is_complete = true
      GROUP BY ja.submission_id
    ),
    top_level_counts AS (
      SELECT
        ja.submission_id,
        COUNT(*) AS top_scores
      FROM scores s
      JOIN judge_assignments ja ON ja.id = s.judge_assignment_id
      JOIN (
        SELECT criteria_id, MAX(level_number) AS max_level
        FROM rubric_levels
        GROUP BY criteria_id
      ) rl ON rl.criteria_id = s.criteria_id
      WHERE ja.hackathon_id = p_hackathon_id
        AND ja.is_complete = true
        AND s.score = rl.max_level
      GROUP BY ja.submission_id
    ),
    ranked AS (
      SELECT
        ss.submission_id,
        ss.judge_count,
        ss.total_score,
        CASE
          WHEN v_max_possible > 0 AND ss.judge_count > 0
          THEN (ss.total_score::numeric / (v_max_possible * ss.judge_count) * 100)
          ELSE 0
        END AS weighted_score,
        DENSE_RANK() OVER (
          ORDER BY (ss.total_score::numeric / NULLIF(ss.judge_count, 0)) DESC, COALESCE(tlc.top_scores, 0) DESC
        ) AS rank
      FROM scored_submissions ss
      LEFT JOIN top_level_counts tlc ON tlc.submission_id = ss.submission_id
    )
    INSERT INTO hackathon_results (hackathon_id, submission_id, rank, total_score, weighted_score, judge_count)
    SELECT p_hackathon_id, submission_id, rank, total_score, weighted_score, judge_count
    FROM ranked;

  ELSE
    WITH scored_submissions AS (
      SELECT
        ja.submission_id,
        COUNT(DISTINCT ja.id) AS judge_count,
        SUM(s.score) AS total_score,
        SUM(s.score::numeric * jc.weight) / NULLIF(SUM(jc.weight), 0) AS weighted_score
      FROM judge_assignments ja
      JOIN scores s ON s.judge_assignment_id = ja.id
      JOIN judging_criteria jc ON jc.id = s.criteria_id
      WHERE ja.hackathon_id = p_hackathon_id
        AND ja.is_complete = true
      GROUP BY ja.submission_id
    ),
    ranked AS (
      SELECT
        submission_id,
        judge_count,
        total_score,
        weighted_score,
        DENSE_RANK() OVER (ORDER BY weighted_score DESC) AS rank
      FROM scored_submissions
    )
    INSERT INTO hackathon_results (hackathon_id, submission_id, rank, total_score, weighted_score, judge_count)
    SELECT p_hackathon_id, submission_id, rank, total_score, weighted_score, judge_count
    FROM ranked;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::TEXT, v_count;
END;
$$;
```

- [ ] **Step 3: Run migration locally**

Run: `supabase db reset`
Expected: Both migrations apply without errors

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260320000002_rubric_rpc_functions.sql
git commit -m "feat(db): update submit_scores and calculate_results RPCs for rubric mode"
```

---

## Task 3: Rubric Levels Service

**Files:**
- Create: `lib/services/rubric-levels.ts`
- Create: `__tests__/services/rubric-levels.test.ts`

- [ ] **Step 1: Write failing tests for `listRubricLevels`**

In `__tests__/services/rubric-levels.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "bun:test"
import type { RubricLevel } from "@/lib/db/hackathon-types"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
} from "../lib/supabase-mock"

const {
  listRubricLevels,
  createRubricLevel,
  updateRubricLevel,
  deleteRubricLevel,
  createDefaultRubricLevels,
} = await import("@/lib/services/rubric-levels")

const mockLevel: RubricLevel = {
  id: "rl1",
  criteria_id: "c1",
  level_number: 1,
  label: "Far Below Expectations",
  description: null,
  created_at: "2026-01-01T00:00:00Z",
}

describe("Rubric Levels Service", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  describe("listRubricLevels", () => {
    it("returns levels ordered by level_number", async () => {
      const chain = createChainableMock({
        data: [mockLevel],
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await listRubricLevels("c1")
      expect(result).toHaveLength(1)
      expect(result[0].label).toBe("Far Below Expectations")
    })

    it("returns empty array on error", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "fail" },
      })
      setMockFromImplementation(() => chain)

      const result = await listRubricLevels("c1")
      expect(result).toEqual([])
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test __tests__/services/rubric-levels.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `listRubricLevels`**

In `lib/services/rubric-levels.ts`:

```typescript
import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { RubricLevel } from "@/lib/db/hackathon-types"

export const DEFAULT_RUBRIC_LEVELS = [
  { level_number: 1, label: "Far Below Expectations" },
  { level_number: 2, label: "Below Expectations" },
  { level_number: 3, label: "Meets Expectations" },
  { level_number: 4, label: "Exceeds Expectations" },
  { level_number: 5, label: "Far Exceeds Expectations" },
]

export async function listRubricLevels(
  criteriaId: string
): Promise<RubricLevel[]> {
  const client = getSupabase() as unknown as SupabaseClient
  const { data, error } = await client
    .from("rubric_levels")
    .select("*")
    .eq("criteria_id", criteriaId)
    .order("level_number")

  if (error) {
    console.error("Failed to list rubric levels:", error)
    return []
  }

  return data as unknown as RubricLevel[]
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test __tests__/services/rubric-levels.test.ts`
Expected: PASS

- [ ] **Step 5: Add failing tests for `createDefaultRubricLevels`**

Append to test file:

```typescript
  describe("createDefaultRubricLevels", () => {
    it("creates 5 default levels for a criteria", async () => {
      const chain = createChainableMock({
        data: DEFAULT_RUBRIC_LEVELS.map((l, i) => ({
          id: `rl${i}`,
          criteria_id: "c1",
          ...l,
          description: null,
          created_at: "2026-01-01T00:00:00Z",
        })),
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await createDefaultRubricLevels("c1")
      expect(result).toHaveLength(5)
    })
  })
```

Import `DEFAULT_RUBRIC_LEVELS` from the service at the top of the test file.

- [ ] **Step 6: Implement `createDefaultRubricLevels`**

Append to `lib/services/rubric-levels.ts`:

```typescript
export async function createDefaultRubricLevels(
  criteriaId: string
): Promise<RubricLevel[]> {
  const client = getSupabase() as unknown as SupabaseClient
  const rows = DEFAULT_RUBRIC_LEVELS.map((level) => ({
    criteria_id: criteriaId,
    level_number: level.level_number,
    label: level.label,
  }))

  const { data, error } = await client
    .from("rubric_levels")
    .insert(rows)
    .select()

  if (error) {
    console.error("Failed to create default rubric levels:", error)
    return []
  }

  return data as unknown as RubricLevel[]
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `bun test __tests__/services/rubric-levels.test.ts`
Expected: PASS

- [ ] **Step 8: Add failing tests for `createRubricLevel`, `updateRubricLevel`, `deleteRubricLevel`**

Append to test file:

```typescript
  describe("createRubricLevel", () => {
    it("creates a level with next sequential number", async () => {
      const selectChain = createChainableMock({
        data: [{ level_number: 5 }],
        error: null,
      })
      const insertChain = createChainableMock({
        data: { ...mockLevel, id: "rl-new", level_number: 6, label: "Outstanding" },
        error: null,
      })
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        return callCount === 1 ? selectChain : insertChain
      })

      const result = await createRubricLevel("c1", { label: "Outstanding" })
      expect(result).not.toBeNull()
      expect(result!.label).toBe("Outstanding")
    })
  })

  describe("updateRubricLevel", () => {
    it("updates label and description", async () => {
      const chain = createChainableMock({
        data: { ...mockLevel, label: "Updated Label", description: "New desc" },
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await updateRubricLevel("rl1", { label: "Updated Label", description: "New desc" })
      expect(result).not.toBeNull()
      expect(result!.label).toBe("Updated Label")
    })
  })

  describe("deleteRubricLevel", () => {
    it("deletes a level and renumbers remaining", async () => {
      const countChain = createChainableMock({ count: 5, data: null, error: null })
      const deleteChain = createChainableMock({ data: { criteria_id: "c1" }, error: null })
      const selectChain = createChainableMock({
        data: [
          { id: "rl1", level_number: 1 },
          { id: "rl3", level_number: 3 },
          { id: "rl4", level_number: 4 },
          { id: "rl5", level_number: 5 },
        ],
        error: null,
      })
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        if (callCount === 1) return countChain
        if (callCount === 2) return deleteChain
        return selectChain
      })

      const result = await deleteRubricLevel("rl2", "c1")
      expect(result.success).toBe(true)
    })

    it("rejects deletion when only 2 levels remain", async () => {
      const countChain = createChainableMock({ count: 2, data: null, error: null })
      setMockFromImplementation(() => countChain)

      const result = await deleteRubricLevel("rl1", "c1")
      expect(result.success).toBe(false)
      expect(result.error).toContain("minimum")
    })
  })
```

- [ ] **Step 9: Implement `createRubricLevel`, `updateRubricLevel`, `deleteRubricLevel`**

Append to `lib/services/rubric-levels.ts`:

```typescript
export type CreateRubricLevelInput = {
  label: string
  description?: string | null
}

export type UpdateRubricLevelInput = {
  label?: string
  description?: string | null
}

export type DeleteRubricLevelResult =
  | { success: true; levels: RubricLevel[] }
  | { success: false; error: string }

export async function createRubricLevel(
  criteriaId: string,
  input: CreateRubricLevelInput
): Promise<RubricLevel | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: existing } = await client
    .from("rubric_levels")
    .select("level_number")
    .eq("criteria_id", criteriaId)
    .order("level_number", { ascending: false })
    .limit(1)

  const nextNumber = (existing?.[0]?.level_number ?? 0) + 1

  const { data, error } = await client
    .from("rubric_levels")
    .insert({
      criteria_id: criteriaId,
      level_number: nextNumber,
      label: input.label,
      description: input.description ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to create rubric level:", error)
    return null
  }

  return data as unknown as RubricLevel
}

export async function updateRubricLevel(
  levelId: string,
  input: UpdateRubricLevelInput
): Promise<RubricLevel | null> {
  const client = getSupabase() as unknown as SupabaseClient
  const updates: Record<string, unknown> = {}
  if (input.label !== undefined) updates.label = input.label
  if (input.description !== undefined) updates.description = input.description

  const { data, error } = await client
    .from("rubric_levels")
    .update(updates)
    .eq("id", levelId)
    .select()
    .single()

  if (error) {
    console.error("Failed to update rubric level:", error)
    return null
  }

  return data as unknown as RubricLevel
}

export async function deleteRubricLevel(
  levelId: string,
  criteriaId: string
): Promise<DeleteRubricLevelResult> {
  const client = getSupabase() as unknown as SupabaseClient

  const { count } = await client
    .from("rubric_levels")
    .select("*", { count: "exact", head: true })
    .eq("criteria_id", criteriaId)

  if ((count ?? 0) <= 2) {
    return { success: false, error: "Cannot delete: minimum 2 levels required" }
  }

  const { data: deleted, error: deleteError } = await client
    .from("rubric_levels")
    .delete()
    .eq("id", levelId)
    .select("criteria_id")
    .single()

  if (deleteError || !deleted) {
    return { success: false, error: "Failed to delete rubric level" }
  }

  const { data: remaining } = await client
    .from("rubric_levels")
    .select("*")
    .eq("criteria_id", criteriaId)
    .order("level_number")

  if (remaining) {
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].level_number !== i + 1) {
        await client
          .from("rubric_levels")
          .update({ level_number: i + 1 })
          .eq("id", remaining[i].id)
      }
    }
  }

  const { data: renumbered } = await client
    .from("rubric_levels")
    .select("*")
    .eq("criteria_id", criteriaId)
    .order("level_number")

  return { success: true, levels: (renumbered ?? []) as unknown as RubricLevel[] }
}
```

- [ ] **Step 10: Run all tests**

Run: `bun test __tests__/services/rubric-levels.test.ts`
Expected: All PASS

- [ ] **Step 11: Commit**

```bash
git add lib/services/rubric-levels.ts __tests__/services/rubric-levels.test.ts
git commit -m "feat: add rubric levels service with CRUD and auto-renumbering"
```

---

## Task 4: Update Judging Service

**Files:**
- Modify: `lib/services/judging.ts:5-11,39-63,875-909`
- Modify: `__tests__/services/judging.test.ts`

- [ ] **Step 1: Write failing test for updated `createJudgingCriteria` (auto-creates rubric levels)**

Add to `__tests__/services/judging.test.ts` in the `createJudgingCriteria` describe block:

```typescript
    it("auto-creates default rubric levels when hackathon is rubric mode", async () => {
      const chain = createChainableMock({
        data: { ...mockCriteria, category: "core" },
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await createJudgingCriteria("h1", {
        name: "Innovation",
        category: "core",
        hackathonJudgingMode: "rubric",
      })
      expect(result).not.toBeNull()
    })
```

- [ ] **Step 2: Update `CreateCriteriaInput` and `createJudgingCriteria`**

In `lib/services/judging.ts`, update the input type (line 5):

```typescript
export type CreateCriteriaInput = {
  name: string
  description?: string | null
  maxScore?: number
  weight?: number
  category?: "core" | "bonus"
  displayOrder?: number
  hackathonJudgingMode?: string
}
```

Update `createJudgingCriteria` function (line 39) to add after the insert:

```typescript
export async function createJudgingCriteria(
  hackathonId: string,
  input: CreateCriteriaInput
): Promise<JudgingCriteria | null> {
  const client = getSupabase() as unknown as SupabaseClient
  const { data, error } = await client
    .from("judging_criteria")
    .insert({
      hackathon_id: hackathonId,
      name: input.name,
      description: input.description ?? null,
      max_score: input.maxScore ?? 10,
      weight: input.weight ?? 1.0,
      category: input.category ?? "core",
      display_order: input.displayOrder ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to create judging criteria:", error)
    return null
  }

  const criteria = data as unknown as JudgingCriteria

  if (input.hackathonJudgingMode === "rubric") {
    const { createDefaultRubricLevels } = await import("@/lib/services/rubric-levels")
    await createDefaultRubricLevels(criteria.id)
  }

  return criteria
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `bun test __tests__/services/judging.test.ts`
Expected: PASS

- [ ] **Step 4: Write failing test for updated `getJudgingSetupStatus`**

Add new describe block:

```typescript
  describe("getJudgingSetupStatus (rubric)", () => {
    it("returns hasCriteria and allCriteriaHaveLevels", async () => {
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        if (callCount === 1) {
          return createChainableMock({ data: [{ id: "c1" }], error: null })
        }
        if (callCount === 2) {
          return createChainableMock({ data: [{ id: "j1" }], error: null })
        }
        if (callCount === 3) {
          return createChainableMock({ data: [{ id: "s1" }], error: null })
        }
        if (callCount === 4) {
          return createChainableMock({ data: [{ submission_id: "s1" }], error: null })
        }
        return createChainableMock({ count: 3, data: null, error: null })
      })

      const result = await getJudgingSetupStatus("h1")
      expect(result.judgeCount).toBe(1)
    })
  })
```

- [ ] **Step 5: Update `getJudgingSetupStatus`**

In `lib/services/judging.ts`, update the return type (line 875) and function (line 883):

```typescript
export type JudgingSetupStatus = {
  hasCriteria: boolean
  allCriteriaHaveLevels: boolean
  judgeCount: number
  hasSubmissions: boolean
  hasUnassignedSubmissions: boolean
  isReady: boolean
}

export async function getJudgingSetupStatus(hackathonId: string): Promise<JudgingSetupStatus> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: criteria } = await client
    .from("judging_criteria")
    .select("id")
    .eq("hackathon_id", hackathonId)

  const hasCriteria = (criteria?.length ?? 0) > 0

  const { data: judges } = await client
    .from("hackathon_participants")
    .select("id")
    .eq("hackathon_id", hackathonId)
    .eq("role", "judge")

  const judgeCount = judges?.length ?? 0

  const { data: submissions } = await client
    .from("submissions")
    .select("id")
    .eq("hackathon_id", hackathonId)
    .eq("status", "submitted")

  const hasSubmissions = (submissions?.length ?? 0) > 0

  const { data: assignments } = await client
    .from("judge_assignments")
    .select("submission_id")
    .eq("hackathon_id", hackathonId)

  const assignedSubmissionIds = new Set((assignments ?? []).map(a => a.submission_id))
  const hasUnassignedSubmissions = (submissions ?? []).some(s => !assignedSubmissionIds.has(s.id))

  let allCriteriaHaveLevels = true
  if (hasCriteria && criteria) {
    const criteriaIds = criteria.map(c => c.id)
    const { data: levels } = await client
      .from("rubric_levels")
      .select("criteria_id")
      .in("criteria_id", criteriaIds)

    if (levels) {
      const countMap = new Map<string, number>()
      for (const l of levels) {
        countMap.set(l.criteria_id, (countMap.get(l.criteria_id) ?? 0) + 1)
      }
      allCriteriaHaveLevels = criteriaIds.every(id => (countMap.get(id) ?? 0) >= 2)
    } else {
      allCriteriaHaveLevels = false
    }
  }

  const isReady = hasCriteria && allCriteriaHaveLevels && judgeCount > 0 && hasSubmissions && !hasUnassignedSubmissions

  return { hasCriteria, allCriteriaHaveLevels, judgeCount, hasSubmissions, hasUnassignedSubmissions, isReady }
}
```

- [ ] **Step 6: Run tests**

Run: `bun test __tests__/services/judging.test.ts`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add lib/services/judging.ts __tests__/services/judging.test.ts
git commit -m "feat: update judging service for rubric mode (auto-create levels, setup status)"
```

---

## Task 5: Add Results Service Test Coverage for Rubric Mode

**Files:**
- Modify: `__tests__/services/results.test.ts`

Note: The existing `calculateResults` code already routes rubric mode to the RPC correctly (it only special-cases `subjective`, everything else goes to RPC). No code change needed — just add test coverage.

- [ ] **Step 1: Add test for rubric mode routing**

In `__tests__/services/results.test.ts`, add:

```typescript
  it("routes rubric mode to RPC calculate_results", async () => {
    setMockFromImplementation(() =>
      createChainableMock({ data: { judging_mode: "rubric" }, error: null })
    )
    setMockRpcImplementation(() => ({
      data: [{ success: true, results_count: 3 }],
      error: null,
    }))

    const result = await calculateResults("h1")
    expect(result.success).toBe(true)
    if (result.success) expect(result.count).toBe(3)
  })
```

- [ ] **Step 2: Run tests**

Run: `bun test __tests__/services/results.test.ts`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add __tests__/services/results.test.ts
git commit -m "test: add rubric mode coverage for calculateResults"
```

---

## Task 6: Dashboard API Routes — Rubric Level CRUD

**Files:**
- Modify: `lib/api/routes/dashboard-judging.ts`

- [ ] **Step 1: Add rubric level endpoints**

Follow the existing auth pattern from `dashboard-judging.ts`: the `.derive()` block at the top already resolves `principal` via `resolvePrincipal(request)`. Each route calls `requirePrincipal(principal, [...], [...])` and `checkHackathonOrganizer(params.id, principal.tenantId)`. Use Elysia `t.Object()` body schemas for POST/PATCH.

After the existing criteria delete route (around line 210), add:

```typescript
  .get("/hackathons/:id/judging/criteria/:criteriaId/levels", async ({ principal, params }) => {
    requirePrincipal(principal, ["user", "api_key"], ["hackathons:read"])

    const { checkHackathonOrganizer } = await import("@/lib/services/public-hackathons")
    const result = await checkHackathonOrganizer(params.id, principal.tenantId)
    if (result.status === "not_found") return new Response(JSON.stringify({ error: "Hackathon not found" }), { status: 404, headers: { "Content-Type": "application/json" } })
    if (result.status === "not_authorized") return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403, headers: { "Content-Type": "application/json" } })

    const { listRubricLevels } = await import("@/lib/services/rubric-levels")
    const levels = await listRubricLevels(params.criteriaId)
    return { levels }
  }, {
    detail: { summary: "List rubric levels", description: "List all rubric levels for a criterion. Requires hackathons:read scope." },
  })
  .post("/hackathons/:id/judging/criteria/:criteriaId/levels", async ({ principal, params, body }) => {
    requirePrincipal(principal, ["user", "api_key"], ["hackathons:write"])

    const { checkHackathonOrganizer } = await import("@/lib/services/public-hackathons")
    const result = await checkHackathonOrganizer(params.id, principal.tenantId)
    if (result.status === "not_found") return new Response(JSON.stringify({ error: "Hackathon not found" }), { status: 404, headers: { "Content-Type": "application/json" } })
    if (result.status === "not_authorized") return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403, headers: { "Content-Type": "application/json" } })

    const { createRubricLevel } = await import("@/lib/services/rubric-levels")
    const level = await createRubricLevel(params.criteriaId, { label: body.label.trim(), description: body.description })
    if (!level) return new Response(JSON.stringify({ error: "Failed to create level" }), { status: 500, headers: { "Content-Type": "application/json" } })

    await logAudit({ hackathonId: params.id, action: "rubric_level.created", actorId: principal.id, details: { criteriaId: params.criteriaId, levelId: level.id } })
    return { level }
  }, {
    detail: { summary: "Add rubric level", description: "Add a new rubric level to a criterion. Requires hackathons:write scope." },
    body: t.Object({
      label: t.String({ minLength: 1, description: "Level label (e.g., 'Exceeds Expectations')" }),
      description: t.Optional(t.String({ description: "Optional longer explanation of this level" })),
    }),
  })
  .patch("/hackathons/:id/judging/criteria/:criteriaId/levels/:levelId", async ({ principal, params, body }) => {
    requirePrincipal(principal, ["user", "api_key"], ["hackathons:write"])

    const { checkHackathonOrganizer } = await import("@/lib/services/public-hackathons")
    const result = await checkHackathonOrganizer(params.id, principal.tenantId)
    if (result.status === "not_found") return new Response(JSON.stringify({ error: "Hackathon not found" }), { status: 404, headers: { "Content-Type": "application/json" } })
    if (result.status === "not_authorized") return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403, headers: { "Content-Type": "application/json" } })

    const { updateRubricLevel } = await import("@/lib/services/rubric-levels")
    const level = await updateRubricLevel(params.levelId, { label: body.label, description: body.description })
    if (!level) return new Response(JSON.stringify({ error: "Failed to update level" }), { status: 500, headers: { "Content-Type": "application/json" } })

    await logAudit({ hackathonId: params.id, action: "rubric_level.updated", actorId: principal.id, details: { levelId: params.levelId } })
    return { level }
  }, {
    detail: { summary: "Update rubric level", description: "Edit a rubric level's label or description. Requires hackathons:write scope." },
    body: t.Object({
      label: t.Optional(t.String({ minLength: 1 })),
      description: t.Optional(t.String()),
    }),
  })
  .delete("/hackathons/:id/judging/criteria/:criteriaId/levels/:levelId", async ({ principal, params }) => {
    requirePrincipal(principal, ["user", "api_key"], ["hackathons:write"])

    const { checkHackathonOrganizer } = await import("@/lib/services/public-hackathons")
    const authResult = await checkHackathonOrganizer(params.id, principal.tenantId)
    if (authResult.status === "not_found") return new Response(JSON.stringify({ error: "Hackathon not found" }), { status: 404, headers: { "Content-Type": "application/json" } })
    if (authResult.status === "not_authorized") return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403, headers: { "Content-Type": "application/json" } })

    const { deleteRubricLevel } = await import("@/lib/services/rubric-levels")
    const result = await deleteRubricLevel(params.levelId, params.criteriaId)
    if (!result.success) return new Response(JSON.stringify({ error: result.error }), { status: 400, headers: { "Content-Type": "application/json" } })

    await logAudit({ hackathonId: params.id, action: "rubric_level.deleted", actorId: principal.id, details: { criteriaId: params.criteriaId, levelId: params.levelId } })
    return { levels: result.levels }
  }, {
    detail: { summary: "Delete rubric level", description: "Delete a rubric level (minimum 2 enforced). Requires hackathons:write scope." },
  })
```

- [ ] **Step 2: Update criteria create endpoint to pass hackathon judging mode**

In the existing POST `/hackathons/:id/judging/criteria` handler, fetch the hackathon's judging_mode and pass it to `createJudgingCriteria`:

```typescript
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("judging_mode")
      .eq("id", params.id)
      .single()

    const criteria = await createJudgingCriteria(params.id, {
      ...input,
      hackathonJudgingMode: hackathon?.judging_mode,
    })
```

- [ ] **Step 3: Update criteria create endpoint to accept `category`**

Add `category` to the body schema and pass it through to the service.

- [ ] **Step 4: Update PATCH criteria endpoint to accept `category`**

In `lib/services/judging.ts`, update `UpdateCriteriaInput` (line 13) to include `category`:

```typescript
export type UpdateCriteriaInput = {
  name?: string
  description?: string | null
  maxScore?: number
  weight?: number
  category?: "core" | "bonus"
  displayOrder?: number
}
```

Update `updateJudgingCriteria` to pass `category` through to the database update.

In `lib/api/routes/dashboard-judging.ts`, update the PATCH `/hackathons/:id/judging/criteria/:criteriaId` body schema to accept `category` and pass it to the service.

- [ ] **Step 5: Run lint and build**

Run: `bun lint && bun run build`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add lib/api/routes/dashboard-judging.ts lib/services/judging.ts
git commit -m "feat(api): add rubric level CRUD endpoints and category support"
```

---

## Task 7: Public API Routes — Include Rubric Levels in Assignment Detail

**Files:**
- Modify: `lib/api/routes/public.ts:976-1074`

- [ ] **Step 1: Update assignment detail endpoint to include rubric levels**

In the GET `/judging/assignments/:assignmentId` handler, after fetching the assignment detail, also fetch rubric levels for each criterion:

```typescript
    const { listRubricLevels } = await import("@/lib/services/rubric-levels")

    const criteriaWithLevels = await Promise.all(
      detail.criteria.map(async (c) => ({
        ...c,
        rubricLevels: await listRubricLevels(c.id),
      }))
    )

    return { ...detail, criteria: criteriaWithLevels }
```

- [ ] **Step 2: Update score submission body schema**

In the POST `/judging/assignments/:assignmentId/scores` handler (around line 1064-1072), the Elysia body schema hardcodes `minimum: 0` for scores. Remove the `minimum` constraint from the Elysia schema since the RPC now handles mode-specific validation (0 for legacy, 1 for rubric):

```typescript
body: t.Object({
  scores: t.Array(
    t.Object({
      criteriaId: t.String(),
      score: t.Number(),
    })
  ),
  notes: t.Optional(t.String()),
}),
```

- [ ] **Step 3: Run build**

Run: `bun run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add lib/api/routes/public.ts
git commit -m "feat(api): include rubric levels in judge assignment detail"
```

---

## Task 8: Judging Mode Toggle — Add Rubric Option

**Files:**
- Modify: `components/hackathon/judging/judging-mode-toggle.tsx`

- [ ] **Step 1: Add "rubric" to mode options**

Update the radio group options to include rubric mode. The existing component at line 16-78 has radio items for "points" and "subjective". Add a third:

```typescript
<RadioGroupItem value="rubric" id="rubric" />
<Label htmlFor="rubric">Rubric</Label>
<p className="text-sm text-muted-foreground">
  Judges select from defined levels per criterion (e.g., "Meets Expectations")
</p>
```

- [ ] **Step 2: Run build**

Run: `bun run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/hackathon/judging/judging-mode-toggle.tsx
git commit -m "feat(ui): add rubric option to judging mode toggle"
```

---

## Task 9: Rubric Level Editor Component (Organizer)

**Files:**
- Create: `components/hackathon/judging/rubric-level-editor.tsx`

- [ ] **Step 1: Create the rubric level editor component**

This component is used inside `criteria-config.tsx` when the hackathon is in rubric mode. It shows an expandable list of levels per criterion with edit/delete/add capabilities.

```typescript
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Plus, Pencil, Check, X } from "lucide-react"

type RubricLevel = {
  id: string
  level_number: number
  label: string
  description: string | null
}

type Props = {
  hackathonId: string
  criteriaId: string
  levels: RubricLevel[]
  onLevelsChange: (levels: RubricLevel[]) => void
}

export function RubricLevelEditor({ hackathonId, criteriaId, levels, onLevelsChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [newLabel, setNewLabel] = useState("")
  const [newDescription, setNewDescription] = useState("")

  // Implementation uses fetch to the rubric level API endpoints
  // and calls onLevelsChange with updated levels after each operation
  // Full implementation follows shadcn patterns from criteria-config.tsx
}
```

Build out the full component with:
- List of levels (highest number first) with label and description
- Edit button per level (inline edit with save/cancel)
- Delete button per level (disabled if only 2 remain)
- "Add Level" button at bottom
- All operations call the API endpoints from Task 6 and update parent via `onLevelsChange`

- [ ] **Step 2: Run build**

Run: `bun run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/hackathon/judging/rubric-level-editor.tsx
git commit -m "feat(ui): add rubric level editor component for organizers"
```

---

## Task 10: Update Criteria Config for Rubric Mode

**Files:**
- Modify: `components/hackathon/judging/criteria-config.tsx`

- [ ] **Step 1: Replace weight/maxScore inputs with category toggle and rubric editor**

When the hackathon is in rubric mode:
- Replace the weight number input with a Core/Bonus toggle (using shadcn `Select` or `RadioGroup`)
- Remove the maxScore input
- Add an expandable section showing `RubricLevelEditor` for each criterion
- Pass `hackathonJudgingMode` to the criteria create API call

When the hackathon is in legacy points mode:
- Keep existing weight and maxScore inputs (backward compatible)

- [ ] **Step 2: Run build**

Run: `bun run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/hackathon/judging/criteria-config.tsx
git commit -m "feat(ui): update criteria config with category toggle and rubric levels"
```

---

## Task 11: Rubric Level Selector Component (Judge)

**Files:**
- Create: `components/hackathon/judging/rubric-level-selector.tsx`

- [ ] **Step 1: Create the rubric level selector component**

This replaces the slider in the scoring panel. Shows rubric levels as a vertical selectable list per criterion.

```typescript
"use client"

import { cn } from "@/lib/utils"

type RubricLevel = {
  id: string
  level_number: number
  label: string
  description: string | null
}

type Props = {
  levels: RubricLevel[]
  selectedLevel: number | null
  onSelect: (levelNumber: number | null) => void
}

export function RubricLevelSelector({ levels, selectedLevel, onSelect }: Props) {
  const sortedLevels = [...levels].sort((a, b) => b.level_number - a.level_number)

  return (
    <div className="flex flex-col gap-1">
      {sortedLevels.map((level) => (
        <button
          key={level.id}
          type="button"
          onClick={() =>
            onSelect(selectedLevel === level.level_number ? null : level.level_number)
          }
          className={cn(
            "flex items-start gap-3 rounded-md border p-3 text-left transition-colors",
            selectedLevel === level.level_number
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-muted/50"
          )}
        >
          <span className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
            selectedLevel === level.level_number
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}>
            {level.level_number}
          </span>
          <div className="flex-1">
            <div className="text-sm font-medium">{level.label}</div>
            {level.description && (
              <div className="mt-0.5 text-xs text-muted-foreground">{level.description}</div>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Run build**

Run: `bun run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/hackathon/judging/rubric-level-selector.tsx
git commit -m "feat(ui): add rubric level selector component for judges"
```

---

## Task 12: Update Scoring Panel for Rubric Mode

**Files:**
- Modify: `components/hackathon/judging/scoring-panel.tsx`

- [ ] **Step 1: Replace slider with rubric level selector when levels are present**

In the scoring panel, check if the criterion has `rubricLevels` attached. If so, render `RubricLevelSelector` instead of the slider input. The score value maps to the selected `level_number`.

Update the `CriterionWithScore` type to include optional `rubricLevels`:

```typescript
type CriterionWithScore = {
  id: string
  name: string
  description: string | null
  max_score: number
  currentScore: number | null
  rubricLevels?: RubricLevel[]
}
```

In the scoring UI (around line 243), conditionally render:

```typescript
{criterion.rubricLevels && criterion.rubricLevels.length > 0 ? (
  <RubricLevelSelector
    levels={criterion.rubricLevels}
    selectedLevel={scores[criterion.id] ?? null}
    onSelect={(level) => setScores(prev => ({
      ...prev,
      [criterion.id]: level,
    }))}
  />
) : (
  // existing slider code
)}
```

- [ ] **Step 2: Run build**

Run: `bun run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/hackathon/judging/scoring-panel.tsx
git commit -m "feat(ui): use rubric level selector in scoring panel when available"
```

---

## Task 13: CLI Commands — Rubric Levels

**Files:**
- Create: `packages/cli/src/commands/judging/levels-list.ts`
- Create: `packages/cli/src/commands/judging/levels-add.ts`
- Create: `packages/cli/src/commands/judging/levels-update.ts`
- Create: `packages/cli/src/commands/judging/levels-delete.ts`
- Modify: `packages/cli/src/commands/judging/criteria-create.ts`
- Modify: `packages/cli/src/commands/judging/criteria-update.ts`
- Modify: `packages/cli/src/commands/judging/criteria-list.ts`

- [ ] **Step 1: Create `levels-list.ts`**

Follow the pattern from `criteria-list.ts`. Fetch from `GET /api/dashboard/hackathons/{id}/judging/criteria/{criteriaId}/levels` and display in a table.

- [ ] **Step 2: Create `levels-add.ts`**

Accept `--label` and optional `--description` flags. POST to the levels endpoint.

- [ ] **Step 3: Create `levels-update.ts`**

Accept `--level-id`, optional `--label`, optional `--description`. PATCH to the levels endpoint.

- [ ] **Step 4: Create `levels-delete.ts`**

Accept `--level-id`. DELETE to the levels endpoint. Show updated levels list after deletion.

- [ ] **Step 5: Update `criteria-create.ts`**

Replace `--weight` and `--max-score` flags with `--category core|bonus` flag (default: `core`).

- [ ] **Step 6: Update `criteria-update.ts`**

Add `--category core|bonus` flag. Deprecate `--weight` and `--max-score` (keep them but show deprecation warning).

- [ ] **Step 7: Update `criteria-list.ts`**

Show category and level count instead of weight and max_score columns.

- [ ] **Step 8: Run CLI tests**

Run: `bun cli:test`
Expected: All PASS (update existing tests if they reference weight/maxScore)

- [ ] **Step 9: Run CLI build**

Run: `bun cli:build`
Expected: Produces `packages/cli/dist/cli.mjs` without errors

- [ ] **Step 10: Commit**

```bash
git add packages/cli/src/commands/judging/
git commit -m "feat(cli): add rubric level commands and update criteria commands for categories"
```

---

## Task 14: Update Test Scenarios

**Files:**
- Modify: `scripts/test-scenarios/judging.ts`
- Modify: `scripts/test-scenarios/judging-in-progress.ts`
- Modify: `scripts/test-scenarios/results-ready.ts`

- [ ] **Step 1: Update judging scenarios to use rubric mode**

In each scenario file:
- Set `judging_mode: "rubric"` on the hackathon
- Create `rubric_levels` rows for each criterion (5 default levels)
- Set `category: "core"` or `"bonus"` on criteria instead of relying on `weight`

- [ ] **Step 2: Run a scenario to verify**

Run: `bun run scripts/test-scenario.ts judging`
Expected: Scenario seeds successfully with rubric levels visible in Supabase Studio

- [ ] **Step 3: Commit**

```bash
git add scripts/test-scenarios/
git commit -m "feat(scripts): update judging test scenarios for rubric mode"
```

---

## Task 15: Full Verification

- [ ] **Step 1: Run linter**

Run: `bun lint`
Expected: No errors

- [ ] **Step 2: Run build**

Run: `bun run build`
Expected: No errors

- [ ] **Step 3: Run unit tests**

Run: `bun test`
Expected: All PASS

- [ ] **Step 4: Run integration tests**

Run: `bun test:integration`
Expected: All PASS

- [ ] **Step 5: Run CLI build**

Run: `bun cli:build`
Expected: Produces dist without errors

- [ ] **Step 6: Run CLI tests**

Run: `bun cli:test`
Expected: All PASS

- [ ] **Step 7: Commit any remaining fixes**

If any verification step failed, fix and commit.
