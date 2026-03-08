ALTER TABLE hackathons
  ADD COLUMN IF NOT EXISTS location_latitude double precision,
  ADD COLUMN IF NOT EXISTS location_longitude double precision,
  ADD COLUMN IF NOT EXISTS require_location_verification boolean NOT NULL DEFAULT false;
