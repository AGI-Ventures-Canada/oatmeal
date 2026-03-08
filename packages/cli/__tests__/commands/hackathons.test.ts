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

describe("hackathons commands", () => {
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

  describe("list", () => {
    it("fetches from dashboard endpoint with auth", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ hackathons: [{ name: "My Hack", slug: "my-hack", status: "active" }] })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runHackathonsList } = await import("../../src/commands/hackathons/list")
      await runHackathonsList(client, { json: false })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain("/api/dashboard/hackathons")
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it("--json outputs JSON", async () => {
      const data = { hackathons: [{ name: "Test" }] }
      mockFetch.mockResolvedValueOnce(jsonResponse(data))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runHackathonsList } = await import("../../src/commands/hackathons/list")
      await runHackathonsList(client, { json: true })

      const output = consoleLogSpy.mock.calls[0][0]
      expect(JSON.parse(output)).toEqual(data)
    })
  })

  describe("get", () => {
    it("accepts UUID and fetches directly", async () => {
      const uuid = "12345678-1234-1234-1234-123456789012"
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ id: uuid, name: "Test", slug: "test", status: "active" })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runHackathonsGet } = await import("../../src/commands/hackathons/get")
      await runHackathonsGet(client, uuid, { json: false })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain(`/api/dashboard/hackathons/${uuid}`)
    })

    it("accepts slug and resolves to UUID", async () => {
      const uuid = "12345678-1234-1234-1234-123456789012"
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ hackathons: [{ id: uuid, slug: "my-hack" }] }))
        .mockResolvedValueOnce(jsonResponse({ id: uuid, name: "My Hack", slug: "my-hack" }))

      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runHackathonsGet } = await import("../../src/commands/hackathons/get")
      await runHackathonsGet(client, "my-hack", { json: false })

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe("create", () => {
    it("sends POST with provided flags (non-interactive)", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ id: "new-id", name: "New Hack", slug: "new-hack" })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runHackathonsCreate } = await import("../../src/commands/hackathons/create")
      await runHackathonsCreate(client, [
        "--name", "New Hack",
        "--slug", "new-hack",
        "--description", "A test hackathon",
      ])

      const init = mockFetch.mock.calls[0][1] as RequestInit
      const body = JSON.parse(init.body as string)
      expect(body.name).toBe("New Hack")
      expect(body.slug).toBe("new-hack")
    })
  })

  describe("update", () => {
    it("sends PATCH with provided fields", async () => {
      const uuid = "12345678-1234-1234-1234-123456789012"
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ id: uuid, name: "Updated Hack" })
      )
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runHackathonsUpdate } = await import("../../src/commands/hackathons/update")
      await runHackathonsUpdate(client, uuid, ["--name", "Updated Hack"])

      const init = mockFetch.mock.calls[0][1] as RequestInit
      expect(init.method).toBe("PATCH")
      const body = JSON.parse(init.body as string)
      expect(body.name).toBe("Updated Hack")
    })
  })

  describe("delete", () => {
    it("sends DELETE request with --yes flag", async () => {
      const uuid = "12345678-1234-1234-1234-123456789012"
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }))
      const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
      const { runHackathonsDelete } = await import("../../src/commands/hackathons/delete")
      await runHackathonsDelete(client, uuid, { yes: true })

      const init = mockFetch.mock.calls[0][1] as RequestInit
      expect(init.method).toBe("DELETE")
    })
  })
})
