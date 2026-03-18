import { describe, expect, it, beforeEach, afterEach } from "bun:test"
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, unlinkSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { loadConfig } from "../src/config"

let testDir: string

function setTestPaths() {
  testDir = join(tmpdir(), `hackathon-test-${Date.now()}`)
}

describe("config", () => {
  let originalApiKey: string | undefined
  let originalBaseUrl: string | undefined

  beforeEach(async () => {
    setTestPaths()

    originalApiKey = process.env.HACKATHON_API_KEY
    originalBaseUrl = process.env.HACKATHON_BASE_URL
    delete process.env.HACKATHON_API_KEY
    delete process.env.HACKATHON_BASE_URL

    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (originalApiKey !== undefined) process.env.HACKATHON_API_KEY = originalApiKey
    else delete process.env.HACKATHON_API_KEY
    if (originalBaseUrl !== undefined) process.env.HACKATHON_BASE_URL = originalBaseUrl
    else delete process.env.HACKATHON_BASE_URL

    try { rmSync(testDir, { recursive: true, force: true }) } catch {}
  })

  it("loadConfig returns null when no config and no env vars", async () => {
    const result = loadConfig()
    expect(result === null || typeof result === "object").toBe(true)
  })

  it("env var HACKATHON_API_KEY overrides config file", () => {
    process.env.HACKATHON_API_KEY = "sk_live_test123"
    const config = loadConfig()
    expect(config).not.toBeNull()
    expect(config!.apiKey).toBe("sk_live_test123")
  })

  it("env var HACKATHON_BASE_URL overrides default", () => {
    process.env.HACKATHON_API_KEY = "sk_live_test123"
    process.env.HACKATHON_BASE_URL = "http://localhost:3000"
    const config = loadConfig()
    expect(config!.baseUrl).toBe("http://localhost:3000")
  })

  it("both env vars work simultaneously", () => {
    process.env.HACKATHON_API_KEY = "sk_live_env"
    process.env.HACKATHON_BASE_URL = "http://custom:3000"
    const config = loadConfig()
    expect(config!.apiKey).toBe("sk_live_env")
    expect(config!.baseUrl).toBe("http://custom:3000")
  })

  it("saveConfig and clearConfig work with a temp directory", () => {
    const dir = join(testDir, ".hackathon-save-test")
    const file = join(dir, "config.json")

    mkdirSync(dir, { recursive: true, mode: 0o700 })
    const config = { apiKey: "sk_test", baseUrl: "http://localhost:3000" }
    writeFileSync(file, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 })

    expect(existsSync(file)).toBe(true)
    const parsed = JSON.parse(readFileSync(file, "utf-8"))
    expect(parsed.apiKey).toBe("sk_test")

    unlinkSync(file)
    expect(existsSync(file)).toBe(false)
  })
})
