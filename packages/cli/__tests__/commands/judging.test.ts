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

describe("judging commands", () => {
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

  const hackathonId = "h1"

  describe("criteria list", () => {
    it("fetches and displays criteria", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ criteria: [{ name: "Innovation", max_score: 10, weight: 1 }] })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runCriteriaList } = await import("../../src/commands/judging/criteria-list")
      await runCriteriaList(client, hackathonId, { json: false })
      expect(consoleLogSpy.mock.calls[0][0]).toContain("Innovation")
    })
  })

  describe("criteria create", () => {
    it("creates criteria with flags", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ id: "c1", name: "Design", max_score: 10, weight: 1 })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runCriteriaCreate } = await import("../../src/commands/judging/criteria-create")
      await runCriteriaCreate(client, hackathonId, ["--name", "Design", "--max-score", "10"])

      const init = mockFetch.mock.calls[0][1] as RequestInit
      const body = JSON.parse(init.body as string)
      expect(body.name).toBe("Design")
      expect(body.max_score).toBe(10)
    })
  })

  describe("judges list", () => {
    it("shows judges with progress", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          judges: [{ name: "Judge A", email: "a@test.com", completed_count: 3, total_count: 5 }],
        })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runJudgesList } = await import("../../src/commands/judging/judges-list")
      await runJudgesList(client, hackathonId, { json: false })
      expect(consoleLogSpy.mock.calls[0][0]).toContain("Judge A")
      expect(consoleLogSpy.mock.calls[0][0]).toContain("3/5")
    })
  })

  describe("judges add", () => {
    it("sends email to add judge", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ id: "j1", email: "judge@test.com" })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runJudgesAdd } = await import("../../src/commands/judging/judges-add")
      await runJudgesAdd(client, hackathonId, ["--email", "judge@test.com"])

      const init = mockFetch.mock.calls[0][1] as RequestInit
      const body = JSON.parse(init.body as string)
      expect(body.email).toBe("judge@test.com")
    })
  })

  describe("auto-assign", () => {
    it("sends request with --per-judge", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ created: 15 }))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runAutoAssign } = await import("../../src/commands/judging/auto-assign")
      await runAutoAssign(client, hackathonId, ["--per-judge", "3"])

      const init = mockFetch.mock.calls[0][1] as RequestInit
      const body = JSON.parse(init.body as string)
      expect(body.per_judge).toBe(3)
    })
  })

  describe("pick-results", () => {
    it("displays tally table", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          picks: [
            { submission_name: "Project A", pick_count: 3, judges: ["Judge 1", "Judge 2", "Judge 3"] },
          ],
        })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runPickResults } = await import("../../src/commands/judging/pick-results")
      await runPickResults(client, hackathonId, { json: false })
      expect(consoleLogSpy.mock.calls[0][0]).toContain("Project A")
    })
  })
})
