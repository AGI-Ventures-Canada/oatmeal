CREATE TYPE invitation_status AS ENUM (
  'pending',
  'accepted',
  'declined',
  'expired',
  'cancelled'
);

CREATE TABLE IF NOT EXISTS team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  invited_by_clerk_user_id text NOT NULL,
  status invitation_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by_clerk_user_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_invitations_team ON team_invitations(team_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_token ON team_invitations(token);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);
CREATE INDEX idx_team_invitations_pending ON team_invitations(team_id, email) WHERE status = 'pending';

ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to team_invitations" ON team_invitations FOR ALL USING (false);

