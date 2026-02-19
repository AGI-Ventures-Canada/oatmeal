-- Add location fields to hackathons
CREATE TYPE location_type AS ENUM ('in_person', 'virtual');

ALTER TABLE hackathons
  ADD COLUMN location_type location_type,
  ADD COLUMN location_name text,
  ADD COLUMN location_url text;
