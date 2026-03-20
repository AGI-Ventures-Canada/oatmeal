-- Default new hackathons to rubric mode
-- This must be in a separate migration from the ALTER TYPE that added the 'rubric' value,
-- because PostgreSQL cannot reference a new enum value within the same transaction.
ALTER TABLE hackathons ALTER COLUMN judging_mode SET DEFAULT 'rubric';
