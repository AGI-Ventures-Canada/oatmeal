-- Phase 1A: Add 'criteria' to prize_type enum
ALTER TYPE prize_type ADD VALUE IF NOT EXISTS 'criteria';

-- Phase 1A: Structured prize values
ALTER TABLE prizes
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS monetary_value numeric(12,2),
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS distribution_method text,
  ADD COLUMN IF NOT EXISTS display_value text,
  ADD COLUMN IF NOT EXISTS criteria_id uuid REFERENCES judging_criteria(id) ON DELETE SET NULL;

UPDATE prizes SET display_value = value WHERE value IS NOT NULL AND display_value IS NULL;

CREATE INDEX IF NOT EXISTS idx_prizes_criteria_id ON prizes(criteria_id) WHERE criteria_id IS NOT NULL;

-- Phase 1B: Dual judging schemes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'judging_mode') THEN
    CREATE TYPE judging_mode AS ENUM ('points', 'subjective');
  END IF;
END
$$;

ALTER TABLE hackathons
  ADD COLUMN IF NOT EXISTS judging_mode judging_mode NOT NULL DEFAULT 'points';

-- Phase 1C: Judge picks table (for subjective mode)
CREATE TABLE IF NOT EXISTS judge_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  judge_participant_id uuid NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  prize_id uuid NOT NULL REFERENCES prizes(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  rank integer NOT NULL DEFAULT 1,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hackathon_id, judge_participant_id, prize_id, submission_id)
);

CREATE INDEX IF NOT EXISTS idx_judge_picks_hackathon ON judge_picks(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_judge_picks_prize ON judge_picks(prize_id);
CREATE INDEX IF NOT EXISTS idx_judge_picks_submission ON judge_picks(submission_id);

ALTER TABLE judge_picks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to judge_picks" ON judge_picks FOR ALL USING (false);

-- Phase 1D: Judge progress tracking
ALTER TABLE judge_assignments
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz;
