export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled"

export interface Job {
  id: string
  type: string
  status: JobStatus
  createdAt: string
  updatedAt?: string
  completedAt?: string | null
}

export interface JobResult {
  id: string
  status: JobStatus
  result: unknown
  error: unknown
  completedAt: string
}

export interface CreateJobInput {
  type: string
  input?: unknown
  idempotencyKey?: string
}

export interface WhoamiResponse {
  tenantId: string
  keyId: string
  scopes: string[]
}

// Agent types
export type AgentRunStatus =
  | "queued"
  | "initializing"
  | "running"
  | "awaiting_input"
  | "succeeded"
  | "failed"
  | "canceled"
  | "timed_out"

export type TriggerType = "manual" | "scheduled" | "email" | "luma_webhook"

export interface AgentRunInput {
  prompt: string
  context?: unknown
  idempotencyKey?: string
}

export interface AgentRun {
  runId: string
  agentId: string
  status: AgentRunStatus
  createdAt: string
}

export interface AgentRunDetails {
  id: string
  agentId: string
  status: AgentRunStatus
  triggerType: TriggerType
  startedAt?: string | null
  completedAt?: string | null
  totalTokens?: number | null
  totalCostCents?: number | null
}

export interface AgentRunStep {
  stepNumber: number
  type: string
  name?: string
  output?: unknown
  durationMs?: number
}

export interface AgentRunResult {
  id: string
  agentId: string
  status: AgentRunStatus
  result?: unknown
  error?: unknown
  completedAt?: string | null
  totalTokens?: number | null
  totalCostCents?: number | null
  steps: AgentRunStep[]
}

export interface AgentRunStreamEvent {
  event: "status" | "step" | "done"
  data: unknown
}

export interface HumanInputInput {
  input: unknown
}

// Agent CRUD types
export interface Agent {
  id: string
  name: string
  description?: string
  instructions?: string
  type: string
  model: string
  isActive: boolean
  skillIds?: string[]
  config?: unknown
  createdAt: string
  updatedAt?: string
}

export interface AgentListItem {
  id: string
  name: string
  description?: string
  type: string
  model: string
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface CreateAgentInput {
  name: string
  description?: string
  instructions: string
  type?: string
  model?: string
  skillIds?: string[]
  config?: unknown
}

export interface UpdateAgentInput {
  name?: string
  description?: string
  instructions?: string
  model?: string
  skillIds?: string[]
  config?: unknown
  isActive?: boolean
}

// Webhook types
export type WebhookEvent =
  | "agent_run.started"
  | "agent_run.completed"
  | "agent_run.failed"
  | "agent_run.step_completed"

export interface Webhook {
  id: string
  url: string
  events: string[]
  isActive: boolean
  failureCount: number
  lastTriggeredAt?: string | null
  createdAt: string
}

export interface CreateWebhookInput {
  url: string
  events: WebhookEvent[]
}

export interface CreateWebhookResponse {
  id: string
  url: string
  events: string[]
  secret: string
  createdAt: string
}

// Skill types
export interface Skill {
  id: string
  name: string
  slug: string
  description?: string
  content?: string
  referencesContent?: unknown
  scriptsContent?: unknown
  version: number
  isBuiltin: boolean
  createdAt: string
  updatedAt?: string
}

export interface SkillListItem {
  id: string
  name: string
  slug: string
  description?: string
  version: number
  isBuiltin: boolean
  createdAt: string
  updatedAt?: string
}

export interface CreateSkillInput {
  name: string
  slug: string
  description?: string
  content: string
  referencesContent?: unknown
  scriptsContent?: unknown
}

export interface UpdateSkillInput {
  name?: string
  slug?: string
  description?: string
  content?: string
  referencesContent?: unknown
  scriptsContent?: unknown
}

// Schedule types
export type ScheduleFrequency = "once" | "hourly" | "daily" | "weekly" | "monthly" | "cron"

export interface Schedule {
  id: string
  name: string
  frequency: ScheduleFrequency
  cronExpression?: string | null
  timezone: string
  agentId?: string | null
  jobType?: string | null
  input?: unknown
  isActive: boolean
  nextRunAt?: string | null
  lastRunAt?: string | null
  runCount: number
  createdAt: string
  updatedAt?: string
}

export interface ScheduleListItem {
  id: string
  name: string
  frequency: ScheduleFrequency
  cronExpression?: string | null
  timezone: string
  agentId?: string | null
  jobType?: string | null
  isActive: boolean
  nextRunAt?: string | null
  lastRunAt?: string | null
  runCount: number
  createdAt: string
}

export interface CreateScheduleInput {
  name: string
  frequency: ScheduleFrequency
  cronExpression?: string
  timezone?: string
  agentId?: string
  jobType?: string
  input?: unknown
}

export interface UpdateScheduleInput {
  name?: string
  frequency?: ScheduleFrequency
  cronExpression?: string
  timezone?: string
  input?: unknown
  isActive?: boolean
}

const DEFAULT_BASE_URL = "https://agentsapi.io"

function getBaseUrl(): string {
  // Check for NEXT_PUBLIC_APP_URL first (for local development)
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  return DEFAULT_BASE_URL
}

export interface ClientOptions {
  baseUrl?: string
}

export interface ApiResponse<T> {
  data: T | null
  error: { error: string } | null
  status: number
}

class AgentsClientImpl {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, options: ClientOptions = {}) {
    this.apiKey = apiKey
    this.baseUrl = (options.baseUrl ?? getBaseUrl()).replace(/\/$/, "")
  }

