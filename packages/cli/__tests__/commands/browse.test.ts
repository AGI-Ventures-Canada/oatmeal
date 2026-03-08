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

describe("browse commands", () => {
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

  describe("browse hackathons", () => {
    it("fetches from public endpoint without auth", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ hackathons: [{ name: "Test Hack", slug: "test-hack", status: "active" }] })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost" })
      const { runBrowseHackathons } = await import("../../src/commands/browse/hackathons")
      await runBrowseHackathons(client, [])

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain("/api/public/hackathons")
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it("--json outputs raw JSON", async () => {
      const data = { hackathons: [{ name: "Test" }] }
      mockFetch.mockResolvedValueOnce(jsonResponse(data))
      const client = new OatmealClient({ baseUrl: "http://localhost" })
      const { runBrowseHackathons } = await import("../../src/commands/browse/hackathons")
      await runBrowseHackathons(client, ["--json"])

      const output = consoleLogSpy.mock.calls[0][0]
      expect(JSON.parse(output)).toEqual(data)
    })

    it("--search passes query parameter", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ hackathons: [] }))
      const client = new OatmealClient({ baseUrl: "http://localhost" })
      const { runBrowseHackathons } = await import("../../src/commands/browse/hackathons")
      await runBrowseHackathons(client, ["--search", "ai"])

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain("q=ai")
    })

    it("shows 'no hackathons found' for empty results", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ hackathons: [] }))
      const client = new OatmealClient({ baseUrl: "http://localhost" })
      const { runBrowseHackathons } = await import("../../src/commands/browse/hackathons")
      await runBrowseHackathons(client, [])

      expect(consoleLogSpy.mock.calls[0][0]).toContain("No hackathons found")
    })
  })

  describe("browse submissions", () => {
    it("fetches submissions for hackathon", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ submissions: [{ name: "Project A", team_name: "Team 1" }] })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost" })
      const { runBrowseSubmissions } = await import("../../src/commands/browse/submissions")
      await runBrowseSubmissions(client, "my-hack", { json: false })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain("/api/public/hackathons/my-hack/submissions")
    })
  })

  describe("browse results", () => {
    it("shows published results", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          published: true,
          rankings: [{ rank: 1, submission_name: "Winner", total_score: 95 }],
        })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost" })
      const { runBrowseResults } = await import("../../src/commands/browse/results")
      await runBrowseResults(client, "my-hack", { json: false })

      expect(consoleLogSpy.mock.calls[0][0]).toContain("Winner")
    })

    it("handles unpublished results", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ published: false }))
      const client = new OatmealClient({ baseUrl: "http://localhost" })
      const { runBrowseResults } = await import("../../src/commands/browse/results")
      await runBrowseResults(client, "my-hack", { json: false })

      expect(consoleLogSpy.mock.calls[0][0]).toContain("not been published")
    })
  })

  describe("browse org", () => {
    it("shows org profile", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ name: "Test Org", slug: "test-org", hackathon_count: 5 })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost" })
      const { runBrowseOrg } = await import("../../src/commands/browse/org")
      await runBrowseOrg(client, "test-org", { json: false })

      expect(consoleLogSpy.mock.calls[0][0]).toContain("Test Org")
    })
  })
})
