-- Judging Simplification Migration
--
-- Merges the dual "Prize Track + Prize" model into a single "Prize" concept.
-- Prize becomes the primary judging unit with its own style, judges, and results.
-- Rounds are lifted to hackathon-level as optional global phases.
-- Reduces judging styles to 4: bucket_sort, gate_check, crowd_vote, judges_pick.

-- ============================================================
-- 1. Add judging columns to prizes table
-- ============================================================

ALTER TABLE prizes
  ADD COLUMN IF NOT EXISTS judging_style text
    CHECK (judging_style IN ('bucket_sort', 'gate_check', 'crowd_vote', 'judges_pick')),
  ADD COLUMN IF NOT EXISTS round_id uuid REFERENCES judging_rounds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignment_mode text DEFAULT 'organizer_assigned'
    CHECK (assignment_mode IN ('organizer_assigned', 'self_select')),
  ADD COLUMN IF NOT EXISTS max_picks integer DEFAULT 3;

CREATE INDEX IF NOT EXISTS idx_prizes_round ON prizes(round_id) WHERE round_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prizes_judging_style ON prizes(hackathon_id, judging_style) WHERE judging_style IS NOT NULL;

-- ============================================================
-- 2. Add prize_id to judge_assignments
-- ============================================================

ALTER TABLE judge_assignments
  ADD COLUMN IF NOT EXISTS prize_id uuid REFERENCES prizes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_judge_assignments_prize ON judge_assignments(prize_id) WHERE prize_id IS NOT NULL;

-- ============================================================
-- 3. Add prize_id to bucket_definitions (alternative to round_id)
-- ============================================================

ALTER TABLE bucket_definitions
  ADD COLUMN IF NOT EXISTS prize_id uuid REFERENCES prizes(id) ON DELETE CASCADE;

ALTER TABLE bucket_definitions ALTER COLUMN round_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bucket_definitions_prize ON bucket_definitions(prize_id) WHERE prize_id IS NOT NULL;

-- ============================================================
-- 4. Add prize_id to hackathon_results
-- ============================================================

ALTER TABLE hackathon_results
  ADD COLUMN IF NOT EXISTS prize_id uuid REFERENCES prizes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_hackathon_results_prize ON hackathon_results(prize_id) WHERE prize_id IS NOT NULL;

-- Unique index for prize-level results
CREATE UNIQUE INDEX IF NOT EXISTS hackathon_results_prize_unique
  ON hackathon_results(prize_id, submission_id)
  WHERE prize_id IS NOT NULL;

-- ============================================================
-- 5. Add prize_id to crowd_votes
-- ============================================================

ALTER TABLE crowd_votes
  ADD COLUMN IF NOT EXISTS prize_id uuid REFERENCES prizes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crowd_votes_prize ON crowd_votes(prize_id) WHERE prize_id IS NOT NULL;

-- ============================================================
-- 6. New table: round_submissions (tracks advancement)
-- ============================================================

CREATE TABLE IF NOT EXISTS round_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES judging_rounds(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  advanced_at timestamptz DEFAULT now(),
  UNIQUE(round_id, submission_id)
);

CREATE INDEX IF NOT EXISTS idx_round_submissions_round ON round_submissions(round_id);
CREATE INDEX IF NOT EXISTS idx_round_submissions_submission ON round_submissions(submission_id);

ALTER TABLE round_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to round_submissions" ON round_submissions FOR ALL USING (false);

-- ============================================================
-- 7. Make judging_mode nullable (no longer required per hackathon)
-- ============================================================

ALTER TABLE hackathons ALTER COLUMN judging_mode DROP NOT NULL;
ALTER TABLE hackathons ALTER COLUMN judging_mode DROP DEFAULT;

-- ============================================================
-- 8. Data migration: populate new columns from prize_tracks
-- ============================================================

DO $$
DECLARE
  v_track RECORD;
  v_round RECORD;
  v_prize RECORD;
  v_new_prize_id uuid;
  v_style text;
BEGIN
  -- For each prize track, find its round's style and migrate
  FOR v_track IN
    SELECT pt.id, pt.hackathon_id, pt.name, pt.description, pt.display_order
    FROM prize_tracks pt
  LOOP
    -- Get the first (usually only) round for this track
    SELECT jr.id, jr.style::text INTO v_round
    FROM judging_rounds jr
    WHERE jr.prize_track_id = v_track.id
    ORDER BY jr.display_order
    LIMIT 1;

    -- Map old styles to new styles
    v_style := CASE
      WHEN v_round.style IN ('bucket_sort') THEN 'bucket_sort'
      WHEN v_round.style IN ('gate_check', 'compliance') THEN 'gate_check'
      WHEN v_round.style IN ('crowd') THEN 'crowd_vote'
      WHEN v_round.style IN ('subjective', 'top_n', 'head_to_head', 'points') THEN 'judges_pick'
      ELSE 'bucket_sort'
    END;

    -- Check if a prize is already linked to this track
    SELECT p.id INTO v_prize
    FROM prizes p
    WHERE p.prize_track_id = v_track.id
    LIMIT 1;

    IF v_prize.id IS NOT NULL THEN
      -- Update existing prize with judging info
      UPDATE prizes SET
        judging_style = v_style,
        round_id = v_round.id
      WHERE id = v_prize.id
        AND judging_style IS NULL;

      v_new_prize_id := v_prize.id;
    ELSE
      -- Create a new prize from the track
      INSERT INTO prizes (hackathon_id, name, description, display_order, judging_style, round_id)
      VALUES (v_track.hackathon_id, v_track.name, v_track.description, v_track.display_order, v_style, v_round.id)
      RETURNING id INTO v_new_prize_id;
    END IF;

    -- Copy bucket definitions to reference the prize
    IF v_round.id IS NOT NULL THEN
      UPDATE bucket_definitions SET prize_id = v_new_prize_id
      WHERE round_id = v_round.id
        AND prize_id IS NULL;
    END IF;

    -- Update judge assignments to reference the prize
    IF v_round.id IS NOT NULL THEN
      UPDATE judge_assignments SET prize_id = v_new_prize_id
      WHERE round_id = v_round.id
        AND prize_id IS NULL;
    END IF;

    -- Update hackathon results to reference the prize
    UPDATE hackathon_results SET prize_id = v_new_prize_id
    WHERE prize_track_id = v_track.id
      AND prize_id IS NULL;
  END LOOP;
END $$;
