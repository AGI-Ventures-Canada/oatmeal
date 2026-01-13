-- =============================================================================
-- Durable Agents System
-- =============================================================================
-- This migration adds support for:
-- - AI SDK agents (DurableAgent) and Claude Agent SDK agents (Daytona sandbox)
-- - Skills system for custom tools per organization
-- - Agent run tracking with step-by-step observability
-- - Webhooks for client event notifications
-- - Advanced scheduling (cron, one-time, recurring)
-- - OAuth integrations (Gmail, Calendar, Notion, Luma)
-- - Event triggers (inbound email, Luma webhooks)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------

CREATE TYPE agent_type AS ENUM ('ai_sdk', 'claude_sdk');

CREATE TYPE agent_run_status AS ENUM (
  'queued',
  'initializing',
  'running',
  'awaiting_input',
  'succeeded',
  'failed',
  'canceled',
  'timed_out'
);

CREATE TYPE webhook_event AS ENUM (
  'agent_run.started',
  'agent_run.completed',
  'agent_run.failed',
  'agent_run.step_completed'
);

CREATE TYPE schedule_frequency AS ENUM (
  'once',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'cron'
);

CREATE TYPE integration_provider AS ENUM (
  'gmail',
  'google_calendar',
  'notion',
  'luma'
);

CREATE TYPE trigger_type AS ENUM (
  'manual',
  'scheduled',
  'email',
  'luma_webhook'
);

CREATE TYPE luma_event_type AS ENUM (
  'event.created',
  'event.updated',
  'guest.registered',
  'guest.updated',
  'ticket.registered'
);

-- -----------------------------------------------------------------------------
-- AGENTS
-- Agent configurations per organization
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  type agent_type NOT NULL DEFAULT 'ai_sdk',
  model text NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',
  instructions text,
  max_steps integer DEFAULT 50,
  timeout_ms integer DEFAULT 300000,
  skill_ids uuid[] DEFAULT '{}',
  config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agents_tenant_id ON agents(tenant_id);
CREATE INDEX idx_agents_tenant_active ON agents(tenant_id) WHERE is_active = true;

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to agents" ON agents FOR ALL USING (false);

-- -----------------------------------------------------------------------------
-- SKILLS
-- Reusable tool definitions per organization
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  content text NOT NULL,
  references_content jsonb DEFAULT '{}',
  scripts_content jsonb DEFAULT '{}',
  version integer DEFAULT 1,
  is_builtin boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, slug)
);

CREATE INDEX idx_skills_tenant_id ON skills(tenant_id);

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to skills" ON skills FOR ALL USING (false);

-- -----------------------------------------------------------------------------
-- AGENT RUNS
-- Execution history with step-by-step tracking
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  workflow_run_id text UNIQUE,
  sandbox_id text,
  status agent_run_status NOT NULL DEFAULT 'queued',
  trigger_type trigger_type NOT NULL DEFAULT 'manual',
  input jsonb,
  output jsonb,
  error jsonb,
  steps jsonb[] DEFAULT '{}',
  token_usage jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL
);

CREATE INDEX idx_agent_runs_tenant_id ON agent_runs(tenant_id);
CREATE INDEX idx_agent_runs_agent_id ON agent_runs(agent_id);
CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_agent_runs_created_at ON agent_runs(created_at DESC);

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to agent_runs" ON agent_runs FOR ALL USING (false);

-- -----------------------------------------------------------------------------
-- WEBHOOKS
-- Client endpoints for event notifications
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL,
  events webhook_event[] NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  failure_count integer DEFAULT 0,
  last_triggered_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhooks_tenant_id ON webhooks(tenant_id);
CREATE INDEX idx_webhooks_active ON webhooks(tenant_id) WHERE is_active = true;

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to webhooks" ON webhooks FOR ALL USING (false);

-- -----------------------------------------------------------------------------
-- WEBHOOK DELIVERIES
-- Delivery attempt tracking
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event webhook_event NOT NULL,
  payload jsonb NOT NULL,
  response_status integer,
  response_body text,
  attempt integer DEFAULT 1,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to webhook_deliveries" ON webhook_deliveries FOR ALL USING (false);

