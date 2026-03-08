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

describe("prizes commands", () => {
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
    it("shows prizes with type and value", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          prizes: [
            { name: "Best Overall", type: "cash", value: "$1000", assigned_submission_name: "Winner" },
          ],
        })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runPrizesList } = await import("../../src/commands/prizes/list")
      await runPrizesList(client, hackathonId, { json: false })
      expect(consoleLogSpy.mock.calls[0][0]).toContain("Best Overall")
    })
  })

  describe("create", () => {
    it("creates prize with flags", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ id: "p1", name: "Best AI App" })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runPrizesCreate } = await import("../../src/commands/prizes/create")
      await runPrizesCreate(client, hackathonId, ["--name", "Best AI App", "--type", "cash", "--value", "$500"])

      const init = mockFetch.mock.calls[0][1] as RequestInit
      const body = JSON.parse(init.body as string)
      expect(body.name).toBe("Best AI App")
      expect(body.type).toBe("cash")
    })
  })

  describe("assign", () => {
    it("requires --submission flag", async () => {
      const exitSpy = spyOn(process, "exit").mockImplementation(() => { throw new Error("exit") })
      const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {})
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runPrizesAssign } = await import("../../src/commands/prizes/assign")

      await expect(runPrizesAssign(client, hackathonId, "p1", [])).rejects.toThrow()

      exitSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })

    it("assigns prize to submission", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runPrizesAssign } = await import("../../src/commands/prizes/assign")
      await runPrizesAssign(client, hackathonId, "p1", ["--submission", "s1"])

      const init = mockFetch.mock.calls[0][1] as RequestInit
      const body = JSON.parse(init.body as string)
      expect(body.submission_id).toBe("s1")
    })
  })

  describe("reorder", () => {
    it("accepts --ids flag", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runPrizesReorder } = await import("../../src/commands/prizes/reorder")
      await runPrizesReorder(client, hackathonId, ["--ids", "p1,p2,p3"])

      const init = mockFetch.mock.calls[0][1] as RequestInit
      const body = JSON.parse(init.body as string)
      expect(body.prize_ids).toEqual(["p1", "p2", "p3"])
    })
  })

  describe("delete", () => {
    it("confirms before deleting with --yes", async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runPrizesDelete } = await import("../../src/commands/prizes/delete")
      await runPrizesDelete(client, hackathonId, "p1", { yes: true })
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})
