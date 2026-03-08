-- Restore the jobs table that was previously dropped in 20260117200000
-- This migration was applied directly to production and is being retroactively
-- added to the repo to reconcile migration drift.

DO $$ BEGIN
  CREATE TYPE job_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'canceled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workflow_run_id text UNIQUE,
  type text NOT NULL,
  status_cache job_status NOT NULL DEFAULT 'queued',
  created_by_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL,
  idempotency_key text,
  input jsonb,
  result jsonb,
  error jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_jobs_tenant_id ON jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_status ON jobs(tenant_id, status_cache);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