-- -----------------------------------------------------------------------------
-- SCHEDULES
-- Cron and one-time scheduling for agents
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  job_type text,
  name text NOT NULL,
  frequency schedule_frequency NOT NULL,
  cron_expression text,
  timezone text DEFAULT 'UTC',
  input jsonb,
  is_active boolean DEFAULT true,
  next_run_at timestamptz,
  last_run_at timestamptz,
  run_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schedules_target_check CHECK (
    (agent_id IS NOT NULL) OR (job_type IS NOT NULL)
  )
);

CREATE INDEX idx_schedules_tenant_id ON schedules(tenant_id);
CREATE INDEX idx_schedules_next_run ON schedules(next_run_at) WHERE is_active = true;

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to schedules" ON schedules FOR ALL USING (false);

-- -----------------------------------------------------------------------------
-- ORG INTEGRATIONS
-- OAuth tokens per organization (encrypted)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS org_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider integration_provider NOT NULL,
  account_email text,
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[],
  metadata jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, provider)
);

CREATE INDEX idx_org_integrations_tenant_provider ON org_integrations(tenant_id, provider);

ALTER TABLE org_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to org_integrations" ON org_integrations FOR ALL USING (false);

-- -----------------------------------------------------------------------------
-- SANDBOX SESSIONS
-- Daytona sandbox tracking
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sandbox_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_run_id uuid REFERENCES agent_runs(id) ON DELETE SET NULL,
  daytona_sandbox_id text NOT NULL UNIQUE,
  snapshot_id text,
  status text NOT NULL DEFAULT 'creating',
  env_vars_encrypted jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  terminated_at timestamptz
);

CREATE INDEX idx_sandbox_sessions_tenant_id ON sandbox_sessions(tenant_id);
CREATE INDEX idx_sandbox_sessions_agent_run ON sandbox_sessions(agent_run_id);

ALTER TABLE sandbox_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to sandbox_sessions" ON sandbox_sessions FOR ALL USING (false);

-- -----------------------------------------------------------------------------
-- EMAIL ADDRESSES
-- Org-specific inbound email addresses (Resend)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS email_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  address text NOT NULL UNIQUE,
  domain text NOT NULL,
  local_part text NOT NULL,
  is_custom_domain boolean DEFAULT false,
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_addresses_tenant_id ON email_addresses(tenant_id);
CREATE INDEX idx_email_addresses_address ON email_addresses(address);

ALTER TABLE email_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to email_addresses" ON email_addresses FOR ALL USING (false);

-- -----------------------------------------------------------------------------
-- INBOUND EMAILS
-- Received email log
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inbound_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_address_id uuid NOT NULL REFERENCES email_addresses(id) ON DELETE CASCADE,
  resend_email_id text NOT NULL,
  from_address text NOT NULL,
  subject text,
  body_text text,
  body_html text,
  attachments jsonb,
  agent_run_id uuid REFERENCES agent_runs(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inbound_emails_email_address ON inbound_emails(email_address_id);
CREATE INDEX idx_inbound_emails_received_at ON inbound_emails(received_at DESC);

ALTER TABLE inbound_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to inbound_emails" ON inbound_emails FOR ALL USING (false);

-- -----------------------------------------------------------------------------
-- LUMA WEBHOOK CONFIGS
-- Luma calendar webhook configurations
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS luma_webhook_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  webhook_token text NOT NULL UNIQUE,
  calendar_id text,
  event_types luma_event_type[] NOT NULL DEFAULT '{}',
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_luma_webhook_configs_tenant_id ON luma_webhook_configs(tenant_id);
CREATE INDEX idx_luma_webhook_configs_token ON luma_webhook_configs(webhook_token);

ALTER TABLE luma_webhook_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to luma_webhook_configs" ON luma_webhook_configs FOR ALL USING (false);

-- -----------------------------------------------------------------------------
-- LUMA WEBHOOK EVENTS
-- Received Luma events log
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS luma_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid NOT NULL REFERENCES luma_webhook_configs(id) ON DELETE CASCADE,
  event_type luma_event_type NOT NULL,
  payload jsonb NOT NULL,
  agent_run_id uuid REFERENCES agent_runs(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_luma_webhook_events_config ON luma_webhook_events(config_id);
CREATE INDEX idx_luma_webhook_events_received_at ON luma_webhook_events(received_at DESC);

ALTER TABLE luma_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all access to luma_webhook_events" ON luma_webhook_events FOR ALL USING (false);
