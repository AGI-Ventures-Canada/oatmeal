import { describe, expect, it, mock, beforeEach, afterEach, spyOn } from "bun:test"
import { OatmealClient } from "../../src/client"

const mockFetch = mock<typeof globalThis.fetch>()
const originalFetch = globalThis.fetch

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("jobs commands", () => {
  let consoleLogSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    mockFetch.mockReset()
    globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch
    consoleLogSpy = spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    consoleLogSpy.mockRestore()
  })

  describe("list", () => {
    it("displays jobs with status", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          jobs: [{ id: "j1", type: "analysis", status: "completed", created_at: "2026-01-01" }],
        })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runJobsList } = await import("../../src/commands/jobs/list")
      await runJobsList(client, [], { json: false })
      expect(consoleLogSpy.mock.calls[0][0]).toContain("analysis")
    })

    it("passes --limit flag", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ jobs: [] }))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runJobsList } = await import("../../src/commands/jobs/list")
      await runJobsList(client, ["--limit", "5"], { json: false })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain("limit=5")
    })
  })

  describe("get", () => {
    it("shows job details", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ id: "j1", type: "analysis", status: "running" })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runJobsGet } = await import("../../src/commands/jobs/get")
      await runJobsGet(client, "j1", { json: false })
      expect(consoleLogSpy.mock.calls[0][0]).toContain("running")
    })
  })

  describe("create", () => {
    it("creates job with --type flag", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ id: "j2", type: "analysis", status: "pending" })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runJobsCreate } = await import("../../src/commands/jobs/create")
      await runJobsCreate(client, ["--type", "analysis", "--input", '{"hackathon_id":"h1"}'])

      const init = mockFetch.mock.calls[0][1] as RequestInit
      const body = JSON.parse(init.body as string)
      expect(body.type).toBe("analysis")
      expect(body.input.hackathon_id).toBe("h1")
    })
  })

  describe("result", () => {
    it("shows result for completed job", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ status: "completed", result: { score: 95 } })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runJobsResult } = await import("../../src/commands/jobs/result")
      await runJobsResult(client, "j1", [])

      const output = consoleLogSpy.mock.calls[0][0]
      expect(JSON.parse(output).result.score).toBe(95)
    })

    it("shows still running for pending job", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ status: "running" }))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runJobsResult } = await import("../../src/commands/jobs/result")
      await runJobsResult(client, "j1", [])

      expect(consoleLogSpy.mock.calls[0][0]).toContain("still running")
    })
  })

  describe("cancel", () => {
    it("cancels with --yes", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runJobsCancel } = await import("../../src/commands/jobs/cancel")
      await runJobsCancel(client, "j1", { yes: true })

      const init = mockFetch.mock.calls[0][1] as RequestInit
      expect(init.method).toBe("POST")
    })
  })
})
