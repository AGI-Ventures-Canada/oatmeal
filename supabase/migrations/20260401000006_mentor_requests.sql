CREATE TYPE mentor_request_status AS ENUM ('open', 'claimed', 'resolved', 'cancelled');

CREATE TABLE mentor_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  requester_participant_id uuid NOT NULL REFERENCES hackathon_participants(id),
  category text,
  description text,
  status mentor_request_status NOT NULL DEFAULT 'open',
  claimed_by_participant_id uuid REFERENCES hackathon_participants(id),
  claimed_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mentor_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to mentor_requests" ON mentor_requests FOR ALL USING (false);
