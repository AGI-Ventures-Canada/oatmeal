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

export interface ClientOptions {
  baseUrl: string
}

export interface ApiResponse<T> {
  data: T | null
  error: { error: string } | null
  status: number
}

class AgentsClientImpl {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, options: ClientOptions) {
    if (!options.baseUrl) {
      throw new Error("baseUrl is required. Example: createClient('sk_live_...', { baseUrl: 'https://api.example.com' })")
    }
    this.apiKey = apiKey
    this.baseUrl = options.baseUrl.replace(/\/$/, "")
  }

  private async request<T>(
    method: "GET" | "POST",
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
}

export function createClient(apiKey: string, options: ClientOptions): AgentsClient {
  return new AgentsClientImpl(apiKey, options)
}

export type AgentsClient = AgentsClientImpl
