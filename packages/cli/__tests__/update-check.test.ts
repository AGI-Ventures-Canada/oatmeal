import { describe, expect, it, mock, beforeEach, afterEach, spyOn } from "bun:test"
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const TEST_CONFIG_DIR = join(tmpdir(), `.hackathon-test-${Date.now()}`)
const TEST_CHECK_FILE = join(TEST_CONFIG_DIR, "update-check.json")

let originalFetch: typeof globalThis.fetch

beforeEach(() => {
  originalFetch = globalThis.fetch
  if (!existsSync(TEST_CONFIG_DIR)) {
    mkdirSync(TEST_CONFIG_DIR, { recursive: true })
  }
  if (existsSync(TEST_CHECK_FILE)) {
    unlinkSync(TEST_CHECK_FILE)
  }
})

afterEach(() => {
  globalThis.fetch = originalFetch
  if (existsSync(TEST_CHECK_FILE)) {
    unlinkSync(TEST_CHECK_FILE)
  }
})

describe("update-check", () => {
  describe("compareVersions", () => {
    it("detects newer version", async () => {
      const { checkForUpdate } = await import("../src/update-check")

      const mockFetch = mock<typeof globalThis.fetch>()
      globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ version: "99.0.0" }), {
          headers: { "Content-Type": "application/json" },
        })
      )

      const result = await checkForUpdate()
      expect(result).not.toBeNull()
      expect(result!.latest).toBe("99.0.0")
    })

    it("returns null when up to date", async () => {
      const { checkForUpdate } = await import("../src/update-check")

      const mockFetch = mock<typeof globalThis.fetch>()
      globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ version: "0.0.1" }), {
          headers: { "Content-Type": "application/json" },
        })
      )

      const result = await checkForUpdate()
      expect(result).toBeNull()
    })

    it("returns null on network failure", async () => {
      const { checkForUpdate } = await import("../src/update-check")

      const mockFetch = mock<typeof globalThis.fetch>()
      globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch
      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      const result = await checkForUpdate()
      expect(result).toBeNull()
    })

    it("returns null on non-200 response", async () => {
      const { checkForUpdate } = await import("../src/update-check")

      const mockFetch = mock<typeof globalThis.fetch>()
      globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch
      mockFetch.mockResolvedValueOnce(
        new Response("Not found", { status: 404 })
      )

      const result = await checkForUpdate()
      expect(result).toBeNull()
    })
  })

  describe("formatUpdateNotice", () => {
    it("formats update notice", async () => {
      const { formatUpdateNotice } = await import("../src/update-check")
      const notice = formatUpdateNotice({ current: "0.1.0", latest: "0.2.0" })
      expect(notice).toContain("0.1.0")
      expect(notice).toContain("0.2.0")
      expect(notice).toContain("hackathon update")
    })
  })
})

describe("update command", () => {
  it("prints already up to date when no update available", async () => {
    const mockFetch = mock<typeof globalThis.fetch>()
    globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ version: "0.0.1" }), {
        headers: { "Content-Type": "application/json" },
      })
    )

    const logSpy = spyOn(console, "log").mockImplementation(() => {})
    const { runUpdate } = await import("../src/commands/update")
    await runUpdate()

    const output = logSpy.mock.calls.map((c) => c[0]).join("\n")
    expect(output).toContain("up to date")

    logSpy.mockRestore()
  })
})
