-- Judge-to-prize assignment table
-- Tracks which judges are assigned to which prizes, independent of submissions.
-- Per-submission judge_assignments rows are generated from this when submissions exist.

CREATE TABLE IF NOT EXISTS judge_prize_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  judge_participant_id uuid NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  prize_id uuid NOT NULL REFERENCES prizes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (judge_participant_id, prize_id)
);

ALTER TABLE judge_prize_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to judge_prize_assignments" ON judge_prize_assignments FOR ALL USING (false);

CREATE INDEX idx_judge_prize_assignments_hackathon ON judge_prize_assignments(hackathon_id);
CREATE INDEX idx_judge_prize_assignments_prize ON judge_prize_assignments(prize_id);

-- Backfill from existing judge_assignments (derive unique judge+prize pairs)
INSERT INTO judge_prize_assignments (hackathon_id, judge_participant_id, prize_id)
SELECT DISTINCT hackathon_id, judge_participant_id, prize_id
FROM judge_assignments
WHERE prize_id IS NOT NULL
ON CONFLICT DO NOTHING;
