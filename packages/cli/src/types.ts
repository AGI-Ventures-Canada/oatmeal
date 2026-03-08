export interface CliConfig {
  apiKey: string
  baseUrl: string
  tenantId?: string
  keyId?: string
  scopes?: string[]
}

export interface WhoAmIResponse {
  tenantId: string
  keyId: string
  scopes: string[]
  keyName: string
}

export interface Hackathon {
  id: string
  name: string
  slug: string
  description?: string
  status?: string
  registration_opens_at?: string
  registration_closes_at?: string
  starts_at?: string
  ends_at?: string
  created_at?: string
  updated_at?: string
}

export interface HackathonListResponse {
  hackathons: Hackathon[]
  total?: number
  page?: number
  limit?: number
}

export interface Submission {
  id: string
  name: string
  description?: string
  team_name?: string
  submitted_at?: string
  demo_url?: string
  repo_url?: string
}

export interface JudgingCriteria {
  id: string
  hackathon_id: string
  name: string
  description?: string
  max_score: number
  weight: number
  order_index?: number
}

export interface Judge {
  id: string
  hackathon_id: string
  user_id?: string
  email?: string
  name?: string
  completed_count?: number
  total_count?: number
}

export interface JudgeAssignment {
  id: string
  judge_id: string
  submission_id: string
  judge_name?: string
  submission_name?: string
  status?: string
  scored_at?: string
}

export interface JudgeInvitation {
  id: string
  hackathon_id: string
  email: string
  status: string
  created_at?: string
}

export interface Prize {
  id: string
  hackathon_id: string
  name: string
  description?: string
  type?: string
  value?: string
  order_index?: number
  assigned_submission_id?: string
  assigned_submission_name?: string
}

export interface JudgeDisplayProfile {
  id: string
  hackathon_id: string
  name: string
  title?: string
  bio?: string
  headshot_url?: string
  order_index?: number
}

export interface ResultsData {
  hackathon_id: string
  published: boolean
  published_at?: string
  rankings?: Array<{
    rank: number
    submission_id: string
    submission_name: string
    team_name?: string
    total_score: number
    prizes?: string[]
  }>
}

export interface Webhook {
  id: string
  url: string
  events: string[]
  active: boolean
  signing_secret?: string
  created_at?: string
}

export interface Job {
  id: string
  type: string
  status: string
  input?: Record<string, unknown>
  result?: Record<string, unknown>
  error?: string
  created_at?: string
  completed_at?: string
}

export interface Schedule {
  id: string
  name: string
  cron_expression: string
  enabled: boolean
  last_run_at?: string
  next_run_at?: string
  created_at?: string
}

export interface OrgProfile {
  id: string
  name: string
  slug: string
  description?: string
  hackathon_count?: number
}

export interface PickResults {
  hackathon_id: string
  picks: Array<{
    submission_id: string
    submission_name: string
    pick_count: number
    judges: string[]
  }>
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}
