CREATE TABLE IF NOT EXISTS hackathon_judges_display (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  organization text,
  headshot_url text,
  clerk_user_id text,
  participant_id uuid REFERENCES hackathon_participants(id) ON DELETE SET NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_judges_display_hackathon ON hackathon_judges_display(hackathon_id);

ALTER TABLE hackathon_judges_display ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to hackathon_judges_display" ON hackathon_judges_display FOR ALL USING (false);
