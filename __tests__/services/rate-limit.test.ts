import { describe, expect, it } from "bun:test"
import { checkRateLimit, getRateLimitHeaders, defaultRateLimits } from "@/lib/services/rate-limit"

describe("Rate Limiting", () => {
  describe("checkRateLimit", () => {
    it("allows requests under the limit", () => {
      const key = `test-${Date.now()}`
      const result = checkRateLimit(key, { maxRequests: 10, windowMs: 60000 })

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9)
    })

    it("tracks request count", () => {
      const key = `test-count-${Date.now()}`
      const config = { maxRequests: 5, windowMs: 60000 }

      checkRateLimit(key, config)
      checkRateLimit(key, config)
      const result = checkRateLimit(key, config)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2)
    })

    it("blocks requests at the limit", () => {
      const key = `test-limit-${Date.now()}`
      const config = { maxRequests: 3, windowMs: 60000 }

      checkRateLimit(key, config)
      checkRateLimit(key, config)
      checkRateLimit(key, config)
      const result = checkRateLimit(key, config)

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it("returns reset timestamp", () => {
      const key = `test-reset-${Date.now()}`
      const result = checkRateLimit(key, { maxRequests: 10, windowMs: 60000 })

      expect(result.resetAt).toBeGreaterThan(Date.now())
      expect(result.resetAt).toBeLessThanOrEqual(Date.now() + 60000)
    })
  })

  describe("getRateLimitHeaders", () => {
    it("returns proper headers", () => {
      const headers = getRateLimitHeaders({
        allowed: true,
        remaining: 5,
        resetAt: 1700000000000,
      })

      expect(headers["X-RateLimit-Remaining"]).toBe("5")
      expect(headers["X-RateLimit-Reset"]).toBe("1700000000")
    })
  })

  describe("defaultRateLimits", () => {
    it("has api_key:default config", () => {
      expect(defaultRateLimits["api_key:default"]).toBeDefined()
      expect(defaultRateLimits["api_key:default"].maxRequests).toBe(100)
    })

    it("has user:default config", () => {
      expect(defaultRateLimits["user:default"]).toBeDefined()
      expect(defaultRateLimits["user:default"].maxRequests).toBe(200)
    })
  })
})
