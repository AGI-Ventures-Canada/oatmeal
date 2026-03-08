import { describe, expect, it, mock, beforeEach, afterEach, spyOn } from "bun:test"
import { parseLoginOptions } from "../../src/commands/login"

describe("parseLoginOptions", () => {
  it("parses --api-key flag", () => {
    const options = parseLoginOptions(["--api-key", "sk_live_test"])
    expect(options.apiKey).toBe("sk_live_test")
  })

  it("parses --no-browser flag", () => {
    const options = parseLoginOptions(["--no-browser"])
    expect(options.noBrowser).toBe(true)
  })

  it("parses --base-url flag", () => {
    const options = parseLoginOptions(["--base-url", "http://localhost:3000"])
    expect(options.baseUrl).toBe("http://localhost:3000")
  })

  it("parses --yes flag", () => {
    const options = parseLoginOptions(["--yes"])
    expect(options.yes).toBe(true)
  })

  it("parses -y shorthand", () => {
    const options = parseLoginOptions(["-y"])
    expect(options.yes).toBe(true)
  })

  it("parses all flags together", () => {
    const options = parseLoginOptions([
      "--api-key", "sk_live_xxx",
      "--base-url", "http://staging.test",
      "--yes",
    ])
    expect(options.apiKey).toBe("sk_live_xxx")
    expect(options.baseUrl).toBe("http://staging.test")
    expect(options.yes).toBe(true)
  })

  it("returns empty options for no args", () => {
    const options = parseLoginOptions([])
    expect(options.apiKey).toBeUndefined()
    expect(options.noBrowser).toBeUndefined()
    expect(options.baseUrl).toBeUndefined()
    expect(options.yes).toBeUndefined()
  })
})

describe("logout", () => {
  it("runLogout completes without error when not logged in", async () => {
    const { runLogout } = await import("../../src/commands/logout")
    // This should not throw even if no config exists
    await runLogout()
  })
})

describe("whoami", () => {
  it("runWhoAmI outputs JSON when --json flag is set", async () => {
    const mockFetch = mock<typeof globalThis.fetch>()
    const originalFetch = globalThis.fetch
    globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch

    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          tenantId: "t1",
          keyId: "k1",
          keyName: "Test Key",
          scopes: ["hackathons:read"],
        }),
        { headers: { "Content-Type": "application/json" } }
      )
    )

    const { OatmealClient } = await import("../../src/client")
    const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })

    const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {})
    const { runWhoAmI } = await import("../../src/commands/whoami")
    await runWhoAmI(client, { json: true })

    const output = consoleLogSpy.mock.calls[0][0]
    const parsed = JSON.parse(output)
    expect(parsed.tenantId).toBe("t1")
    expect(parsed.scopes).toEqual(["hackathons:read"])

    consoleLogSpy.mockRestore()
    globalThis.fetch = originalFetch
  })
})
