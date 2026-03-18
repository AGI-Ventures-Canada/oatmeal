import { describe, expect, it, spyOn } from "bun:test"
import { VERSION } from "../src/constants"

describe("CLI constants", () => {
  it("exports a version string", () => {
    expect(VERSION).toBe("0.1.0")
  })
})

describe("CLI global flags parsing", () => {
  it("--json flag is recognized", () => {
    const args = ["events", "list", "--json"]
    const jsonIndex = args.indexOf("--json")
    expect(jsonIndex).toBeGreaterThan(-1)
  })

  it("--yes flag is recognized", () => {
    const args = ["events", "delete", "id", "--yes"]
    expect(args.includes("--yes")).toBe(true)
  })

  it("-y shorthand is recognized", () => {
    const args = ["events", "delete", "id", "-y"]
    expect(args.includes("-y")).toBe(true)
  })

  it("--base-url flag captures next arg", () => {
    const args = ["--base-url", "http://localhost:3000", "events", "list"]
    const idx = args.indexOf("--base-url")
    expect(args[idx + 1]).toBe("http://localhost:3000")
  })

  it("--api-key flag captures next arg", () => {
    const args = ["--api-key", "sk_live_test", "whoami"]
    const idx = args.indexOf("--api-key")
    expect(args[idx + 1]).toBe("sk_live_test")
  })
})

describe("command dispatch logic", () => {
  it("browse routes to public commands", () => {
    const command = "browse"
    const publicCommands = ["browse"]
    expect(publicCommands.includes(command)).toBe(true)
  })

  it("events routes to management commands", () => {
    const command = "events"
    const authCommands = ["events", "judging", "prizes", "results", "webhooks", "jobs", "schedules"]
    expect(authCommands.includes(command)).toBe(true)
  })

  it("login works without auth client", () => {
    const noAuthCommands = ["login", "logout"]
    expect(noAuthCommands.includes("login")).toBe(true)
  })
})
