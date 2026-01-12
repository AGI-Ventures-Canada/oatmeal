import { describe, expect, it, beforeEach, mock } from "bun:test"
import { createClient } from "../src/index"

describe("SDK Client", () => {
  const mockFetch = mock(() => Promise.resolve(new Response("{}", { status: 200 })))

  beforeEach(() => {
    mockFetch.mockClear()
    globalThis.fetch = mockFetch
  })

  describe("createClient", () => {
    it("creates a client with default baseUrl", () => {
      const client = createClient("sk_live_test123")
      expect(client).toBeDefined()
      expect(client.whoami).toBeDefined()
      expect(client.jobs).toBeDefined()
    })

    it("creates a client with custom baseUrl", () => {
      const client = createClient("sk_live_test123", {
        baseUrl: "https://custom.example.com",
      })
      expect(client).toBeDefined()
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
  })

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

      const client = createClient("sk_live_test")
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

      const client = createClient("invalid_key")
      const result = await client.whoami()

      expect(result.data).toBeNull()
      expect(result.error).toEqual({ error: "Unauthorized" })
      expect(result.status).toBe(401)
    })
  })

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

      const client = createClient("sk_live_test")
      const result = await client.jobs.create({ type: "analyze" })

      expect(result.data).toEqual(mockJob)
      expect(result.error).toBeNull()
    })

    it("supports idempotencyKey", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ id: "job-1" }), { status: 200 }))
      )

      const client = createClient("sk_live_test")
      await client.jobs.create({ type: "test", idempotencyKey: "unique-key-123" })

      const [, options] = mockFetch.mock.calls[0]
      expect(JSON.parse(options.body).idempotencyKey).toBe("unique-key-123")
    })
  })

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

      const client = createClient("sk_live_test")
      const result = await client.jobs.get("non-existent")

      expect(result.data).toBeNull()
      expect(result.error).toEqual({ error: "Job not found" })
      expect(result.status).toBe(404)
    })
  })

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

      const client = createClient("sk_live_test")
      const result = await client.jobs.getResult("running-job")

      expect(result.status).toBe(202)
    })
  })

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

    it("returns error for already completed job", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Cannot cancel job (not found or already completed)" }), { status: 400 })
        )
      )

      const client = createClient("sk_live_test")
      const result = await client.jobs.cancel("completed-job")

      expect(result.data).toBeNull()
      expect(result.error?.error).toContain("Cannot cancel")
      expect(result.status).toBe(400)
    })
  })

  describe("jobs.waitForResult", () => {
    it("returns immediately when job is complete", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ id: "job-1", status: "succeeded", result: { output: "done" }, completedAt: "2024-01-01" }),
            { status: 200 }
          )
        )
      )

      const client = createClient("sk_live_test")
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
            JSON.stringify({ id: "job-1", status: "succeeded", result: {}, completedAt: "2024-01-01" }),
            { status: 200 }
          )
        )
      })

      const client = createClient("sk_live_test")
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

      const client = createClient("sk_live_test")

      await expect(
        client.jobs.waitForResult("slow-job", { maxAttempts: 3, intervalMs: 10 })
      ).rejects.toThrow("did not complete within 3 attempts")
    })

    it("throws on error response", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ error: "Job failed" }), { status: 500 }))
      )

      const client = createClient("sk_live_test")

      await expect(client.jobs.waitForResult("failed-job")).rejects.toThrow("Job failed")
    })
  })
})
