import { describe, expect, it } from "bun:test"
import { handleRouteError } from "@/lib/api/routes/errors"
import { AuthError } from "@/lib/auth/principal"
import { RateLimitError } from "@/lib/services/rate-limit"

describe("handleRouteError", () => {
  describe("AuthError branch", () => {
    it("returns the error status code and message", async () => {
      const res = handleRouteError(new AuthError("Unauthorized", 401))
      expect(res.status).toBe(401)
      expect((await res.json()).error).toBe("Unauthorized")
    })

    it("uses statusCode 403 when provided", async () => {
      const res = handleRouteError(new AuthError("Forbidden", 403))
      expect(res.status).toBe(403)
      expect((await res.json()).error).toBe("Forbidden")
    })

    it("matches on error.name when instanceof fails (cross-module boundary)", async () => {
      const crossBoundaryError = Object.assign(new Error("Unauthorized"), {
        name: "AuthError",
        statusCode: 401,
      })
      const res = handleRouteError(crossBoundaryError)
      expect(res.status).toBe(401)
      expect((await res.json()).error).toBe("Unauthorized")
    })
  })

  describe("RateLimitError branch", () => {
    it("returns 429 with rate-limit headers", async () => {
      const resetAt = Date.now() + 60_000
      const res = handleRouteError(new RateLimitError(resetAt, 0))
      expect(res.status).toBe(429)
      expect((await res.json()).error).toBe("Rate limit exceeded")
      expect(res.headers.get("X-RateLimit-Remaining")).toBe("0")
      expect(res.headers.get("X-RateLimit-Reset")).toBe(Math.ceil(resetAt / 1000).toString())
    })

    it("includes remaining count in header", async () => {
      const res = handleRouteError(new RateLimitError(Date.now() + 5_000, 7))
      expect(res.headers.get("X-RateLimit-Remaining")).toBe("7")
    })

    it("matches on error.name when instanceof fails (cross-module boundary)", async () => {
      const resetAt = Date.now() + 30_000
      const crossBoundaryError = Object.assign(new Error("Rate limit exceeded"), {
        name: "RateLimitError",
        remaining: 0,
        resetAt,
      })
      const res = handleRouteError(crossBoundaryError)
      expect(res.status).toBe(429)
    })
  })

  describe("500 fallback", () => {
    it("returns 500 for unknown Error", async () => {
      const res = handleRouteError(new Error("Something exploded"))
      expect(res.status).toBe(500)
      expect((await res.json()).error).toBe("Internal server error")
    })

    it("returns 500 for non-Error values", async () => {
      const res = handleRouteError("unexpected string")
      expect(res.status).toBe(500)
      expect((await res.json()).error).toBe("Internal server error")
    })
  })
})
