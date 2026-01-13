import { describe, expect, it, beforeEach, mock } from "bun:test"
import { createClient } from "../src/index"
import type {
  Job,
  JobResult,
  WhoamiResponse,
  AgentRun,
  AgentRunDetails,
  AgentRunResult,
  ApiResponse,
} from "../src/index"

describe("SDK Client", () => {
  const mockFetch = mock(() => Promise.resolve(new Response("{}", { status: 200 })))

  beforeEach(() => {
    mockFetch.mockClear()
    globalThis.fetch = mockFetch
  })

  // ============================================================================
  // Client Initialization
  // ============================================================================
  describe("createClient", () => {
    it("creates a client with baseUrl", () => {
      const client = createClient("sk_live_test123", {
        baseUrl: "https://api.example.com",
      })
      expect(client).toBeDefined()
      expect(client.whoami).toBeDefined()
      expect(client.jobs).toBeDefined()
      expect(client.agents).toBeDefined()
    })

    it("creates a client with default baseUrl when no options provided", () => {
      const client = createClient("sk_live_test123")
      expect(client).toBeDefined()
      expect(client.whoami).toBeDefined()
      expect(client.jobs).toBeDefined()
      expect(client.agents).toBeDefined()
    })

    it("creates a client with default baseUrl when empty options provided", () => {
      const client = createClient("sk_live_test123", {})
      expect(client).toBeDefined()
      expect(client.whoami).toBeDefined()
    })

    it("uses default base URL when none provided", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ tenantId: "t1", keyId: "k1", scopes: [] }), {
            status: 200,
          })
        )
      )

      const client = createClient("sk_live_test123")
      await client.whoami()

      expect(mockFetch).toHaveBeenCalledWith(
        "https://agents.agiventures.ai/api/v1/whoami",
        expect.any(Object)
      )
    })

    it("strips trailing slash from baseUrl", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ tenantId: "t1", keyId: "k1", scopes: [] }), {
            status: 200,
          })
        )
      )

      const client = createClient("sk_live_test123", {
        baseUrl: "https://example.com/",
      })
      await client.whoami()

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const call = mockFetch.mock.calls[0]
      expect(call[0]).toBe("https://example.com/api/v1/whoami")
    })

    it("handles multiple trailing slashes", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com///" })
      await client.whoami()

      const [url] = mockFetch.mock.calls[0]
      expect(url).not.toContain("////")
    })

    it("works with different API key formats", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))
      )

      const liveClient = createClient("sk_live_abc123def456", { baseUrl: "https://api.test.com" })
      const testClient = createClient("sk_test_xyz789", { baseUrl: "https://api.test.com" })

      await liveClient.whoami()
      expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe("Bearer sk_live_abc123def456")

      await testClient.whoami()
      expect(mockFetch.mock.calls[1][1].headers.Authorization).toBe("Bearer sk_test_xyz789")
    })
  })

  // ============================================================================
  // Request Handling
  // ============================================================================
  describe("request handling", () => {
    it("sends correct Content-Type header", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      await client.jobs.create({ type: "test" })

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers["Content-Type"]).toBe("application/json")
    })

    it("handles network errors gracefully", async () => {
      mockFetch.mockImplementation(() => Promise.reject(new Error("Network error")))

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })

      await expect(client.whoami()).rejects.toThrow("Network error")
    })

    it("handles JSON parse errors", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response("not json", { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })

      await expect(client.whoami()).rejects.toThrow()
    })

    it("handles empty response body on error", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response("", { status: 500 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.whoami()

      expect(result.error).toEqual({ error: "Unknown error" })
      expect(result.status).toBe(500)
    })

    it("preserves response status codes", async () => {
      const statusCodes = [200, 201, 400, 401, 403, 404, 429, 500, 502, 503]

      for (const status of statusCodes) {
        mockFetch.mockImplementation(() =>
          Promise.resolve(
            new Response(JSON.stringify(status >= 400 ? { error: "Error" } : { data: "ok" }), {
              status,
            })
          )
        )

        const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
        const result = await client.whoami()

        expect(result.status).toBe(status)
      }
    })
  })

  // ============================================================================
  // Whoami
  // ============================================================================
  describe("whoami", () => {
    it("makes GET request to /api/v1/whoami", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ tenantId: "tenant-1", keyId: "key-1", scopes: ["jobs:create"] }),
            { status: 200 }
          )
        )
      )

      const client = createClient("sk_live_test123", {
        baseUrl: "https://api.example.com",
      })
      await client.whoami()

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe("https://api.example.com/api/v1/whoami")
      expect(options.method).toBe("GET")
      expect(options.headers.Authorization).toBe("Bearer sk_live_test123")
    })

    it("returns data on success", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ tenantId: "t1", keyId: "k1", scopes: ["jobs:read"] }),
            { status: 200 }
          )
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.whoami()

      expect(result.data).toEqual({ tenantId: "t1", keyId: "k1", scopes: ["jobs:read"] })
      expect(result.error).toBeNull()
      expect(result.status).toBe(200)
    })

    it("returns error on 401", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
        )
      )

      const client = createClient("invalid_key", { baseUrl: "https://api.test.com" })
      const result = await client.whoami()

      expect(result.data).toBeNull()
      expect(result.error).toEqual({ error: "Unauthorized" })
      expect(result.status).toBe(401)
    })

    it("returns all scope types", async () => {
      const allScopes = [
        "jobs:create",
        "jobs:read",
        "jobs:cancel",
        "agents:run",
        "agents:read",
      ]
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ tenantId: "t1", keyId: "k1", scopes: allScopes }),
            { status: 200 }
          )
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.whoami()

      expect(result.data?.scopes).toEqual(allScopes)
    })
  })

  // ============================================================================
  // Jobs - Create
  // ============================================================================
  describe("jobs.create", () => {
    it("makes POST request to /api/v1/jobs", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ id: "job-1", type: "test", status: "queued", createdAt: "2024-01-01" }),
            { status: 200 }
          )
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      await client.jobs.create({ type: "test-job", input: { foo: "bar" } })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe("https://api.test.com/api/v1/jobs")
      expect(options.method).toBe("POST")
      expect(JSON.parse(options.body)).toEqual({ type: "test-job", input: { foo: "bar" } })
    })

    it("returns created job on success", async () => {
      const mockJob = { id: "job-123", type: "analyze", status: "queued", createdAt: "2024-01-01T00:00:00Z" }
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify(mockJob), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.jobs.create({ type: "analyze" })

      expect(result.data).toEqual(mockJob)
      expect(result.error).toBeNull()
    })

    it("supports idempotencyKey", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ id: "job-1" }), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      await client.jobs.create({ type: "test", idempotencyKey: "unique-key-123" })

      const [, options] = mockFetch.mock.calls[0]
      expect(JSON.parse(options.body).idempotencyKey).toBe("unique-key-123")
    })

    it("handles complex input objects", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ id: "job-1" }), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const complexInput = {
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
        nullValue: null,
        booleans: { yes: true, no: false },
      }
      await client.jobs.create({ type: "complex", input: complexInput })

      const [, options] = mockFetch.mock.calls[0]
      expect(JSON.parse(options.body).input).toEqual(complexInput)
    })

    it("handles 400 validation error", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Invalid job type" }), { status: 400 })
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.jobs.create({ type: "" })

      expect(result.data).toBeNull()
      expect(result.error?.error).toBe("Invalid job type")
      expect(result.status).toBe(400)
    })

    it("handles 403 missing scope", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Missing required scope: jobs:create" }), { status: 403 })
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.jobs.create({ type: "test" })

      expect(result.status).toBe(403)
      expect(result.error?.error).toContain("jobs:create")
    })

    it("handles 429 rate limit", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.jobs.create({ type: "test" })

      expect(result.status).toBe(429)
    })
  })

  // ============================================================================
  // Jobs - Get
  // ============================================================================
  describe("jobs.get", () => {
    it("makes GET request to /api/v1/jobs/:id", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ id: "job-1", status: "running" }), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      await client.jobs.get("job-abc123")

      const [url] = mockFetch.mock.calls[0]
      expect(url).toBe("https://api.test.com/api/v1/jobs/job-abc123")
    })

    it("returns 404 for non-existent job", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ error: "Job not found" }), { status: 404 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.jobs.get("non-existent")

      expect(result.data).toBeNull()
      expect(result.error).toEqual({ error: "Job not found" })
      expect(result.status).toBe(404)
    })

    it("returns full job details", async () => {
      const fullJob: Job = {
        id: "job-full",
        type: "analysis",
        status: "succeeded",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:05:00Z",
        completedAt: "2024-01-01T00:10:00Z",
      }
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify(fullJob), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.jobs.get("job-full")

      expect(result.data).toEqual(fullJob)
      expect(result.data?.completedAt).toBe("2024-01-01T00:10:00Z")
    })

    it("handles all job statuses", async () => {
      const statuses = ["queued", "running", "succeeded", "failed", "canceled"] as const

      for (const status of statuses) {
        mockFetch.mockImplementation(() =>
          Promise.resolve(
            new Response(JSON.stringify({ id: "job-1", type: "test", status, createdAt: "2024-01-01" }), {
              status: 200,
            })
          )
        )

        const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
        const result = await client.jobs.get("job-1")

        expect(result.data?.status).toBe(status)
      }
    })

    it("handles special characters in job ID", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ id: "job-1" }), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      await client.jobs.get("job_with-special.chars")

      const [url] = mockFetch.mock.calls[0]
      expect(url).toBe("https://api.test.com/api/v1/jobs/job_with-special.chars")
    })
  })

  // ============================================================================
  // Jobs - Get Result
  // ============================================================================
  describe("jobs.getResult", () => {
    it("makes GET request to /api/v1/jobs/:id/result", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ id: "job-1", status: "succeeded", result: { data: "test" } }), { status: 200 })
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      await client.jobs.getResult("job-abc123")

      const [url] = mockFetch.mock.calls[0]
      expect(url).toBe("https://api.test.com/api/v1/jobs/job-abc123/result")
    })

    it("returns 202 when job is still running", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Job not completed", status: "running" }), { status: 202 })
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.jobs.getResult("running-job")

      expect(result.status).toBe(202)
    })

    it("returns 202 when job is queued", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Job not completed", status: "queued" }), { status: 202 })
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.jobs.getResult("queued-job")

      expect(result.status).toBe(202)
    })

    it("returns full result for succeeded job", async () => {
      const fullResult: JobResult = {
        id: "job-1",
        status: "succeeded",
        result: { output: "analysis complete", metrics: { score: 0.95 } },
        error: null,
        completedAt: "2024-01-01T00:10:00Z",
      }
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify(fullResult), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.jobs.getResult("job-1")

      expect(result.data).toEqual(fullResult)
    })

    it("returns error for failed job", async () => {
      const failedResult: JobResult = {
        id: "job-failed",
        status: "failed",
        result: null,
        error: { code: "PROCESSING_ERROR", message: "Failed to process" },
        completedAt: "2024-01-01T00:05:00Z",
      }
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify(failedResult), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.jobs.getResult("job-failed")

      expect(result.data?.status).toBe("failed")
      expect(result.data?.error).toBeDefined()
    })
  })

  // ============================================================================
  // Jobs - Cancel
  // ============================================================================
  describe("jobs.cancel", () => {
    it("makes POST request to /api/v1/jobs/:id/cancel", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      await client.jobs.cancel("job-to-cancel")

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe("https://api.test.com/api/v1/jobs/job-to-cancel/cancel")
      expect(options.method).toBe("POST")
    })

    it("returns success true on successful cancel", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.jobs.cancel("job-1")

      expect(result.data).toEqual({ success: true })
    })

    it("returns error for already completed job", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Cannot cancel job (not found or already completed)" }), { status: 400 })
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.jobs.cancel("completed-job")

      expect(result.data).toBeNull()
      expect(result.error?.error).toContain("Cannot cancel")
      expect(result.status).toBe(400)
    })

    it("returns error for non-existent job", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Cannot cancel job (not found or already completed)" }), { status: 400 })
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.jobs.cancel("non-existent")

      expect(result.status).toBe(400)
    })
  })

  // ============================================================================
  // Jobs - Wait For Result
  // ============================================================================
  describe("jobs.waitForResult", () => {
    it("returns immediately when job is complete", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ id: "job-1", status: "succeeded", result: { output: "done" }, error: null, completedAt: "2024-01-01" }),
            { status: 200 }
          )
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.jobs.waitForResult("job-1")

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result.status).toBe("succeeded")
      expect(result.result).toEqual({ output: "done" })
    })

    it("polls until job completes", async () => {
      let callCount = 0
      mockFetch.mockImplementation(() => {
        callCount++
        if (callCount < 3) {
          return Promise.resolve(
            new Response(JSON.stringify({ error: "Job not completed", status: "running" }), { status: 202 })
          )
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({ id: "job-1", status: "succeeded", result: {}, error: null, completedAt: "2024-01-01" }),
            { status: 200 }
          )
        )
      })

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.jobs.waitForResult("job-1", { intervalMs: 10 })

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(result.status).toBe("succeeded")
    })

    it("throws after max attempts", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Job not completed", status: "running" }), { status: 202 })
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })

      await expect(
        client.jobs.waitForResult("slow-job", { maxAttempts: 3, intervalMs: 10 })
      ).rejects.toThrow("did not complete within 3 attempts")
    })

    it("throws on error response", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ error: "Job failed" }), { status: 500 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })

      await expect(client.jobs.waitForResult("failed-job")).rejects.toThrow("Job failed")
    })

    it("uses default maxAttempts of 60", async () => {
      let callCount = 0
      mockFetch.mockImplementation(() => {
        callCount++
        if (callCount <= 5) {
          return Promise.resolve(
            new Response(JSON.stringify({ error: "Job not completed", status: "running" }), { status: 202 })
          )
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({ id: "job-1", status: "succeeded", result: {}, error: null, completedAt: "2024-01-01" }),
            { status: 200 }
          )
        )
      })

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.jobs.waitForResult("job-1", { intervalMs: 1 })

      expect(result.status).toBe("succeeded")
    })

    it("returns failed job result without throwing", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              id: "job-failed",
              status: "failed",
              result: null,
              error: { message: "Processing error" },
              completedAt: "2024-01-01",
            }),
            { status: 200 }
          )
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.jobs.waitForResult("job-failed")

      expect(result.status).toBe("failed")
      expect(result.error).toEqual({ message: "Processing error" })
    })

    it("handles canceled job", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              id: "job-canceled",
              status: "canceled",
              result: null,
              error: null,
              completedAt: "2024-01-01",
            }),
            { status: 200 }
          )
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.jobs.waitForResult("job-canceled")

      expect(result.status).toBe("canceled")
    })
  })

  // ============================================================================
  // Agents - Run
  // ============================================================================
  describe("agents.run", () => {
    it("makes POST request to /api/v1/agents/:agentId/run", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ runId: "run-1", agentId: "agent-1", status: "queued", createdAt: "2024-01-01" }),
            { status: 200 }
          )
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      await client.agents.run("agent-abc", { prompt: "Hello" })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe("https://api.test.com/api/v1/agents/agent-abc/run")
      expect(options.method).toBe("POST")
      expect(JSON.parse(options.body)).toEqual({ prompt: "Hello" })
    })

    it("returns agent run on success", async () => {
      const mockRun = { runId: "run-123", agentId: "agent-1", status: "queued", createdAt: "2024-01-01T00:00:00Z" }
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify(mockRun), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.run("agent-1", { prompt: "Test prompt" })

      expect(result.data).toEqual(mockRun)
      expect(result.error).toBeNull()
    })

    it("supports context and idempotencyKey", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ runId: "run-1" }), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      await client.agents.run("agent-1", {
        prompt: "Analyze this",
        context: { data: "test", nested: { value: 123 } },
        idempotencyKey: "key-123",
      })

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body.prompt).toBe("Analyze this")
      expect(body.context).toEqual({ data: "test", nested: { value: 123 } })
      expect(body.idempotencyKey).toBe("key-123")
    })

    it("returns error on 404 agent not found", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Agent not found" }), { status: 404 })
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.run("non-existent", { prompt: "test" })

      expect(result.data).toBeNull()
      expect(result.error).toEqual({ error: "Agent not found" })
      expect(result.status).toBe(404)
    })

    it("handles long prompts", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ runId: "run-1" }), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const longPrompt = "A".repeat(10000)
      await client.agents.run("agent-1", { prompt: longPrompt })

      const [, options] = mockFetch.mock.calls[0]
      expect(JSON.parse(options.body).prompt).toBe(longPrompt)
    })

    it("handles unicode in prompt", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ runId: "run-1" }), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const unicodePrompt = "Analyze 日本語 text with emoji 🎉"
      await client.agents.run("agent-1", { prompt: unicodePrompt })

      const [, options] = mockFetch.mock.calls[0]
      expect(JSON.parse(options.body).prompt).toBe(unicodePrompt)
    })

    it("returns 403 for missing agents:run scope", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Missing required scope: agents:run" }), { status: 403 })
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.run("agent-1", { prompt: "test" })

      expect(result.status).toBe(403)
      expect(result.error?.error).toContain("agents:run")
    })
  })

  // ============================================================================
  // Agents - Get Run
  // ============================================================================
  describe("agents.getRun", () => {
    it("makes GET request to /api/v1/runs/:runId", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              id: "run-1",
              agentId: "agent-1",
              status: "running",
              triggerType: "manual",
            }),
            { status: 200 }
          )
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      await client.agents.getRun("run-abc123")

      const [url] = mockFetch.mock.calls[0]
      expect(url).toBe("https://api.test.com/api/v1/runs/run-abc123")
    })

    it("returns run details on success", async () => {
      const mockRun: AgentRunDetails = {
        id: "run-1",
        agentId: "agent-1",
        status: "succeeded",
        triggerType: "scheduled",
        startedAt: "2024-01-01T00:00:00Z",
        completedAt: "2024-01-01T00:01:00Z",
        totalTokens: 1500,
        totalCostCents: 3,
      }
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify(mockRun), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.getRun("run-1")

      expect(result.data).toEqual(mockRun)
      expect(result.error).toBeNull()
    })

    it("returns 404 for non-existent run", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Run not found" }), { status: 404 })
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.getRun("non-existent")

      expect(result.data).toBeNull()
      expect(result.error).toEqual({ error: "Run not found" })
      expect(result.status).toBe(404)
    })

    it("handles all trigger types", async () => {
      const triggerTypes = ["manual", "scheduled", "email", "luma_webhook"] as const

      for (const triggerType of triggerTypes) {
        mockFetch.mockImplementation(() =>
          Promise.resolve(
            new Response(
              JSON.stringify({
                id: "run-1",
                agentId: "agent-1",
                status: "running",
                triggerType,
              }),
              { status: 200 }
            )
          )
        )

        const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
        const result = await client.agents.getRun("run-1")

        expect(result.data?.triggerType).toBe(triggerType)
      }
    })

    it("handles all run statuses", async () => {
      const statuses = [
        "queued",
        "initializing",
        "running",
        "awaiting_input",
        "succeeded",
        "failed",
        "canceled",
        "timed_out",
      ] as const

      for (const status of statuses) {
        mockFetch.mockImplementation(() =>
          Promise.resolve(
            new Response(
              JSON.stringify({
                id: "run-1",
                agentId: "agent-1",
                status,
                triggerType: "manual",
              }),
              { status: 200 }
            )
          )
        )

        const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
        const result = await client.agents.getRun("run-1")

        expect(result.data?.status).toBe(status)
      }
    })
  })

  // ============================================================================
  // Agents - Get Run Result
  // ============================================================================
  describe("agents.getRunResult", () => {
    it("makes GET request to /api/v1/runs/:runId/result", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              id: "run-1",
              agentId: "agent-1",
              status: "succeeded",
              result: { output: "done" },
              steps: [],
            }),
            { status: 200 }
          )
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      await client.agents.getRunResult("run-abc123")

      const [url] = mockFetch.mock.calls[0]
      expect(url).toBe("https://api.test.com/api/v1/runs/run-abc123/result")
    })

    it("returns 202 when run is still in progress", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Run not completed", status: "running" }), { status: 202 })
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.getRunResult("running-run")

      expect(result.status).toBe(202)
    })

    it("returns 202 for initializing runs", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Run not completed", status: "initializing" }), { status: 202 })
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.getRunResult("initializing-run")

      expect(result.status).toBe(202)
    })

    it("returns full result with steps on success", async () => {
      const mockResult: AgentRunResult = {
        id: "run-1",
        agentId: "agent-1",
        status: "succeeded",
        result: { answer: "42" },
        completedAt: "2024-01-01T00:01:00Z",
        totalTokens: 2000,
        totalCostCents: 5,
        steps: [
          { stepNumber: 1, type: "thinking", output: "Analyzing..." },
          { stepNumber: 2, type: "tool_call", name: "search", output: { results: [] }, durationMs: 150 },
          { stepNumber: 3, type: "response", output: "The answer is 42", durationMs: 50 },
        ],
      }
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify(mockResult), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.getRunResult("run-1")

      expect(result.data).toEqual(mockResult)
      expect(result.data?.steps).toHaveLength(3)
      expect(result.data?.steps[1].durationMs).toBe(150)
    })

    it("returns error for failed run", async () => {
      const failedResult: AgentRunResult = {
        id: "run-failed",
        agentId: "agent-1",
        status: "failed",
        error: { code: "AGENT_ERROR", message: "Agent execution failed" },
        completedAt: "2024-01-01T00:05:00Z",
        steps: [{ stepNumber: 1, type: "error", output: "Fatal error occurred" }],
      }
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify(failedResult), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.getRunResult("run-failed")

      expect(result.data?.status).toBe("failed")
      expect(result.data?.error).toBeDefined()
    })

    it("handles empty steps array", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              id: "run-1",
              agentId: "agent-1",
              status: "canceled",
              steps: [],
            }),
            { status: 200 }
          )
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.getRunResult("run-1")

      expect(result.data?.steps).toEqual([])
    })
  })

  // ============================================================================
  // Agents - Provide Input
  // ============================================================================
  describe("agents.provideInput", () => {
    it("makes POST request to /api/v1/runs/:runId/input", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      await client.agents.provideInput("run-awaiting", { input: { userChoice: "option1" } })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe("https://api.test.com/api/v1/runs/run-awaiting/input")
      expect(options.method).toBe("POST")
      expect(JSON.parse(options.body)).toEqual({ input: { userChoice: "option1" } })
    })

    it("returns success on valid input", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.provideInput("run-1", { input: "user response" })

      expect(result.data).toEqual({ success: true })
      expect(result.error).toBeNull()
    })

    it("returns error when run is not awaiting input", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Run is not awaiting input" }), { status: 400 })
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.provideInput("run-not-waiting", { input: "data" })

      expect(result.data).toBeNull()
      expect(result.error).toEqual({ error: "Run is not awaiting input" })
      expect(result.status).toBe(400)
    })

    it("handles complex input objects", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const complexInput = {
        selectedOption: "A",
        additionalData: { nested: { value: 123 } },
        items: [1, 2, 3],
      }
      await client.agents.provideInput("run-1", { input: complexInput })

      const [, options] = mockFetch.mock.calls[0]
      expect(JSON.parse(options.body).input).toEqual(complexInput)
    })

    it("handles string input", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      await client.agents.provideInput("run-1", { input: "simple string response" })

      const [, options] = mockFetch.mock.calls[0]
      expect(JSON.parse(options.body).input).toBe("simple string response")
    })

    it("returns 404 for non-existent run", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Run not found" }), { status: 404 })
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.provideInput("non-existent", { input: "data" })

      expect(result.status).toBe(404)
    })
  })

  // ============================================================================
  // Agents - Cancel Run
  // ============================================================================
  describe("agents.cancelRun", () => {
    it("makes POST request to /api/v1/runs/:runId/cancel", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      await client.agents.cancelRun("run-to-cancel")

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe("https://api.test.com/api/v1/runs/run-to-cancel/cancel")
      expect(options.method).toBe("POST")
    })

    it("returns success when run is canceled", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.cancelRun("run-1")

      expect(result.data).toEqual({ success: true })
      expect(result.error).toBeNull()
    })

    it("returns error for already completed run", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Cannot cancel run (not found or already completed)" }), { status: 400 })
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.cancelRun("completed-run")

      expect(result.data).toBeNull()
      expect(result.error?.error).toContain("Cannot cancel")
      expect(result.status).toBe(400)
    })

    it("returns error for non-existent run", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Cannot cancel run (not found or already completed)" }), { status: 400 })
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.cancelRun("non-existent")

      expect(result.status).toBe(400)
    })
  })

  // ============================================================================
  // Agents - Wait For Result
  // ============================================================================
  describe("agents.waitForResult", () => {
    it("returns immediately when run is complete", async () => {
      const mockResult = {
        id: "run-1",
        agentId: "agent-1",
        status: "succeeded",
        result: { output: "done" },
        completedAt: "2024-01-01",
        steps: [],
      }
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify(mockResult), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.waitForResult("run-1")

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result.status).toBe("succeeded")
      expect(result.result).toEqual({ output: "done" })
    })

    it("polls until run completes", async () => {
      let callCount = 0
      mockFetch.mockImplementation(() => {
        callCount++
        if (callCount < 3) {
          return Promise.resolve(
            new Response(JSON.stringify({ error: "Run not completed", status: "running" }), { status: 202 })
          )
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "run-1",
              agentId: "agent-1",
              status: "succeeded",
              result: {},
              completedAt: "2024-01-01",
              steps: [],
            }),
            { status: 200 }
          )
        )
      })

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.waitForResult("run-1", { intervalMs: 10 })

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(result.status).toBe("succeeded")
    })

    it("throws after max attempts", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Run not completed", status: "running" }), { status: 202 })
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })

      await expect(
        client.agents.waitForResult("slow-run", { maxAttempts: 3, intervalMs: 10 })
      ).rejects.toThrow("did not complete within 3 attempts")
    })

    it("throws on error response", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ error: "Run execution failed" }), { status: 500 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })

      await expect(client.agents.waitForResult("failed-run")).rejects.toThrow("Run execution failed")
    })

    it("uses default maxAttempts of 120", async () => {
      let callCount = 0
      mockFetch.mockImplementation(() => {
        callCount++
        if (callCount <= 5) {
          return Promise.resolve(
            new Response(JSON.stringify({ error: "Run not completed", status: "running" }), { status: 202 })
          )
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "run-1",
              agentId: "agent-1",
              status: "succeeded",
              result: {},
              steps: [],
            }),
            { status: 200 }
          )
        )
      })

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.waitForResult("run-1", { intervalMs: 1 })

      expect(result.status).toBe("succeeded")
    })

    it("returns failed run result without throwing", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              id: "run-failed",
              agentId: "agent-1",
              status: "failed",
              result: null,
              error: { message: "Agent error" },
              completedAt: "2024-01-01",
              steps: [],
            }),
            { status: 200 }
          )
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.waitForResult("run-failed")

      expect(result.status).toBe("failed")
      expect(result.error).toEqual({ message: "Agent error" })
    })

    it("handles canceled run", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              id: "run-canceled",
              agentId: "agent-1",
              status: "canceled",
              completedAt: "2024-01-01",
              steps: [],
            }),
            { status: 200 }
          )
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.waitForResult("run-canceled")

      expect(result.status).toBe("canceled")
    })

    it("handles timed_out run", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              id: "run-timeout",
              agentId: "agent-1",
              status: "timed_out",
              error: { message: "Execution timed out" },
              completedAt: "2024-01-01",
              steps: [],
            }),
            { status: 200 }
          )
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.waitForResult("run-timeout")

      expect(result.status).toBe("timed_out")
    })

    it("transitions through multiple statuses before completing", async () => {
      let callCount = 0
      const statuses = ["queued", "initializing", "running", "succeeded"]
      mockFetch.mockImplementation(() => {
        callCount++
        const status = statuses[Math.min(callCount - 1, statuses.length - 1)]
        if (status !== "succeeded") {
          return Promise.resolve(
            new Response(JSON.stringify({ error: "Run not completed", status }), { status: 202 })
          )
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "run-1",
              agentId: "agent-1",
              status: "succeeded",
              result: { final: true },
              steps: [],
            }),
            { status: 200 }
          )
        )
      })

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.waitForResult("run-1", { intervalMs: 1 })

      expect(result.status).toBe("succeeded")
      expect(callCount).toBeGreaterThanOrEqual(4)
    })
  })

  // ============================================================================
  // Agents - Stream Run
  // ============================================================================
  describe("agents.streamRun", () => {
    it("returns EventSource for stream URL", () => {
      const originalEventSource = globalThis.EventSource
      const mockEventSource = mock(() => ({
        url: "",
        close: () => {},
      }))
      globalThis.EventSource = mockEventSource as unknown as typeof EventSource

      try {
        const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
        client.agents.streamRun("run-123")

        expect(mockEventSource).toHaveBeenCalledTimes(1)
        expect(mockEventSource.mock.calls[0][0]).toBe("https://api.test.com/api/v1/runs/run-123/stream")
      } finally {
        globalThis.EventSource = originalEventSource
      }
    })

    it("constructs correct stream URL with special characters in run ID", () => {
      const originalEventSource = globalThis.EventSource
      const mockEventSource = mock(() => ({
        url: "",
        close: () => {},
      }))
      globalThis.EventSource = mockEventSource as unknown as typeof EventSource

      try {
        const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
        client.agents.streamRun("run_with-special.chars")

        expect(mockEventSource.mock.calls[0][0]).toBe(
          "https://api.test.com/api/v1/runs/run_with-special.chars/stream"
        )
      } finally {
        globalThis.EventSource = originalEventSource
      }
    })
  })

  // ============================================================================
  // Type Safety Tests
  // ============================================================================
  describe("type safety", () => {
    it("ApiResponse structure is consistent", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ tenantId: "t1", keyId: "k1", scopes: [] }), { status: 200 })
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result: ApiResponse<WhoamiResponse> = await client.whoami()

      expect(result).toHaveProperty("data")
      expect(result).toHaveProperty("error")
      expect(result).toHaveProperty("status")
    })

    it("Job type includes all required fields", async () => {
      const mockJob: Job = {
        id: "job-1",
        type: "test",
        status: "queued",
        createdAt: "2024-01-01",
      }
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify(mockJob), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.jobs.get("job-1")

      expect(result.data?.id).toBeDefined()
      expect(result.data?.type).toBeDefined()
      expect(result.data?.status).toBeDefined()
      expect(result.data?.createdAt).toBeDefined()
    })

    it("AgentRun type includes all required fields", async () => {
      const mockRun: AgentRun = {
        runId: "run-1",
        agentId: "agent-1",
        status: "queued",
        createdAt: "2024-01-01",
      }
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify(mockRun), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.run("agent-1", { prompt: "test" })

      expect(result.data?.runId).toBeDefined()
      expect(result.data?.agentId).toBeDefined()
      expect(result.data?.status).toBeDefined()
      expect(result.data?.createdAt).toBeDefined()
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe("edge cases", () => {
    it("handles extremely large response", async () => {
      const largeSteps = Array.from({ length: 100 }, (_, i) => ({
        stepNumber: i + 1,
        type: "tool_call",
        name: `tool_${i}`,
        output: { data: "x".repeat(1000) },
      }))
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              id: "run-1",
              agentId: "agent-1",
              status: "succeeded",
              result: { large: "x".repeat(10000) },
              steps: largeSteps,
            }),
            { status: 200 }
          )
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.getRunResult("run-1")

      expect(result.data?.steps).toHaveLength(100)
    })

    it("handles null values in response", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              id: "run-1",
              agentId: "agent-1",
              status: "succeeded",
              result: null,
              error: null,
              completedAt: null,
              totalTokens: null,
              totalCostCents: null,
              steps: [],
            }),
            { status: 200 }
          )
        )
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const result = await client.agents.getRunResult("run-1")

      expect(result.data?.result).toBeNull()
      expect(result.data?.completedAt).toBeNull()
    })

    it("handles concurrent requests", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
      )

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })
      const promises = [
        client.agents.run("agent-1", { prompt: "test1" }),
        client.agents.run("agent-2", { prompt: "test2" }),
        client.agents.run("agent-3", { prompt: "test3" }),
      ]

      const results = await Promise.all(promises)

      expect(results).toHaveLength(3)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it("handles rapid sequential requests", async () => {
      let counter = 0
      mockFetch.mockImplementation(() => {
        counter++
        return Promise.resolve(
          new Response(JSON.stringify({ id: `job-${counter}` }), { status: 200 })
        )
      })

      const client = createClient("sk_live_test", { baseUrl: "https://api.test.com" })

      for (let i = 0; i < 10; i++) {
        await client.jobs.create({ type: `test-${i}` })
      }

      expect(mockFetch).toHaveBeenCalledTimes(10)
    })
  })
})
