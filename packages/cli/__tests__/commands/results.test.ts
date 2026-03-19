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

describe("results commands", () => {
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

  describe("calculate", () => {
    it("sends calculate request", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ message: "Results calculated for 5 submissions" }))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runResultsCalculate } = await import("../../src/commands/results/calculate")
      await runResultsCalculate(client, hackathonId, { json: false })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain("/results/calculate")
    })
  })

  describe("get", () => {
    it("displays results table", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          results: [
            { rank: 1, submissionTitle: "Project A", teamName: "Team 1", totalScore: 95 },
            { rank: 2, submissionTitle: "Project B", teamName: "Team 2", totalScore: 87 },
          ],
        })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runResultsGet } = await import("../../src/commands/results/get")
      await runResultsGet(client, hackathonId, { json: false })

      expect(consoleLogSpy.mock.calls[0][0]).toContain("Project A")
    })

    it("--json outputs full results data", async () => {
      const data = { results: [{ rank: 1, submissionTitle: "A", totalScore: 95 }] }
      mockFetch.mockResolvedValueOnce(jsonResponse(data))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runResultsGet } = await import("../../src/commands/results/get")
      await runResultsGet(client, hackathonId, { json: true })

      const output = consoleLogSpy.mock.calls[0][0]
      expect(JSON.parse(output)).toEqual(data)
    })
  })

  describe("publish", () => {
    it("sends publish request with --yes", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runResultsPublish } = await import("../../src/commands/results/publish")
      await runResultsPublish(client, hackathonId, { yes: true })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain("/results/publish")
    })
  })

  describe("unpublish", () => {
    it("sends unpublish request with --yes", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runResultsUnpublish } = await import("../../src/commands/results/unpublish")
      await runResultsUnpublish(client, hackathonId, { yes: true })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain("/results/unpublish")
    })
  })
})
