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

describe("schedules commands", () => {
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
    it("displays schedules table", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          schedules: [
            { name: "Daily Backup", cronExpression: "0 0 * * *", isActive: true, nextRunAt: "2026-01-02T00:00:00Z" },
          ],
        })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runSchedulesList } = await import("../../src/commands/schedules/list")
      await runSchedulesList(client, { json: false })
      expect(consoleLogSpy.mock.calls[0][0]).toContain("Daily Backup")
    })
  })

  describe("create", () => {
    it("creates schedule with flags", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ id: "s1", name: "Nightly Report", cronExpression: "0 2 * * *" })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runSchedulesCreate } = await import("../../src/commands/schedules/create")
      await runSchedulesCreate(client, ["--name", "Nightly Report", "--cron", "0 2 * * *"])

      const init = mockFetch.mock.calls[0][1] as RequestInit
      const body = JSON.parse(init.body as string)
      expect(body.name).toBe("Nightly Report")
      expect(body.cronExpression).toBe("0 2 * * *")
    })
  })

  describe("get", () => {
    it("shows schedule details", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          id: "s1",
          name: "Test Schedule",
          cronExpression: "0 * * * *",
          isActive: true,
        })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runSchedulesGet } = await import("../../src/commands/schedules/get")
      await runSchedulesGet(client, "s1", { json: false })
      expect(consoleLogSpy.mock.calls[0][0]).toContain("Test Schedule")
    })
  })

  describe("update", () => {
    it("sends only changed fields", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ id: "s1", name: "Updated Schedule" })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runSchedulesUpdate } = await import("../../src/commands/schedules/update")
      await runSchedulesUpdate(client, "s1", ["--name", "Updated Schedule", "--disable"])

      const init = mockFetch.mock.calls[0][1] as RequestInit
      const body = JSON.parse(init.body as string)
      expect(body.name).toBe("Updated Schedule")
      expect(body.isActive).toBe(false)
    })
  })

  describe("delete", () => {
    it("deletes with --yes", async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runSchedulesDelete } = await import("../../src/commands/schedules/delete")
      await runSchedulesDelete(client, "s1", { yes: true })
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})
