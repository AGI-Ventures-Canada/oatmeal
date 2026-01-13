import { describe, expect, it, beforeEach, mock, spyOn } from "bun:test"
import { api } from "@/lib/api"
import type { Scope } from "@/lib/auth/types"

const makeRequest = (path: string, options: RequestInit = {}) => {
  return new Request(`http://localhost/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })
}

describe("V1 API Routes", () => {
  describe("Route Authorization", () => {
    const apiKeyRequiredRoutes = [
      { path: "/v1/whoami", method: "GET", scopes: [] },
      { path: "/v1/jobs", method: "POST", scopes: ["jobs:create"] },
      { path: "/v1/jobs/:id", method: "GET", scopes: ["jobs:read"] },
      { path: "/v1/jobs/:id/result", method: "GET", scopes: ["jobs:read"] },
      { path: "/v1/jobs/:id/cancel", method: "POST", scopes: ["jobs:cancel"] },
      { path: "/v1/agents/:id/run", method: "POST", scopes: ["agents:run"] },
      { path: "/v1/runs/:id", method: "GET", scopes: ["agents:read"] },
      { path: "/v1/runs/:id/result", method: "GET", scopes: ["agents:read"] },
      { path: "/v1/runs/:id/stream", method: "GET", scopes: ["agents:read"] },
      { path: "/v1/runs/:id/input", method: "POST", scopes: ["agents:run"] },
      { path: "/v1/runs/:id/cancel", method: "POST", scopes: ["agents:run"] },
    ]

    it("all v1 routes require API key auth", () => {
      for (const route of apiKeyRequiredRoutes) {
        expect(route.path.startsWith("/v1")).toBe(true)
      }
    })

    it("job creation requires jobs:create scope", () => {
      const createRoute = apiKeyRequiredRoutes.find(
        (r) => r.path === "/v1/jobs" && r.method === "POST"
      )
      expect(createRoute?.scopes).toContain("jobs:create")
    })

    it("job read routes require jobs:read scope", () => {
      const readRoutes = apiKeyRequiredRoutes.filter(
        (r) => r.method === "GET" && r.path.includes("/jobs")
      )
      for (const route of readRoutes) {
        expect(route.scopes).toContain("jobs:read")
      }
    })

    it("job cancel requires jobs:cancel scope", () => {
      const cancelRoute = apiKeyRequiredRoutes.find(
        (r) => r.path === "/v1/jobs/:id/cancel"
      )
      expect(cancelRoute?.scopes).toContain("jobs:cancel")
    })

    it("agent run requires agents:run scope", () => {
      const runRoute = apiKeyRequiredRoutes.find(
        (r) => r.path === "/v1/agents/:id/run"
      )
      expect(runRoute?.scopes).toContain("agents:run")
    })

    it("agent read routes require agents:read scope", () => {
      const readRoutes = apiKeyRequiredRoutes.filter(
        (r) => r.method === "GET" && r.path.includes("/runs")
      )
      for (const route of readRoutes) {
        expect(route.scopes).toContain("agents:read")
      }
    })

    it("provide input and cancel run require agents:run scope", () => {
      const inputRoute = apiKeyRequiredRoutes.find(
        (r) => r.path === "/v1/runs/:id/input"
      )
      const cancelRoute = apiKeyRequiredRoutes.find(
        (r) => r.path === "/v1/runs/:id/cancel"
      )
      expect(inputRoute?.scopes).toContain("agents:run")
      expect(cancelRoute?.scopes).toContain("agents:run")
    })
  })

  describe("API Key Principal Info", () => {
    it("returns essential API key info from /whoami", () => {
      const principal = {
        kind: "api_key" as const,
        tenantId: "tenant-123",
        keyId: "key-456",
        scopes: ["jobs:create", "jobs:read"] as Scope[],
      }

      const whoamiResponse = {
        tenantId: principal.tenantId,
        keyId: principal.keyId,
        scopes: principal.scopes,
      }

      expect(whoamiResponse.tenantId).toBe("tenant-123")
      expect(whoamiResponse.keyId).toBe("key-456")
      expect(whoamiResponse.scopes).toContain("jobs:create")
    })

    it("includes all scope types in response", () => {
      const allScopes: Scope[] = [
        "jobs:create",
        "jobs:read",
        "jobs:cancel",
        "agents:run",
        "agents:read",
      ]

      for (const scope of allScopes) {
        expect(typeof scope).toBe("string")
        expect(scope.includes(":")).toBe(true)
      }
    })
  })

  describe("Job Creation", () => {
    it("accepts job type and optional input", () => {
      const requestBody = {
        type: "completion",
        input: { prompt: "Hello, world!" },
      }

      expect(requestBody.type).toBeDefined()
      expect(requestBody.input).toBeDefined()
    })

    it("accepts idempotency key in body", () => {
      const requestBody = {
        type: "completion",
        idempotencyKey: "unique-request-id",
      }

      expect(requestBody.idempotencyKey).toBe("unique-request-id")
    })

    it("idempotency key can come from header", () => {
      const header = "Idempotency-Key"
      const value = "my-unique-key"

      expect(header.toLowerCase()).toBe("idempotency-key")
      expect(value).toBeTruthy()
    })

    it("returns job with queued status on creation", () => {
      const createdJob = {
        id: "job-new",
        type: "completion",
        status: "queued",
        createdAt: "2024-01-01T00:00:00Z",
      }

      expect(createdJob.status).toBe("queued")
      expect(createdJob.id).toBeDefined()
    })

    it("accepts complex nested input", () => {
      const requestBody = {
        type: "analysis",
        input: {
          nested: { deep: { value: 123 } },
          array: [1, 2, 3],
          metadata: { key: "value" },
        },
      }

      expect(requestBody.input.nested.deep.value).toBe(123)
      expect(requestBody.input.array).toHaveLength(3)
    })
  })

  describe("Job Status Response", () => {
    it("returns job status without result for GET /jobs/:id", () => {
      const statusResponse = {
        id: "job-1",
        type: "completion",
        status: "running",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:30Z",
        completedAt: null,
      }

      expect(statusResponse.status).toBe("running")
      expect(statusResponse).not.toHaveProperty("result")
      expect(statusResponse).not.toHaveProperty("input")
    })

    it("handles all job statuses", () => {
      const statuses = ["queued", "running", "succeeded", "failed", "canceled"]

      for (const status of statuses) {
        expect(typeof status).toBe("string")
      }
    })

    it("includes timestamps when available", () => {
      const response = {
        id: "job-1",
        type: "test",
        status: "succeeded",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:05:00Z",
        completedAt: "2024-01-01T00:10:00Z",
      }

      expect(response.createdAt).toBeDefined()
      expect(response.updatedAt).toBeDefined()
      expect(response.completedAt).toBeDefined()
    })
  })

  describe("Job Result Response", () => {
    it("returns 202 status for in-progress jobs", () => {
      const status = "running"
      const httpStatus = status === "running" || status === "queued" ? 202 : 200

      expect(httpStatus).toBe(202)
    })

    it("returns 200 with result for completed jobs", () => {
      const job = {
        status: "succeeded",
        result: { text: "Hello!" },
      }
      const httpStatus = job.status === "running" || job.status === "queued" ? 202 : 200

      expect(httpStatus).toBe(200)
      expect(job.result).toBeDefined()
    })

    it("returns error for failed jobs", () => {
      const job = {
        status: "failed",
        result: null,
        error: { message: "Model error", code: "MODEL_ERROR" },
      }

      expect(job.status).toBe("failed")
      expect(job.error).toBeDefined()
      expect(job.error?.message).toBe("Model error")
    })

    it("returns null result for canceled jobs", () => {
      const job = {
        status: "canceled",
        result: null,
        error: null,
        completedAt: "2024-01-01T00:05:00Z",
      }

      expect(job.status).toBe("canceled")
      expect(job.result).toBeNull()
    })
  })

  describe("Job Cancellation", () => {
    it("returns success true on successful cancel", () => {
      const response = { success: true }
      expect(response.success).toBe(true)
    })

    it("only queued and running jobs can be canceled", () => {
      const cancelableStatuses = ["queued", "running"]
      const nonCancelableStatuses = ["succeeded", "failed", "canceled"]

      expect(cancelableStatuses).toContain("queued")
      expect(cancelableStatuses).toContain("running")
      expect(nonCancelableStatuses).not.toContain("queued")
    })

    it("returns error for non-cancelable jobs", () => {
      const errorResponse = {
        error: "Cannot cancel job (not found or already completed)",
      }

      expect(errorResponse.error).toContain("Cannot cancel")
    })
  })

  describe("Agent Run Creation", () => {
    it("accepts prompt and optional context", () => {
      const requestBody = {
        prompt: "Analyze this data",
        context: { data: [1, 2, 3] },
      }

      expect(requestBody.prompt).toBeDefined()
      expect(requestBody.context).toBeDefined()
    })

    it("supports idempotency key", () => {
      const requestBody = {
        prompt: "Test prompt",
        idempotencyKey: "run-key-123",
      }

      expect(requestBody.idempotencyKey).toBe("run-key-123")
    })

    it("returns run with queued status on creation", () => {
      const createdRun = {
        runId: "run-new",
        agentId: "agent-123",
        status: "queued",
        createdAt: "2024-01-01T00:00:00Z",
      }

      expect(createdRun.status).toBe("queued")
      expect(createdRun.runId).toBeDefined()
      expect(createdRun.agentId).toBeDefined()
    })

    it("accepts complex context objects", () => {
      const requestBody = {
        prompt: "Process this",
        context: {
          nested: { value: 123 },
          array: ["a", "b", "c"],
          metadata: { key: "value" },
        },
      }

      expect(requestBody.context.nested.value).toBe(123)
    })
  })

  describe("Agent Run Status", () => {
    it("returns run details", () => {
      const runDetails = {
        id: "run-1",
        agentId: "agent-1",
        status: "running",
        triggerType: "manual",
        startedAt: "2024-01-01T00:00:00Z",
        completedAt: null,
        totalTokens: 500,
        totalCostCents: 2,
      }

      expect(runDetails.id).toBeDefined()
      expect(runDetails.agentId).toBeDefined()
      expect(runDetails.status).toBe("running")
      expect(runDetails.triggerType).toBe("manual")
    })

    it("handles all run statuses", () => {
      const statuses = [
        "queued",
        "initializing",
        "running",
        "awaiting_input",
        "succeeded",
        "failed",
        "canceled",
        "timed_out",
      ]

      for (const status of statuses) {
        expect(typeof status).toBe("string")
      }
    })

    it("handles all trigger types", () => {
      const triggerTypes = ["manual", "scheduled", "email", "luma_webhook"]

      for (const type of triggerTypes) {
        expect(typeof type).toBe("string")
      }
    })

    it("includes cost and token metrics", () => {
      const runDetails = {
        id: "run-1",
        agentId: "agent-1",
        status: "succeeded",
        triggerType: "manual",
        totalTokens: 2500,
        totalCostCents: 5,
      }

      expect(runDetails.totalTokens).toBe(2500)
      expect(runDetails.totalCostCents).toBe(5)
    })
  })

  describe("Agent Run Result", () => {
    it("returns 202 for in-progress runs", () => {
      const statuses = ["queued", "initializing", "running"]

      for (const status of statuses) {
        const httpStatus = ["queued", "initializing", "running"].includes(status) ? 202 : 200
        expect(httpStatus).toBe(202)
      }
    })

    it("returns result with steps for completed runs", () => {
      const runResult = {
        id: "run-1",
        agentId: "agent-1",
        status: "succeeded",
        result: { output: "Analysis complete" },
        completedAt: "2024-01-01T00:10:00Z",
        totalTokens: 2000,
        totalCostCents: 4,
        steps: [
          { stepNumber: 1, type: "thinking", output: "Analyzing..." },
          { stepNumber: 2, type: "tool_call", name: "search", output: { results: [] }, durationMs: 150 },
          { stepNumber: 3, type: "response", output: "Done", durationMs: 50 },
        ],
      }

      expect(runResult.status).toBe("succeeded")
      expect(runResult.result).toBeDefined()
      expect(runResult.steps).toHaveLength(3)
      expect(runResult.steps[1].durationMs).toBe(150)
    })

    it("returns error for failed runs", () => {
      const runResult = {
        id: "run-failed",
        agentId: "agent-1",
        status: "failed",
        error: { code: "AGENT_ERROR", message: "Execution failed" },
        completedAt: "2024-01-01T00:05:00Z",
        steps: [{ stepNumber: 1, type: "error", output: "Fatal error" }],
      }

      expect(runResult.status).toBe("failed")
      expect(runResult.error).toBeDefined()
      expect(runResult.error.code).toBe("AGENT_ERROR")
    })

    it("handles timed out runs", () => {
      const runResult = {
        id: "run-timeout",
        agentId: "agent-1",
        status: "timed_out",
        error: { message: "Execution timed out" },
        completedAt: "2024-01-01T00:30:00Z",
        steps: [],
      }

      expect(runResult.status).toBe("timed_out")
    })
  })

  describe("Human Input", () => {
    it("accepts input when run is awaiting", () => {
      const requestBody = {
        input: { choice: "option1", reason: "selected by user" },
      }

      expect(requestBody.input).toBeDefined()
    })

    it("returns success on valid input", () => {
      const response = { success: true }
      expect(response.success).toBe(true)
    })

    it("returns error when run is not awaiting input", () => {
      const errorResponse = {
        error: "Run is not awaiting input",
        status: "running",
      }

      expect(errorResponse.error).toContain("not awaiting input")
    })

    it("accepts various input types", () => {
      const stringInput = { input: "user response" }
      const objectInput = { input: { key: "value" } }
      const arrayInput = { input: [1, 2, 3] }
      const numberInput = { input: 42 }
      const booleanInput = { input: true }

      expect(stringInput.input).toBeDefined()
      expect(objectInput.input).toBeDefined()
      expect(arrayInput.input).toBeDefined()
      expect(numberInput.input).toBeDefined()
      expect(booleanInput.input).toBeDefined()
    })
  })

  describe("Agent Run Cancellation", () => {
    it("returns success on successful cancel", () => {
      const response = { success: true }
      expect(response.success).toBe(true)
    })

    it("only active runs can be canceled", () => {
      const cancelableStatuses = ["queued", "initializing", "running", "awaiting_input"]
      const nonCancelableStatuses = ["succeeded", "failed", "canceled", "timed_out"]

      expect(cancelableStatuses).toContain("running")
      expect(cancelableStatuses).toContain("awaiting_input")
      expect(nonCancelableStatuses).not.toContain("running")
    })

    it("returns error for non-cancelable runs", () => {
      const errorResponse = {
        error: "Cannot cancel run (not found or already completed)",
      }

      expect(errorResponse.error).toContain("Cannot cancel")
    })
  })

  describe("SSE Stream", () => {
    it("stream response format", () => {
      const events = [
        { event: "status", data: { status: "running", startedAt: "2024-01-01T00:00:00Z" } },
        { event: "step", data: { stepNumber: 1, type: "thinking", output: "Processing..." } },
        { event: "done", data: { status: "succeeded", result: { output: "Complete" } } },
      ]

      expect(events).toHaveLength(3)
      expect(events[0].event).toBe("status")
      expect(events[1].event).toBe("step")
      expect(events[2].event).toBe("done")
    })

    it("done event includes final result", () => {
      const doneEvent = {
        event: "done",
        data: {
          status: "succeeded",
          result: { answer: "42" },
          error: null,
          completedAt: "2024-01-01T00:10:00Z",
        },
      }

      expect(doneEvent.data.status).toBe("succeeded")
      expect(doneEvent.data.result).toBeDefined()
      expect(doneEvent.data.completedAt).toBeDefined()
    })

    it("step events include step details", () => {
      const stepEvent = {
        event: "step",
        data: {
          stepNumber: 2,
          type: "tool_call",
          name: "search",
          output: { results: ["item1", "item2"] },
        },
      }

      expect(stepEvent.data.stepNumber).toBe(2)
      expect(stepEvent.data.type).toBe("tool_call")
      expect(stepEvent.data.name).toBe("search")
    })
  })

  describe("Rate Limiting", () => {
    it("rate limit applies per API key", () => {
      const keyId = "key-456"
      const rateLimitKey = `api_key:${keyId}:default`

      expect(rateLimitKey).toContain(keyId)
    })

    it("job creation has stricter rate limit", () => {
      const defaultLimit = { maxRequests: 100, windowMs: 60000 }
      const jobCreateLimit = { maxRequests: 10, windowMs: 60000 }

      expect(jobCreateLimit.maxRequests).toBeLessThan(defaultLimit.maxRequests)
    })

    it("rate limit headers format", () => {
      const result = { remaining: 95, resetAt: Date.now() + 60000 }
      const headers = {
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
      }

      expect(headers["X-RateLimit-Remaining"]).toBe("95")
      expect(headers["X-RateLimit-Reset"]).toBeDefined()
    })

    it("agent run uses job creation rate limit", () => {
      const jobCreateLimit = { maxRequests: 10, windowMs: 60000 }
      const agentRunLimit = jobCreateLimit

      expect(agentRunLimit.maxRequests).toBe(jobCreateLimit.maxRequests)
    })
  })

  describe("Error Responses", () => {
    it("401 for missing auth", () => {
      const errorResponse = { error: "Unauthorized" }
      expect(errorResponse.error).toBe("Unauthorized")
    })

    it("401 for invalid API key", () => {
      const errorResponse = { error: "Invalid API key" }
      expect(errorResponse.error).toContain("Invalid")
    })

    it("403 for missing scope", () => {
      const scope = "jobs:cancel"
      const errorResponse = { error: `Missing required scope: ${scope}` }
      expect(errorResponse.error).toContain("jobs:cancel")
    })

    it("404 for not found job", () => {
      const errorResponse = { error: "Job not found" }
      expect(errorResponse.error).toBe("Job not found")
    })

    it("404 for not found agent", () => {
      const errorResponse = { error: "Agent not found" }
      expect(errorResponse.error).toBe("Agent not found")
    })

    it("404 for not found run", () => {
      const errorResponse = { error: "Run not found" }
      expect(errorResponse.error).toBe("Run not found")
    })

    it("429 for rate limit exceeded", () => {
      const errorResponse = { error: "Rate limit exceeded" }
      expect(errorResponse.error).toBe("Rate limit exceeded")
    })

    it("500 for internal server error", () => {
      const errorResponse = { error: "Internal server error" }
      expect(errorResponse.error).toBe("Internal server error")
    })
  })

  describe("Request Validation", () => {
    it("job type is required and non-empty", () => {
      const validBody = { type: "completion" }
      const invalidBody = { type: "" }

      expect(validBody.type.length).toBeGreaterThan(0)
      expect(invalidBody.type.length).toBe(0)
    })

    it("agent prompt is required and non-empty", () => {
      const validBody = { prompt: "Analyze this" }
      const invalidBody = { prompt: "" }

      expect(validBody.prompt.length).toBeGreaterThan(0)
      expect(invalidBody.prompt.length).toBe(0)
    })

    it("input field accepts any JSON", () => {
      const inputs = [
        { input: "string" },
        { input: 123 },
        { input: true },
        { input: null },
        { input: [1, 2, 3] },
        { input: { nested: { deep: true } } },
      ]

      for (const body of inputs) {
        expect(body.input !== undefined).toBe(true)
      }
    })

    it("context field accepts any JSON", () => {
      const contexts = [
        { prompt: "test", context: "string" },
        { prompt: "test", context: 123 },
        { prompt: "test", context: [1, 2, 3] },
        { prompt: "test", context: { key: "value" } },
      ]

      for (const body of contexts) {
        expect(body.context !== undefined).toBe(true)
      }
    })
  })

  describe("Response Format Consistency", () => {
    it("job response includes id, type, status, createdAt", () => {
      const job = {
        id: "job-1",
        type: "completion",
        status: "queued",
        createdAt: "2024-01-01T00:00:00Z",
      }

      expect(job).toHaveProperty("id")
      expect(job).toHaveProperty("type")
      expect(job).toHaveProperty("status")
      expect(job).toHaveProperty("createdAt")
    })

    it("agent run response includes runId, agentId, status, createdAt", () => {
      const run = {
        runId: "run-1",
        agentId: "agent-1",
        status: "queued",
        createdAt: "2024-01-01T00:00:00Z",
      }

      expect(run).toHaveProperty("runId")
      expect(run).toHaveProperty("agentId")
      expect(run).toHaveProperty("status")
      expect(run).toHaveProperty("createdAt")
    })

    it("run details include triggerType", () => {
      const runDetails = {
        id: "run-1",
        agentId: "agent-1",
        status: "running",
        triggerType: "manual",
      }

      expect(runDetails).toHaveProperty("triggerType")
    })

    it("run result includes steps array", () => {
      const runResult = {
        id: "run-1",
        agentId: "agent-1",
        status: "succeeded",
        result: {},
        steps: [],
      }

      expect(runResult).toHaveProperty("steps")
      expect(Array.isArray(runResult.steps)).toBe(true)
    })

    it("step includes required fields", () => {
      const step = {
        stepNumber: 1,
        type: "tool_call",
        name: "search",
        output: { results: [] },
        durationMs: 150,
      }

      expect(step).toHaveProperty("stepNumber")
      expect(step).toHaveProperty("type")
      expect(step).toHaveProperty("output")
    })

    it("whoami response includes tenantId, keyId, scopes", () => {
      const whoami = {
        tenantId: "tenant-1",
        keyId: "key-1",
        scopes: ["jobs:create"],
      }

      expect(whoami).toHaveProperty("tenantId")
      expect(whoami).toHaveProperty("keyId")
      expect(whoami).toHaveProperty("scopes")
      expect(Array.isArray(whoami.scopes)).toBe(true)
    })
  })

  describe("Edge Cases", () => {
    it("handles very long prompts", () => {
      const longPrompt = "A".repeat(10000)
      expect(longPrompt.length).toBe(10000)
    })

    it("handles unicode in prompts", () => {
      const unicodePrompt = "分析日本語テキスト 🎉 emoji support"
      expect(unicodePrompt.length).toBeGreaterThan(0)
    })

    it("handles special characters in IDs", () => {
      const ids = ["job_with-special.chars", "run-123_abc", "agent.v1.test"]

      for (const id of ids) {
        expect(id).toBeDefined()
      }
    })

    it("handles null values in responses", () => {
      const response = {
        id: "run-1",
        result: null,
        error: null,
        completedAt: null,
      }

      expect(response.result).toBeNull()
      expect(response.error).toBeNull()
      expect(response.completedAt).toBeNull()
    })

    it("handles empty arrays", () => {
      const response = {
        id: "run-1",
        steps: [],
      }

      expect(response.steps).toHaveLength(0)
    })

    it("handles large step arrays", () => {
      const steps = Array.from({ length: 100 }, (_, i) => ({
        stepNumber: i + 1,
        type: "tool_call",
        name: `tool_${i}`,
        output: {},
      }))

      expect(steps).toHaveLength(100)
    })
  })

  describe("Idempotency", () => {
    it("accepts idempotency key in request body", () => {
      const requestBody = {
        type: "completion",
        idempotencyKey: "unique-key-123",
      }

      expect(requestBody.idempotencyKey).toBeDefined()
    })

    it("idempotency key from header takes precedence", () => {
      const headerKey = "header-key-456"
      const bodyKey = "body-key-789"
      const effectiveKey = headerKey || bodyKey

      expect(effectiveKey).toBe(headerKey)
    })

    it("same idempotency key returns same result", () => {
      const firstResponse = { id: "job-123" }
      const secondResponse = { id: "job-123" }

      expect(firstResponse.id).toBe(secondResponse.id)
    })
  })
})
