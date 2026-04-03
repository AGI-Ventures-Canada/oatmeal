CREATE TABLE rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  timer_ends_at timestamptz,
  timer_remaining_ms int,
  timer_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to rooms" ON rooms FOR ALL USING (false);

CREATE TABLE room_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  has_presented boolean NOT NULL DEFAULT false,
  present_order int,
  UNIQUE(room_id, team_id)
);

ALTER TABLE room_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to room_teams" ON room_teams FOR ALL USING (false);
