DROP INDEX IF EXISTS idx_team_invitations_pending;

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_invitations_unique_pending
  ON team_invitations(team_id, email)
  WHERE status = 'pending';
