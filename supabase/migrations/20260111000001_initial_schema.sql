-- Initial schema for agents-server
-- Enums
CREATE TYPE job_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'canceled');
CREATE TYPE actor_type AS ENUM ('user', 'api_key');

-- Tenants table (maps Clerk Org -> internal tenant)
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_org_id text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_clerk_org_id ON tenants(clerk_org_id);

-- API Keys table (store hash only, never raw key)
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  prefix text NOT NULL,
  hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_prefix_hash ON api_keys(prefix, hash);
CREATE INDEX idx_api_keys_lookup ON api_keys(prefix, hash) WHERE revoked_at IS NULL;

-- Jobs table (light wrapper around workflow runs)
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
  UNIQUE(tenant_id, idempotency_key)
);

CREATE INDEX idx_jobs_tenant_id ON jobs(tenant_id);
CREATE INDEX idx_jobs_tenant_status ON jobs(tenant_id, status_cache);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_type actor_type NOT NULL,
  actor_id text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
