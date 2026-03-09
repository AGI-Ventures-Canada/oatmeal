import { describe, expect, it, mock, beforeEach, afterEach, spyOn } from "bun:test"
import { OatmealClient } from "../../src/client"

const mockFetch = mock<typeof globalThis.fetch>()
const originalFetch = globalThis.fetch

const mockConfirm = mock(() => Promise.resolve(false))
mock.module("@clack/prompts", () => ({
  confirm: mockConfirm,
  isCancel: () => false,
  log: { info: () => {} },
}))

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

  describe("update", () => {
    it("sends PATCH with provided fields", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: "jd1", name: "Jane Doe", title: "CTO" }))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runJudgeDisplayUpdate } = await import("../../src/commands/judge-display/update")
      await runJudgeDisplayUpdate(client, hackathonId, "jd1", ["--title", "CTO", "--bio", "AI expert"])

      const url = mockFetch.mock.calls[0][0] as string
      const init = mockFetch.mock.calls[0][1] as RequestInit
      expect(url).toContain(`/judges/display/jd1`)
      expect(init.method).toBe("PATCH")
      const body = JSON.parse(init.body as string)
      expect(body.title).toBe("CTO")
      expect(body.bio).toBe("AI expert")
    })

    it("--json outputs updated profile", async () => {
      const profile = { id: "jd1", name: "Jane Doe", title: "CTO" }
      mockFetch.mockResolvedValueOnce(jsonResponse(profile))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runJudgeDisplayUpdate } = await import("../../src/commands/judge-display/update")
      await runJudgeDisplayUpdate(client, hackathonId, "jd1", ["--title", "CTO", "--json"])
      expect(JSON.parse(consoleLogSpy.mock.calls[0][0])).toEqual(profile)
    })

    it("exits with error when no fields provided", async () => {
      const exitSpy = spyOn(process, "exit").mockImplementation(() => { throw new Error("exit") })
      const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {})
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runJudgeDisplayUpdate } = await import("../../src/commands/judge-display/update")
      await expect(runJudgeDisplayUpdate(client, hackathonId, "jd1", [])).rejects.toThrow()
      exitSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })
  })

  describe("delete", () => {
    it("sends DELETE with --yes flag", async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runJudgeDisplayDelete } = await import("../../src/commands/judge-display/delete")
      await runJudgeDisplayDelete(client, hackathonId, "jd1", { yes: true })

      const url = mockFetch.mock.calls[0][0] as string
      const init = mockFetch.mock.calls[0][1] as RequestInit
      expect(url).toContain(`/judges/display/jd1`)
      expect(init.method).toBe("DELETE")
    })

    it("skips delete when user declines confirmation", async () => {
      mockConfirm.mockResolvedValueOnce(false)
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runJudgeDisplayDelete } = await import("../../src/commands/judge-display/delete")
      await runJudgeDisplayDelete(client, hackathonId, "jd1", { yes: false })
      expect(mockFetch).not.toHaveBeenCalled()
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
