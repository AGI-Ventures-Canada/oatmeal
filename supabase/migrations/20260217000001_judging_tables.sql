CREATE TABLE IF NOT EXISTS judging_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  max_score integer NOT NULL DEFAULT 10,
  weight numeric(5,2) NOT NULL DEFAULT 1.0,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_judging_criteria_hackathon ON judging_criteria(hackathon_id);

ALTER TABLE judging_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to judging_criteria" ON judging_criteria FOR ALL USING (false);

CREATE TABLE IF NOT EXISTS judge_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  judge_participant_id uuid NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  notes text NOT NULL DEFAULT '',
  is_complete boolean NOT NULL DEFAULT false,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(judge_participant_id, submission_id)
);

CREATE INDEX idx_judge_assignments_hackathon ON judge_assignments(hackathon_id);
CREATE INDEX idx_judge_assignments_judge ON judge_assignments(judge_participant_id);
CREATE INDEX idx_judge_assignments_submission ON judge_assignments(submission_id);

ALTER TABLE judge_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to judge_assignments" ON judge_assignments FOR ALL USING (false);

CREATE TABLE IF NOT EXISTS scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_assignment_id uuid NOT NULL REFERENCES judge_assignments(id) ON DELETE CASCADE,
  criteria_id uuid NOT NULL REFERENCES judging_criteria(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(judge_assignment_id, criteria_id)
);

CREATE INDEX idx_scores_assignment ON scores(judge_assignment_id);
CREATE INDEX idx_scores_criteria ON scores(criteria_id);

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to scores" ON scores FOR ALL USING (false);
