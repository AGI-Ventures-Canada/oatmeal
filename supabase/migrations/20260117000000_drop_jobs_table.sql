-- Drop jobs table (feature removed in favor of agent runs)
DROP TABLE IF EXISTS jobs;

-- Drop job_status enum type (no longer used)
DROP TYPE IF EXISTS job_status;
