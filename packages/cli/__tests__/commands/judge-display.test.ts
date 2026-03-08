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

describe("judge-display commands", () => {
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

  describe("list", () => {
    it("shows display profiles", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          profiles: [{ name: "Dr. Smith", title: "CTO", bio: "Expert in AI" }],
        })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runJudgeDisplayList } = await import("../../src/commands/judge-display/list")
      await runJudgeDisplayList(client, hackathonId, { json: false })
      expect(consoleLogSpy.mock.calls[0][0]).toContain("Dr. Smith")
    })
  })

  describe("create", () => {
    it("creates profile with flags", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ id: "jd1", name: "Jane Doe", title: "VP Engineering" })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runJudgeDisplayCreate } = await import("../../src/commands/judge-display/create")
      await runJudgeDisplayCreate(client, hackathonId, ["--name", "Jane Doe", "--title", "VP Engineering"])

      const init = mockFetch.mock.calls[0][1] as RequestInit
      const body = JSON.parse(init.body as string)
      expect(body.name).toBe("Jane Doe")
      expect(body.title).toBe("VP Engineering")
    })
  })

  describe("reorder", () => {
    it("accepts --ids flag", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runJudgeDisplayReorder } = await import("../../src/commands/judge-display/reorder")
      await runJudgeDisplayReorder(client, hackathonId, ["--ids", "jd1,jd2"])

      const init = mockFetch.mock.calls[0][1] as RequestInit
      const body = JSON.parse(init.body as string)
      expect(body.profile_ids).toEqual(["jd1", "jd2"])
    })
  })
})
