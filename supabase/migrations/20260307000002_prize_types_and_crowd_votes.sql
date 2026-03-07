CREATE TYPE prize_type AS ENUM ('score', 'favorite', 'crowd');

ALTER TABLE prizes ADD COLUMN IF NOT EXISTS type prize_type NOT NULL DEFAULT 'favorite';
ALTER TABLE prizes ADD COLUMN IF NOT EXISTS rank integer;

CREATE TABLE IF NOT EXISTS crowd_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  clerk_user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hackathon_id, clerk_user_id)
);

CREATE INDEX idx_crowd_votes_hackathon ON crowd_votes(hackathon_id);
CREATE INDEX idx_crowd_votes_submission ON crowd_votes(submission_id);

ALTER TABLE crowd_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to crowd_votes" ON crowd_votes FOR ALL USING (false);
