import { REQUEST_TIMEOUT_MS, VERSION } from "./constants.js"
import { ApiError, AuthError, ScopeError } from "./errors.js"

interface ClientOptions {
  baseUrl: string
  apiKey?: string
}

interface RequestOptions {
  method?: string
  body?: unknown
  params?: Record<string, string | number | undefined>
  timeout?: number
}

export class OatmealClient {
  private baseUrl: string
  private apiKey?: string

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "")
    this.apiKey = options.apiKey
  }

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" })
  }

  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "POST", body })
  }

  async put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "PUT", body })
  }

  async patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "PATCH", body })
  }

  async delete<T>(path: string, options?: RequestOptions & { body?: unknown }): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE", body: options?.body })
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, params, timeout = REQUEST_TIMEOUT_MS } = options

    let url = `${this.baseUrl}${path}`
    if (params) {
      const searchParams = new URLSearchParams()
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          searchParams.set(key, String(value))
        }
      }
      const qs = searchParams.toString()
      if (qs) url += `?${qs}`
    }

    const headers: Record<string, string> = {
      "User-Agent": `hackathon-cli/${VERSION}`,
    }
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`
    }
    if (body !== undefined) {
      headers["Content-Type"] = "application/json"
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await this.fetchWithRetry(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timer)

      if (response.status === 204) {
        return undefined as T
      }

      const contentType = response.headers.get("content-type") ?? ""
      let data: unknown

      if (contentType.includes("application/json")) {
        data = await response.json()
      } else {
        const text = await response.text()
        data = { message: text }
      }

      if (!response.ok) {
        this.handleErrorResponse(response.status, data)
      }

      return data as T
    } catch (error) {
      clearTimeout(timer)
      if (error instanceof ApiError || error instanceof AuthError || error instanceof ScopeError) {
        throw error
      }
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ApiError(0, `Request timed out after ${timeout / 1000}s`)
      }
      if (error instanceof TypeError && (error.message.includes("fetch") || error.message.includes("network"))) {
        throw new ApiError(0, `Could not connect to ${this.baseUrl}. Is the server running?`)
      }
      throw new ApiError(0, `Network error: ${(error as Error).message}`)
    }
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    retried = false
  ): Promise<Response> {
    const response = await fetch(url, init)

    if (response.status === 429 && !retried) {
      const retryAfter = response.headers.get("retry-after")
      const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : 1000
      await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 10_000)))
      return this.fetchWithRetry(url, init, true)
    }

    return response
  }

  private handleErrorResponse(status: number, data: unknown): never {
    const body = data as Record<string, unknown>
    const message = (body?.error as string) || (body?.message as string) || `Request failed`

    if (status === 401) {
      throw new AuthError(message)
    }

    if (status === 403) {
      const scope = body?.requiredScope as string | undefined
      if (scope) {
        throw new ScopeError(scope, body?.currentScopes as string[] | undefined)
      }
      throw new ApiError(403, message)
    }

    if (status === 404) {
      throw new ApiError(404, body?.message ? message : "Resource not found")
    }

    if (status === 429) {
      throw new ApiError(429, "Rate limited. Please try again later.", "Wait a moment before retrying.")
    }

    throw new ApiError(status, message)
  }
}
