import { describe, expect, it, mock, beforeEach, afterEach, spyOn } from "bun:test"
import { OatmealClient } from "../../src/client"

const mockFetch = mock<typeof globalThis.fetch>()
const originalFetch = globalThis.fetch

const mockText = mock(() => Promise.resolve("confirm-name"))
const mockIsCancel = mock(() => false)
const mockLog = { info: mock(() => {}) }

mock.module("@clack/prompts", () => ({
  text: mockText,
  isCancel: mockIsCancel,
  log: mockLog,
}))

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("admin commands", () => {
  let consoleLogSpy: ReturnType<typeof spyOn>
  let consoleErrorSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    mockFetch.mockReset()
    globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch
    consoleLogSpy = spyOn(console, "log").mockImplementation(() => {})
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe("stats", () => {
    it("fetches from /api/admin/stats", async () => {
      const stats = { tenants: 5, hackathons: 12, participants: 300, submissions: 87 }
      mockFetch.mockResolvedValueOnce(jsonResponse(stats))

      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runAdminStats } = await import("../../src/commands/admin/stats")
      await runAdminStats(client, { json: false })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain("/api/admin/stats")
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it("--json outputs JSON", async () => {
      const stats = { tenants: 1, hackathons: 2, participants: 3, submissions: 4 }
      mockFetch.mockResolvedValueOnce(jsonResponse(stats))

      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runAdminStats } = await import("../../src/commands/admin/stats")
      await runAdminStats(client, { json: true })

      const output = consoleLogSpy.mock.calls[0][0]
      expect(JSON.parse(output)).toEqual(stats)
    })
  })

  describe("hackathons list", () => {
    it("fetches from /api/admin/hackathons", async () => {
      const data = {
        hackathons: [{ id: "h1", name: "Test Hack", slug: "test-hack", status: "active", tenant_id: "t1" }],
        total: 1,
      }
      mockFetch.mockResolvedValueOnce(jsonResponse(data))

      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runAdminHackathonsList } = await import("../../src/commands/admin/hackathons-list")
      await runAdminHackathonsList(client, [], { json: false })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain("/api/admin/hackathons")
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it("passes --status filter as query param", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ hackathons: [], total: 0 }))

      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runAdminHackathonsList } = await import("../../src/commands/admin/hackathons-list")
      await runAdminHackathonsList(client, ["--status", "active"], { json: false })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain("status=active")
    })

    it("passes --search filter as query param", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ hackathons: [], total: 0 }))

      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runAdminHackathonsList } = await import("../../src/commands/admin/hackathons-list")
      await runAdminHackathonsList(client, ["--search", "hello"], { json: false })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain("search=hello")
    })

    it("--json outputs JSON", async () => {
      const data = { hackathons: [{ id: "h1" }], total: 1 }
      mockFetch.mockResolvedValueOnce(jsonResponse(data))

      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runAdminHackathonsList } = await import("../../src/commands/admin/hackathons-list")
      await runAdminHackathonsList(client, [], { json: true })

      const output = consoleLogSpy.mock.calls[0][0]
      expect(JSON.parse(output)).toEqual(data)
    })
  })

  describe("hackathons get", () => {
    it("fetches from /api/admin/hackathons/:id", async () => {
      const hackathon = {
        id: "h1", name: "Test", slug: "test", status: "active", tenant_id: "t1",
        description: null, starts_at: null, ends_at: null, registration_opens_at: null,
        registration_closes_at: null, min_team_size: null, max_team_size: null,
        max_participants: null, allow_solo: true, anonymous_judging: false,
        location_type: null, location_name: null, location_url: null,
        results_published_at: null, created_at: "2024-01-01T00:00:00Z",
      }
      mockFetch.mockResolvedValueOnce(jsonResponse(hackathon))

      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runAdminHackathonsGet } = await import("../../src/commands/admin/hackathons-get")
      await runAdminHackathonsGet(client, "h1", { json: false })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain("/api/admin/hackathons/h1")
    })
  })

  describe("hackathons update", () => {
    it("sends PATCH to /api/admin/hackathons/:id", async () => {
      const updated = { id: "h1", name: "Updated Name" }
      mockFetch.mockResolvedValueOnce(jsonResponse(updated))

      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runAdminHackathonsUpdate } = await import("../../src/commands/admin/hackathons-update")
      await runAdminHackathonsUpdate(client, "h1", ["--name", "Updated Name"], { json: false })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain("/api/admin/hackathons/h1")
      const init = mockFetch.mock.calls[0][1] as RequestInit
      expect(init.method).toBe("PATCH")
      expect(JSON.parse(init.body as string)).toMatchObject({ name: "Updated Name" })
    })

    it("exits if no fields provided", async () => {
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runAdminHackathonsUpdate } = await import("../../src/commands/admin/hackathons-update")

      let exited = false
      const origExit = process.exit
      process.exit = (() => { exited = true; throw new Error("exit") }) as never

      try {
        await runAdminHackathonsUpdate(client, "h1", [], { json: false })
      } catch {
        // expected
      } finally {
        process.exit = origExit
      }

      expect(exited).toBe(true)
    })
  })

  describe("hackathons delete", () => {
    it("fetches name then sends DELETE with confirm_name (--yes)", async () => {
      const hackathon = { id: "h1", name: "Test Hack" }
      mockFetch.mockResolvedValueOnce(jsonResponse(hackathon))
      mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))

      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runAdminHackathonsDelete } = await import("../../src/commands/admin/hackathons-delete")
      await runAdminHackathonsDelete(client, "h1", { yes: true })

      const deleteInit = mockFetch.mock.calls[1][1] as RequestInit
      expect(deleteInit.method).toBe("DELETE")
      expect(JSON.parse(deleteInit.body as string)).toMatchObject({ confirm_name: "Test Hack" })
    })
  })

  describe("scenarios list", () => {
    it("fetches from /api/admin/scenarios", async () => {
      const data = { scenarios: [{ name: "judging", description: "Seeds judges and submissions" }] }
      mockFetch.mockResolvedValueOnce(jsonResponse(data))

      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runAdminScenariosList } = await import("../../src/commands/admin/scenarios-list")
      await runAdminScenariosList(client, { json: false })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain("/api/admin/scenarios")
      expect(consoleLogSpy).toHaveBeenCalled()
    })
  })

  describe("scenarios run", () => {
    it("POSTs to /api/admin/scenario-run/:name", async () => {
      const result = { hackathonId: "h1", tenantId: "t1", scenario: "judging" }
      mockFetch.mockResolvedValueOnce(jsonResponse(result))

      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runAdminScenariosRun } = await import("../../src/commands/admin/scenarios-run")
      await runAdminScenariosRun(client, "judging", [], { json: false })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain("/api/admin/scenario-run/judging")
      const init = mockFetch.mock.calls[0][1] as RequestInit
      expect(init.method).toBe("POST")
    })

    it("passes --tenant-id in body", async () => {
      const result = { hackathonId: "h1", tenantId: "t-specific", scenario: "judging" }
      mockFetch.mockResolvedValueOnce(jsonResponse(result))

      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runAdminScenariosRun } = await import("../../src/commands/admin/scenarios-run")
      await runAdminScenariosRun(client, "judging", ["--tenant-id", "t-specific"], { json: false })

      const init = mockFetch.mock.calls[0][1] as RequestInit
      expect(JSON.parse(init.body as string)).toMatchObject({ tenant_id: "t-specific" })
    })
  })
})
