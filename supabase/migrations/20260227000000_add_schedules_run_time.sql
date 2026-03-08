-- Add run_time column to schedules table
-- This migration was applied directly to production and is being retroactively
-- added to the repo to reconcile migration drift.

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS run_time text;
