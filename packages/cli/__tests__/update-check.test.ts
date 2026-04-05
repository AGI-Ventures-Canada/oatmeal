import { describe, expect, it, mock, beforeEach, afterEach, spyOn } from "bun:test"
import { existsSync, unlinkSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

const REAL_CHECK_FILE = join(homedir(), ".hackathon", "update-check.json")

let originalFetch: typeof globalThis.fetch
let originalNpmCommand: string | undefined
let originalNpmExecPath: string | undefined
let originalLifecycleEvent: string | undefined
let originalLauncher: string | undefined
let originalArgv1: string | undefined

beforeEach(() => {
  originalFetch = globalThis.fetch
  originalNpmCommand = process.env.npm_command
  originalNpmExecPath = process.env.npm_execpath
  originalLifecycleEvent = process.env.npm_lifecycle_event
  originalLauncher = process.env._
  originalArgv1 = process.argv[1]
  if (existsSync(REAL_CHECK_FILE)) {
    unlinkSync(REAL_CHECK_FILE)
  }
})

afterEach(() => {
  globalThis.fetch = originalFetch
  restoreEnv()
  if (existsSync(REAL_CHECK_FILE)) {
    unlinkSync(REAL_CHECK_FILE)
  }
})

function restoreEnv() {
  setOrDeleteEnv("npm_command", originalNpmCommand)
  setOrDeleteEnv("npm_execpath", originalNpmExecPath)
  setOrDeleteEnv("npm_lifecycle_event", originalLifecycleEvent)
  setOrDeleteEnv("_", originalLauncher)

  if (originalArgv1 === undefined) {
    delete process.argv[1]
  } else {
    process.argv[1] = originalArgv1
  }
}

function setOrDeleteEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key]
    return
  }

  process.env[key] = value
}

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
    it("formats update notice for global installs", async () => {
      const { formatUpdateNotice } = await import("../src/update-check")
      delete process.env.npm_command
      delete process.env.npm_execpath
      delete process.env.npm_lifecycle_event
      process.env._ = "/usr/local/bin/hackathon"
      process.argv[1] = "/usr/local/bin/hackathon"
      const notice = formatUpdateNotice({ current: "0.1.0", latest: "0.2.0" })
      expect(notice).toContain("0.1.0")
      expect(notice).toContain("0.2.0")
      expect(notice).toContain("hackathon update")
    })

    it("formats update notice for local bun cli usage", async () => {
      const { formatUpdateNotice } = await import("../src/update-check")
      process.env.npm_command = "run-script"
      process.env.npm_execpath = "/Users/test/.bun/bin/bun"
      process.argv[1] = "/Users/test/oatmeal/packages/cli/src/cli.ts"

      const notice = formatUpdateNotice({ current: "0.1.0", latest: "0.2.0" })

      expect(notice).toContain("Update this repo")
      expect(notice).toContain("bun install -g @agi-ventures-canada/hackathon-cli@latest")
      expect(notice).not.toContain("hackathon update")
    })

    it("formats update notice for bunx usage", async () => {
      const { formatUpdateNotice } = await import("../src/update-check")
      process.env.npm_command = "exec"
      process.env.npm_lifecycle_event = "bunx"
      process.env._ = "/Users/test/.bun/bin/bunx"

      const notice = formatUpdateNotice({ current: "0.1.0", latest: "0.2.0" })

      expect(notice).toContain("bunx @agi-ventures-canada/hackathon-cli update")
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

  it("prints local repo guidance when run via bun cli", async () => {
    const mockFetch = mock<typeof globalThis.fetch>()
    globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ version: "99.0.0" }), {
        headers: { "Content-Type": "application/json" },
      })
    )

    process.env.npm_command = "run-script"
    process.env.npm_execpath = "/Users/test/.bun/bin/bun"
    process.argv[1] = "/Users/test/oatmeal/packages/cli/src/cli.ts"

    const logSpy = spyOn(console, "log").mockImplementation(() => {})
    const { runUpdate } = await import("../src/commands/update")
    await runUpdate()

    const output = logSpy.mock.calls.map((c) => c[0]).join("\n")
    expect(output).toContain("repo-local CLI")
    expect(output).toContain("bun install -g @agi-ventures-canada/hackathon-cli@latest")

    logSpy.mockRestore()
  })
})
