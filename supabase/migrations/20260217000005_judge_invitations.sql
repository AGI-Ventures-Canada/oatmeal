CREATE TABLE IF NOT EXISTS judge_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  invited_by_clerk_user_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  accepted_by_clerk_user_id text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE judge_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all" ON judge_invitations
  FOR ALL USING (false);

CREATE INDEX idx_judge_invitations_hackathon ON judge_invitations(hackathon_id);
CREATE INDEX idx_judge_invitations_token ON judge_invitations(token);
CREATE INDEX idx_judge_invitations_email_status ON judge_invitations(email, status);

CREATE UNIQUE INDEX idx_judge_invitations_unique_pending
  ON judge_invitations(hackathon_id, email)
  WHERE status = 'pending';
