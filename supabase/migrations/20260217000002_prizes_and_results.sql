CREATE TABLE IF NOT EXISTS prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  value text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_prizes_hackathon ON prizes(hackathon_id);

ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to prizes" ON prizes FOR ALL USING (false);

CREATE TABLE IF NOT EXISTS prize_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prize_id uuid NOT NULL REFERENCES prizes(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(prize_id, submission_id)
);

CREATE INDEX idx_prize_assignments_prize ON prize_assignments(prize_id);
CREATE INDEX idx_prize_assignments_submission ON prize_assignments(submission_id);

ALTER TABLE prize_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to prize_assignments" ON prize_assignments FOR ALL USING (false);

CREATE TABLE IF NOT EXISTS hackathon_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  rank integer NOT NULL,
  total_score numeric(10,2),
  weighted_score numeric(10,2),
  judge_count integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hackathon_id, submission_id)
);

CREATE INDEX idx_hackathon_results_rank ON hackathon_results(hackathon_id, rank);

ALTER TABLE hackathon_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to hackathon_results" ON hackathon_results FOR ALL USING (false);

ALTER TABLE hackathons ADD COLUMN IF NOT EXISTS anonymous_judging boolean NOT NULL DEFAULT false;
ALTER TABLE hackathons ADD COLUMN IF NOT EXISTS results_published_at timestamptz;
