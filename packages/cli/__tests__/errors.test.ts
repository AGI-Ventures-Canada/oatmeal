import { describe, expect, it } from "bun:test"
import { ApiError, AuthError, ConfigError, ScopeError } from "../src/errors"

describe("ApiError", () => {
  it("stores status and message", () => {
    const err = new ApiError(404, "Not found")
    expect(err.status).toBe(404)
    expect(err.message).toBe("Not found")
    expect(err.name).toBe("ApiError")
  })

  it("toString includes status code", () => {
    const err = new ApiError(500, "Server error")
    expect(err.toString()).toBe("[500] Server error")
  })

  it("stores optional hint", () => {
    const err = new ApiError(429, "Rate limited", "Wait a moment")
    expect(err.hint).toBe("Wait a moment")
  })
})

describe("AuthError", () => {
  it("has default message suggesting login", () => {
    const err = new AuthError()
    expect(err.message).toContain("oatmeal login")
    expect(err.name).toBe("AuthError")
  })

  it("accepts custom message", () => {
    const err = new AuthError("Invalid key")
    expect(err.message).toBe("Invalid key")
  })
})

describe("ConfigError", () => {
  it("stores message", () => {
    const err = new ConfigError("Bad config")
    expect(err.message).toBe("Bad config")
    expect(err.name).toBe("ConfigError")
  })
})

describe("ScopeError", () => {
  it("includes required scope", () => {
    const err = new ScopeError("hackathons:write")
    expect(err.requiredScope).toBe("hackathons:write")
    expect(err.status).toBe(403)
    expect(err.name).toBe("ScopeError")
  })

  it("message tells user which scope to add", () => {
    const err = new ScopeError("webhooks:read", ["hackathons:read"])
    expect(err.message).toContain("webhooks:read")
    expect(err.currentScopes).toEqual(["hackathons:read"])
    expect(err.hint).toContain("webhooks:read")
  })
})