  private async request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`
    const headers: HeadersInit = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    const status = response.status

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
      return { data: null, error: errorData as { error: string }, status }
    }

    const data = await response.json()
    return { data: data as T, error: null, status }
  }

  async whoami(): Promise<ApiResponse<WhoamiResponse>> {
    return this.request<WhoamiResponse>("GET", "/api/v1/whoami")
  }

  readonly jobs = {
    create: async (input: CreateJobInput): Promise<ApiResponse<Job>> => {
      return this.request<Job>("POST", "/api/v1/jobs", input)
    },

    get: async (id: string): Promise<ApiResponse<Job>> => {
      return this.request<Job>("GET", `/api/v1/jobs/${id}`)
    },

    getResult: async (id: string): Promise<ApiResponse<JobResult>> => {
      return this.request<JobResult>("GET", `/api/v1/jobs/${id}/result`)
    },

    cancel: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
      return this.request<{ success: boolean }>("POST", `/api/v1/jobs/${id}/cancel`)
    },

    waitForResult: async (
      id: string,
      opts?: { maxAttempts?: number; intervalMs?: number }
    ): Promise<JobResult> => {
      const maxAttempts = opts?.maxAttempts ?? 60
      const intervalMs = opts?.intervalMs ?? 1000

      for (let i = 0; i < maxAttempts; i++) {
        const { data, error, status } = await this.jobs.getResult(id)

        if (status === 202) {
          await new Promise((r) => setTimeout(r, intervalMs))
          continue
        }

        if (error) {
          throw new Error(error.error || "Failed to get job result")
        }

        if (data) {
          return data
        }
      }

      throw new Error(`Job ${id} did not complete within ${maxAttempts} attempts`)
    },
  }

  readonly agents = {
    list: async (): Promise<ApiResponse<{ agents: AgentListItem[] }>> => {
      return this.request<{ agents: AgentListItem[] }>("GET", "/api/v1/agents")
    },

    create: async (input: CreateAgentInput): Promise<ApiResponse<Agent>> => {
      return this.request<Agent>("POST", "/api/v1/agents", input)
    },

    get: async (agentId: string): Promise<ApiResponse<Agent>> => {
      return this.request<Agent>("GET", `/api/v1/agents/${agentId}`)
    },

    update: async (agentId: string, input: UpdateAgentInput): Promise<ApiResponse<Agent>> => {
      return this.request<Agent>("PATCH", `/api/v1/agents/${agentId}`, input)
    },

    delete: async (agentId: string): Promise<ApiResponse<{ success: boolean }>> => {
      return this.request<{ success: boolean }>("DELETE", `/api/v1/agents/${agentId}`)
    },

    run: async (agentId: string, input: AgentRunInput): Promise<ApiResponse<AgentRun>> => {
      return this.request<AgentRun>("POST", `/api/v1/agents/${agentId}/run`, input)
    },

    getRun: async (runId: string): Promise<ApiResponse<AgentRunDetails>> => {
      return this.request<AgentRunDetails>("GET", `/api/v1/runs/${runId}`)
    },

    getRunResult: async (runId: string): Promise<ApiResponse<AgentRunResult>> => {
      return this.request<AgentRunResult>("GET", `/api/v1/runs/${runId}/result`)
    },

    streamRun: (runId: string): EventSource => {
      const url = `${this.baseUrl}/api/v1/runs/${runId}/stream`
      const eventSource = new EventSource(url)
      return eventSource
    },

    provideInput: async (
      runId: string,
      input: HumanInputInput
    ): Promise<ApiResponse<{ success: boolean }>> => {
      return this.request<{ success: boolean }>("POST", `/api/v1/runs/${runId}/input`, input)
    },

    cancelRun: async (runId: string): Promise<ApiResponse<{ success: boolean }>> => {
      return this.request<{ success: boolean }>("POST", `/api/v1/runs/${runId}/cancel`)
    },

    waitForResult: async (
      runId: string,
      opts?: { maxAttempts?: number; intervalMs?: number }
    ): Promise<AgentRunResult> => {
      const maxAttempts = opts?.maxAttempts ?? 120
      const intervalMs = opts?.intervalMs ?? 1000

      for (let i = 0; i < maxAttempts; i++) {
        const { data, error, status } = await this.agents.getRunResult(runId)

        if (status === 202) {
          await new Promise((r) => setTimeout(r, intervalMs))
          continue
        }

        if (error) {
          throw new Error(error.error || "Failed to get agent run result")
        }

        if (data) {
          return data
        }
      }

      throw new Error(`Agent run ${runId} did not complete within ${maxAttempts} attempts`)
    },
  }

  readonly webhooks = {
    list: async (): Promise<ApiResponse<{ webhooks: Webhook[] }>> => {
      return this.request<{ webhooks: Webhook[] }>("GET", "/api/v1/webhooks")
    },

    create: async (input: CreateWebhookInput): Promise<ApiResponse<CreateWebhookResponse>> => {
      return this.request<CreateWebhookResponse>("POST", "/api/v1/webhooks", input)
    },

    delete: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
      return this.request<{ success: boolean }>("DELETE", `/api/v1/webhooks/${id}`)
    },
  }

  readonly skills = {
    list: async (): Promise<ApiResponse<{ skills: SkillListItem[] }>> => {
      return this.request<{ skills: SkillListItem[] }>("GET", "/api/v1/skills")
    },

    create: async (input: CreateSkillInput): Promise<ApiResponse<{ id: string; name: string; slug: string; createdAt: string }>> => {
      return this.request<{ id: string; name: string; slug: string; createdAt: string }>("POST", "/api/v1/skills", input)
    },

    get: async (id: string): Promise<ApiResponse<Skill>> => {
      return this.request<Skill>("GET", `/api/v1/skills/${id}`)
    },

    update: async (id: string, input: UpdateSkillInput): Promise<ApiResponse<{ id: string; version: number; updatedAt: string }>> => {
      return this.request<{ id: string; version: number; updatedAt: string }>("PATCH", `/api/v1/skills/${id}`, input)
    },

    delete: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
      return this.request<{ success: boolean }>("DELETE", `/api/v1/skills/${id}`)
    },
  }

  readonly schedules = {
    list: async (opts?: { activeOnly?: boolean }): Promise<ApiResponse<{ schedules: ScheduleListItem[] }>> => {
      const query = opts?.activeOnly ? "?activeOnly=true" : ""
      return this.request<{ schedules: ScheduleListItem[] }>("GET", `/api/v1/schedules${query}`)
    },

    create: async (input: CreateScheduleInput): Promise<ApiResponse<{ id: string; name: string; nextRunAt?: string | null; createdAt: string }>> => {
      return this.request<{ id: string; name: string; nextRunAt?: string | null; createdAt: string }>("POST", "/api/v1/schedules", input)
    },

    get: async (id: string): Promise<ApiResponse<Schedule>> => {
      return this.request<Schedule>("GET", `/api/v1/schedules/${id}`)
    },

    update: async (id: string, input: UpdateScheduleInput): Promise<ApiResponse<{ id: string; nextRunAt?: string | null; updatedAt: string }>> => {
      return this.request<{ id: string; nextRunAt?: string | null; updatedAt: string }>("PATCH", `/api/v1/schedules/${id}`, input)
    },

    delete: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
      return this.request<{ success: boolean }>("DELETE", `/api/v1/schedules/${id}`)
    },
  }
}

export function createClient(apiKey: string, options?: ClientOptions): AgentsClient {
  return new AgentsClientImpl(apiKey, options)
}

export type AgentsClient = AgentsClientImpl
