import { describe, expect, it } from "bun:test"
import { Elysia } from "elysia"
import { handleRouteError } from "@/lib/api/routes/errors"
import { AuthError } from "@/lib/auth/principal"
import { RateLimitError } from "@/lib/services/rate-limit"

function makeSet() {
  return { status: undefined as number | string | undefined, headers: {} as Record<string, string | number> }
}

describe("handleRouteError", () => {
  describe("AuthError branch", () => {
    it("sets status to the error's statusCode and returns the message", () => {
      const set = makeSet()
      const body = handleRouteError(new AuthError("Unauthorized", 401), set)
      expect(set.status).toBe(401)
      expect(body.error).toBe("Unauthorized")
    })

    it("uses statusCode 403 when provided", () => {
      const set = makeSet()
      const body = handleRouteError(new AuthError("Forbidden", 403), set)
      expect(set.status).toBe(403)
      expect(body.error).toBe("Forbidden")
    })

    it("matches on error.name when instanceof fails (cross-module boundary)", () => {
      const set = makeSet()
      const crossBoundaryError = Object.assign(new Error("Unauthorized"), {
        name: "AuthError",
        statusCode: 401,
      })
      const body = handleRouteError(crossBoundaryError, set)
      expect(set.status).toBe(401)
      expect(body.error).toBe("Unauthorized")
    })
  })

  describe("RateLimitError branch", () => {
    it("sets status 429 and rate-limit headers", () => {
      const set = makeSet()
      const resetAt = Date.now() + 60_000
      const body = handleRouteError(new RateLimitError(resetAt, 0), set)
      expect(set.status).toBe(429)
      expect(body.error).toBe("Rate limit exceeded")
      expect(set.headers["X-RateLimit-Remaining"]).toBe("0")
      expect(set.headers["X-RateLimit-Reset"]).toBe(Math.ceil(resetAt / 1000).toString())
    })

    it("includes remaining count in header", () => {
      const set = makeSet()
      handleRouteError(new RateLimitError(Date.now() + 5_000, 7), set)
      expect(set.headers["X-RateLimit-Remaining"]).toBe("7")
    })

    it("matches on error.name when instanceof fails (cross-module boundary)", () => {
      const set = makeSet()
      const crossBoundaryError = Object.assign(new Error("Rate limit exceeded"), {
        name: "RateLimitError",
        remaining: 0,
        resetAt: Date.now() + 30_000,
      })
      handleRouteError(crossBoundaryError, set)
      expect(set.status).toBe(429)
    })
  })

  describe("500 fallback", () => {
    it("sets status 500 for unknown Error", () => {
      const set = makeSet()
      const body = handleRouteError(new Error("Something exploded"), set)
      expect(set.status).toBe(500)
      expect(body.error).toBe("Internal server error")
    })

    it("sets status 500 for non-Error values", () => {
      const set = makeSet()
      const body = handleRouteError("unexpected string", set)
      expect(set.status).toBe(500)
      expect(body.error).toBe("Internal server error")
    })
  })
})

describe("handleRouteError as Elysia onError — parent catches child errors", () => {
  it("parent onError correctly returns 401 for AuthError thrown in a child plugin", async () => {
    const childPlugin = new Elysia({ prefix: "/child" })
      .get("/test", () => {
        throw new AuthError("Unauthorized", 401)
      })

    const parent = new Elysia()
      .onError(({ error, set, path }) => handleRouteError(error, set, path))
      .use(childPlugin)

    const res = await parent.handle(new Request("http://localhost/child/test"))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe("Unauthorized")
  })

  it("parent onError correctly returns 429 with headers for RateLimitError", async () => {
    const resetAt = Date.now() + 60_000
    const childPlugin = new Elysia({ prefix: "/child" })
      .get("/test", () => {
        throw new RateLimitError(resetAt, 0)
      })

    const parent = new Elysia()
      .onError(({ error, set, path }) => handleRouteError(error, set, path))
      .use(childPlugin)

    const res = await parent.handle(new Request("http://localhost/child/test"))
    expect(res.status).toBe(429)
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0")
  })
})
