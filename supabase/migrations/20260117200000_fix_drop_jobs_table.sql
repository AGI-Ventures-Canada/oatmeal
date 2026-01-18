-- Fix: Properly drop jobs table by first removing dependencies
-- The original migration (20260117000000) failed because agent_runs.job_id references jobs

-- 1. Drop the foreign key constraint
ALTER TABLE agent_runs DROP CONSTRAINT IF EXISTS agent_runs_job_id_fkey;

-- 2. Drop the job_id column from agent_runs (no longer needed)
ALTER TABLE agent_runs DROP COLUMN IF EXISTS job_id;

-- 3. Now we can drop the jobs table
DROP TABLE IF EXISTS jobs;

-- 4. Drop the job_status enum type
DROP TYPE IF EXISTS job_status;
