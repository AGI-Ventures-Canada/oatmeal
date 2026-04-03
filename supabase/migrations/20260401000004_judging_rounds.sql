CREATE TABLE judging_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  name text NOT NULL,
  round_type text NOT NULL CHECK (round_type IN ('preliminary', 'finals')),
  is_active boolean NOT NULL DEFAULT false,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE judging_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to judging_rounds" ON judging_rounds FOR ALL USING (false);

ALTER TABLE judging_criteria
  ADD COLUMN round_id uuid REFERENCES judging_rounds(id) ON DELETE SET NULL,
  ADD COLUMN category_id uuid REFERENCES submission_categories(id) ON DELETE SET NULL;

ALTER TABLE judge_assignments
  ADD COLUMN round_id uuid REFERENCES judging_rounds(id) ON DELETE SET NULL,
  ADD COLUMN room_id uuid REFERENCES rooms(id) ON DELETE SET NULL;

ALTER TABLE hackathon_results
  ADD COLUMN round_id uuid REFERENCES judging_rounds(id) ON DELETE SET NULL;
