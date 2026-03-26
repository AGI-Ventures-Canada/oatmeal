-- Add 'rubric' to judging_mode enum
ALTER TYPE judging_mode ADD VALUE IF NOT EXISTS 'rubric';

-- NOTE: Setting the default to 'rubric' must happen in a separate migration
-- because PostgreSQL cannot use a newly added enum value in the same transaction.

-- Create criterion category enum
CREATE TYPE criterion_category AS ENUM ('core', 'bonus');

-- Add category column to judging_criteria
ALTER TABLE judging_criteria
  ADD COLUMN IF NOT EXISTS category criterion_category DEFAULT 'core';

-- Create rubric_levels table
CREATE TABLE IF NOT EXISTS rubric_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  criteria_id uuid NOT NULL REFERENCES judging_criteria(id) ON DELETE CASCADE,
  level_number integer NOT NULL,
  label text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(criteria_id, level_number)
);

CREATE INDEX idx_rubric_levels_criteria ON rubric_levels(criteria_id);

ALTER TABLE rubric_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to rubric_levels" ON rubric_levels FOR ALL USING (false);
