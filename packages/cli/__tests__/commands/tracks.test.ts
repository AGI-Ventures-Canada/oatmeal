import { describe, expect, it, mock, beforeEach, afterEach, spyOn } from "bun:test"
import { OatmealClient } from "../../src/client"

const mockFetch = mock<typeof globalThis.fetch>()
const originalFetch = globalThis.fetch

const mockConfirm = mock(() => Promise.resolve(false))
mock.module("@clack/prompts", () => ({
  confirm: mockConfirm,
  isCancel: () => false,
  log: { info: () => {} },
  text: () => Promise.resolve("Test"),
}))

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("tracks commands", () => {
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

  const hackathonId = "11111111-1111-1111-1111-111111111111"

  describe("list", () => {
    it("shows tracks in table format", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          tracks: [
            { trackId: "t1", trackName: "Grand Prize", intent: "overall_winner", style: "bucket_sort", totalAssignments: 5, completedAssignments: 3 },
          ],
        })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runTracksList } = await import("../../src/commands/tracks/list")
      await runTracksList(client, hackathonId, { json: false })
      expect(consoleLogSpy.mock.calls[0][0]).toContain("Grand Prize")
    })

    it("outputs JSON with --json", async () => {
      const data = { tracks: [{ trackId: "t1", trackName: "Grand Prize" }] }
      mockFetch.mockResolvedValueOnce(jsonResponse(data))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runTracksList } = await import("../../src/commands/tracks/list")
      await runTracksList(client, hackathonId, { json: true })
      expect(JSON.parse(consoleLogSpy.mock.calls[0][0])).toEqual(data)
    })

    it("shows message when no tracks", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ tracks: [] }))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runTracksList } = await import("../../src/commands/tracks/list")
      await runTracksList(client, hackathonId, { json: false })
      expect(consoleLogSpy.mock.calls[0][0]).toContain("No prize tracks")
    })
  })

  describe("get", () => {
    it("shows track detail", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          id: "t1",
          name: "Grand Prize",
          description: null,
          intent: "overall_winner",
          rounds: [{ id: "r1", name: "Round 1", style: "bucket_sort", status: "planned", buckets: [] }],
        })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runTracksGet } = await import("../../src/commands/tracks/get")
      await runTracksGet(client, hackathonId, "t1", { json: false })
      expect(consoleLogSpy.mock.calls[0][0]).toContain("Grand Prize")
    })
  })

  describe("create", () => {
    it("creates track with flags", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ id: "t1", name: "Best AI", intent: "custom" })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runTracksCreate } = await import("../../src/commands/tracks/create")
      await runTracksCreate(client, hackathonId, ["--name", "Best AI", "--intent", "custom", "--style", "bucket_sort"])

      const init = mockFetch.mock.calls[0][1] as RequestInit
      const body = JSON.parse(init.body as string)
      expect(body.name).toBe("Best AI")
      expect(body.intent).toBe("custom")
      expect(body.style).toBe("bucket_sort")
    })
  })

  describe("update", () => {
    it("sends PATCH with provided fields", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: "t1", updatedAt: "2026-01-01" }))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runTracksUpdate } = await import("../../src/commands/tracks/update")
      await runTracksUpdate(client, hackathonId, "t1", ["--name", "Grand Prize"])

      const init = mockFetch.mock.calls[0][1] as RequestInit
      expect(init.method).toBe("PATCH")
      const body = JSON.parse(init.body as string)
      expect(body.name).toBe("Grand Prize")
    })

    it("exits when no fields provided", async () => {
      const exitSpy = spyOn(process, "exit").mockImplementation(() => { throw new Error("exit") })
      const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {})
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runTracksUpdate } = await import("../../src/commands/tracks/update")
      await expect(runTracksUpdate(client, hackathonId, "t1", [])).rejects.toThrow()
      exitSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })
  })

  describe("delete", () => {
    it("deletes with --yes", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runTracksDelete } = await import("../../src/commands/tracks/delete")
      await runTracksDelete(client, hackathonId, "t1", { yes: true })

      const url = mockFetch.mock.calls[0][0] as string
      const init = mockFetch.mock.calls[0][1] as RequestInit
      expect(url).toContain("/prize-tracks/t1")
      expect(init.method).toBe("DELETE")
    })

    it("skips when user declines", async () => {
      mockConfirm.mockResolvedValueOnce(false)
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runTracksDelete } = await import("../../src/commands/tracks/delete")
      await runTracksDelete(client, hackathonId, "t1", { yes: false })
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe("buckets", () => {
    it("sends PUT with bucket definitions", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          buckets: [
            { id: "b1", level: 1, label: "Strong Yes", description: null },
            { id: "b2", level: 2, label: "Yes", description: null },
          ],
        })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runTracksBuckets } = await import("../../src/commands/tracks/buckets")
      await runTracksBuckets(client, hackathonId, "t1", "r1", [
        "--bucket", "Strong Yes",
        "--bucket", "Yes",
        "--bucket", "No",
      ])

      const init = mockFetch.mock.calls[0][1] as RequestInit
      expect(init.method).toBe("PUT")
      const body = JSON.parse(init.body as string)
      expect(body.buckets).toHaveLength(3)
      expect(body.buckets[0].label).toBe("Strong Yes")
    })

    it("rejects fewer than 2 buckets", async () => {
      const exitSpy = spyOn(process, "exit").mockImplementation(() => { throw new Error("exit") })
      const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {})
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runTracksBuckets } = await import("../../src/commands/tracks/buckets")
      await expect(runTracksBuckets(client, hackathonId, "t1", "r1", ["--bucket", "Only One"])).rejects.toThrow()
      exitSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })
  })

  describe("update-round", () => {
    it("sends PATCH with round fields", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ id: "r1", status: "active", style: "bucket_sort" }))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runTracksUpdateRound } = await import("../../src/commands/tracks/update-round")
      await runTracksUpdateRound(client, hackathonId, "t1", "r1", ["--style", "gate_check"])

      const init = mockFetch.mock.calls[0][1] as RequestInit
      expect(init.method).toBe("PATCH")
      const body = JSON.parse(init.body as string)
      expect(body.style).toBe("gate_check")
    })
  })

  describe("activate-round", () => {
    it("sends POST to activate", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runTracksActivateRound } = await import("../../src/commands/tracks/activate-round")
      await runTracksActivateRound(client, hackathonId, "t1", "r1", { json: false })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain("/rounds/r1/activate")
    })
  })

  describe("calculate-results", () => {
    it("sends POST and shows count", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ success: true, resultsCount: 5 }))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runTracksCalculateResults } = await import("../../src/commands/tracks/calculate-results")
      await runTracksCalculateResults(client, hackathonId, "t1", "r1", { json: false })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain("/rounds/r1/calculate-results")
      expect(consoleLogSpy.mock.calls[0][0]).toContain("5")
    })
  })
})
