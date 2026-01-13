import type { Json } from "./types"

export type AgentType = "ai_sdk" | "claude_sdk"

export type AgentRunStatus =
  | "queued"
  | "initializing"
  | "running"
  | "awaiting_input"
  | "succeeded"
  | "failed"
  | "canceled"
  | "timed_out"

export type WebhookEvent =
  | "agent_run.started"
  | "agent_run.completed"
  | "agent_run.failed"
  | "agent_run.step_completed"

export type ScheduleFrequency =
  | "once"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "cron"

export type IntegrationProvider =
  | "gmail"
  | "google_calendar"
  | "notion"
  | "luma"

export type TriggerType =
  | "manual"
  | "scheduled"
  | "email"
  | "luma_webhook"

export type LumaEventType =
  | "event.created"
  | "event.updated"
  | "guest.registered"
  | "guest.updated"
  | "ticket.registered"

export interface Agent {
  id: string
  tenant_id: string
  name: string
  description: string | null
  type: AgentType
  model: string
  instructions: string | null
  max_steps: number | null
  timeout_ms: number | null
  skill_ids: string[]
  config: Json
  is_active: boolean | null
  created_at: string
  updated_at: string
}

export interface Skill {
  id: string
  tenant_id: string
  name: string
  slug: string
  description: string | null
  content: string
  references_content: Json
  scripts_content: Json
  version: number
  is_builtin: boolean
  created_at: string
  updated_at: string
}

export interface AgentRun {
  id: string
  tenant_id: string
  agent_id: string
  job_id: string | null
  workflow_run_id: string | null
  sandbox_id: string | null
  status: AgentRunStatus
  trigger_type: TriggerType
  input: Json | null
  output: Json | null
  result: Json | null
  error: Json | null
  steps: Json[]
  token_usage: Json | null
  total_tokens: number | null
  total_cost_cents: number | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  created_by_key_id: string | null
  idempotency_key: string | null
}

export interface AgentStep {
  id: string
  step_number: number
  type: "tool_call" | "tool_result" | "text" | "thinking" | "error"
  name?: string
  input?: Json
  output?: Json
  content?: string
  error?: string
  timestamp: string
  created_at: string
  duration_ms?: number
}

export interface Webhook {
  id: string
  tenant_id: string
  url: string
  secret: string
  events: WebhookEvent[]
  is_active: boolean
  failure_count: number
  last_triggered_at: string | null
  last_success_at: string | null
  last_failure_at: string | null
  created_at: string
  updated_at: string
}

export interface WebhookDelivery {
  id: string
  webhook_id: string
  event: WebhookEvent
  payload: Json
  response_status: number | null
  response_body: string | null
  attempt: number
  delivered_at: string | null
  created_at: string
}

export interface Schedule {
  id: string
  tenant_id: string
  agent_id: string | null
  job_type: string | null
  name: string
  frequency: ScheduleFrequency
  cron_expression: string | null
  timezone: string
  input: Json | null
  is_active: boolean
  next_run_at: string | null
  last_run_at: string | null
  run_count: number
  created_at: string
  updated_at: string
}

export interface OrgIntegration {
  id: string
  tenant_id: string
  provider: IntegrationProvider
  account_email: string | null
  access_token_encrypted: string
  refresh_token_encrypted: string | null
  token_expires_at: string | null
  scopes: string[] | null
  metadata: Json | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SandboxSession {
  id: string
  tenant_id: string
  agent_run_id: string | null
  daytona_sandbox_id: string
  snapshot_id: string | null
  status: string
  env_vars_encrypted: Json | null
  created_at: string
  terminated_at: string | null
}

export interface EmailAddress {
  id: string
  tenant_id: string
  address: string
  domain: string
  local_part: string
  is_custom_domain: boolean
  agent_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface InboundEmail {
  id: string
  email_address_id: string
  resend_email_id: string
  from_address: string
  subject: string | null
  body_text: string | null
  body_html: string | null
  attachments: Json | null
  agent_run_id: string | null
  received_at: string
}

export interface LumaWebhookConfig {
  id: string
  tenant_id: string
  webhook_token: string
  calendar_id: string | null
  event_types: LumaEventType[]
  agent_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LumaWebhookEvent {
  id: string
  config_id: string
  event_type: LumaEventType
  payload: Json
  agent_run_id: string | null
  received_at: string
}
