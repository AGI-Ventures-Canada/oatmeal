ALTER TABLE prize_tracks
  ADD COLUMN IF NOT EXISTS sponsor_id uuid REFERENCES hackathon_sponsors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prize_tracks_sponsor
  ON prize_tracks(sponsor_id)
  WHERE sponsor_id IS NOT NULL;
