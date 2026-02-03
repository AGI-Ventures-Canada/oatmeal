import type { Json } from "./types"

export type HackathonStatus =
  | "draft"
  | "published"
  | "registration_open"
  | "active"
  | "judging"
  | "completed"
  | "archived"

export type ParticipantRole = "participant" | "judge" | "mentor" | "organizer"

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "accepted"
  | "rejected"
  | "winner"

export type TeamStatus = "forming" | "locked" | "disbanded"

export type WebhookEvent =
  | "hackathon.created"
  | "hackathon.updated"
  | "submission.created"
  | "submission.submitted"

export type ScheduleFrequency =
  | "once"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "cron"

export type ApiCredentialProvider = "luma"

export type IntegrationProvider =
  | "gmail"
  | "google_calendar"
  | "notion"
  | "luma"

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled"

export interface Hackathon {
  id: string
  tenant_id: string
  name: string
  slug: string
  description: string | null
  rules: string | null
  starts_at: string | null
  ends_at: string | null
  registration_opens_at: string | null
  registration_closes_at: string | null
  max_participants: number | null
  min_team_size: number
  max_team_size: number
  allow_solo: boolean
  status: HackathonStatus
  banner_url: string | null
  metadata: Json
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  hackathon_id: string
  name: string
  captain_clerk_user_id: string
  invite_code: string
  status: TeamStatus
  created_at: string
  updated_at: string
}

export interface HackathonParticipant {
  id: string
  hackathon_id: string
  clerk_user_id: string
  role: ParticipantRole
  team_id: string | null
  registered_at: string
}

export interface Submission {
  id: string
  hackathon_id: string
  participant_id: string | null
  team_id: string | null
  title: string
  description: string | null
  github_url: string | null
  live_app_url: string | null
  demo_video_url: string | null
  status: SubmissionStatus
  metadata: Json
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  tenant_id: string
  type: string
  input: Json
  result: Json
  error: Json
  status_cache: JobStatus
  workflow_run_id: string | null
  created_by_key_id: string | null
  idempotency_key: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface Tenant {
  id: string
  clerk_org_id: string | null
  clerk_user_id: string | null
  name: string
  slug: string | null
  logo_url: string | null
  logo_url_dark: string | null
  description: string | null
  website_url: string | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  tenant_id: string
  action: string
  actor_type: "user" | "api_key"
  actor_id: string
  resource_type: string
  resource_id: string | null
  metadata: Json
  created_at: string
}

export interface ApiKey {
  id: string
  tenant_id: string
  name: string
  prefix: string
  hash: string
  scopes: string[]
  revoked_at: string | null
  last_used_at: string | null
  created_at: string
}

export interface OrgApiCredential {
  id: string
  tenant_id: string
  provider: ApiCredentialProvider
  api_key_encrypted: string
  label: string | null
  account_identifier: string | null
  is_active: boolean
  last_used_at: string | null
  created_at: string
  updated_at: string
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

export type SponsorTier = "title" | "gold" | "silver" | "bronze" | "partner"

export interface HackathonSponsor {
  id: string
  hackathon_id: string
  sponsor_tenant_id: string | null
  name: string
  logo_url: string | null
  website_url: string | null
  tier: SponsorTier
  display_order: number
  created_at: string
}

export interface TenantProfile {
  id: string
  clerk_org_id: string | null
  clerk_user_id: string | null
  name: string
  slug: string | null
  logo_url: string | null
  logo_url_dark: string | null
  description: string | null
  website_url: string | null
  created_at: string
  updated_at: string
}
