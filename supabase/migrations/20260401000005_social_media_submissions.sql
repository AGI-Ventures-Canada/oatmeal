CREATE TABLE social_media_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  participant_id uuid NOT NULL REFERENCES hackathon_participants(id) ON DELETE CASCADE,
  url text NOT NULL,
  platform text,
  og_title text,
  og_description text,
  og_image_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE social_media_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to social_media_submissions" ON social_media_submissions FOR ALL USING (false);
