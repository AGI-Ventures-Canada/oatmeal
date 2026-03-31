import { describe, expect, it, mock, beforeEach } from "bun:test"
import { resetClerkMocks } from "../lib/supabase-mock"

const mockSetPhase = mock(() => Promise.resolve({ success: true }))

mock.module("@/lib/services/phases", () => ({
  getPhasesForStatus: (status: string) => {
    if (status === "active") return ["build", "submission_open"]
    if (status === "judging") return ["preliminaries", "finals", "results_pending"]
    return []
  },
  getPhaseLabel: (phase: string) => phase,
  validatePhaseTransition: () => null,
  setPhase: mockSetPhase,
  getPhase: mock(() => Promise.resolve("build")),
}))

const mockCheckHackathonOrganizer = mock(() =>
  Promise.resolve({ status: "authorized" as const, hackathon: { id: "h1", tenant_id: "tenant-123" } })
)

mock.module("@/lib/services/public-hackathons", () => ({
  checkHackathonOrganizer: mockCheckHackathonOrganizer,
  getPublicHackathon: mock(() => Promise.resolve(null)),
}))

const mockResolvePrincipal = mock(() =>
  Promise.resolve({ kind: "anon" })
)

mock.module("@/lib/auth/principal", () => {
  class AuthError extends Error {
    statusCode: number
    constructor(message: string, statusCode: number) {
      super(message)
      this.statusCode = statusCode
      this.name = "AuthError"
    }
  }

  return {
    resolvePrincipal: mockResolvePrincipal,
    requirePrincipal: (principal: unknown, ..._rest: unknown[]) => {
      if (!principal || (principal as { kind: string }).kind === "anon") {
        throw new AuthError("Unauthorized", 401)
      }
      return principal
    },
    AuthError,
  }
})

mock.module("@/lib/services/rate-limit", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 100, resetAt: Date.now() + 60000 }),
  getRateLimitHeaders: () => ({}),
  defaultRateLimits: { "api_key:default": { maxRequests: 100, windowMs: 60000 } },
  RateLimitError: class RateLimitError extends Error {
    resetAt: number
    remaining: number
    constructor(resetAt: number, remaining: number) {
      super("Rate limit exceeded")
      this.resetAt = resetAt
      this.remaining = remaining
    }
  },
}))

const { Elysia } = await import("elysia")
const { dashboardEventRoutes } = await import("@/lib/api/routes/dashboard-event")
const { handleRouteError } = await import("@/lib/api/routes/errors")

const app = new Elysia({ prefix: "/api" })
  .onError(({ error, set, path }) => handleRouteError(error, set, path))
  .use(dashboardEventRoutes)

const mockUserPrincipal = {
  kind: "user" as const,
  tenantId: "tenant-123",
  userId: "user-456",
  orgId: "org-789",
  orgRole: "org:admin",
  scopes: ["hackathons:read", "hackathons:write"],
}

describe("Dashboard Event Routes Integration Tests", () => {
  beforeEach(() => {
    resetClerkMocks()
    mockResolvePrincipal.mockReset()
    mockSetPhase.mockReset()
    mockCheckHackathonOrganizer.mockReset()

    mockSetPhase.mockResolvedValue({ success: true })
    mockCheckHackathonOrganizer.mockResolvedValue({
      status: "authorized" as const,
      hackathon: { id: "h1", tenant_id: "tenant-123" },
    })
  })

  describe("PATCH /api/dashboard/hackathons/:id/phase", () => {
    const url = "http://localhost/api/dashboard/hackathons/11111111-1111-1111-1111-111111111111/phase"

    it("rejects unauthenticated requests", async () => {
      mockResolvePrincipal.mockResolvedValue({ kind: "anon" })

      const res = await app.handle(
        new Request(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase: "build" }),
        })
      )
      const data = await res.json()

      expect(data.error).toBe("Unauthorized")
      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it("sets phase successfully for authenticated organizer", async () => {
      mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)

      const res = await app.handle(
        new Request(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase: "build" }),
        })
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.phase).toBe("build")
      expect(mockSetPhase).toHaveBeenCalledWith(
        "11111111-1111-1111-1111-111111111111",
        "tenant-123",
        "build"
      )
    })

    it("rejects invalid phase values", async () => {
      mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)

      const res = await app.handle(
        new Request(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase: "invalid_phase" }),
        })
      )
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toContain("Invalid phase")
    })

    it("returns 404 when hackathon not found", async () => {
      mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)
      mockCheckHackathonOrganizer.mockResolvedValue({ status: "not_found" as const })

      const res = await app.handle(
        new Request(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase: "build" }),
        })
      )
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data.error).toBe("Hackathon not found")
    })

    it("returns 403 when user is not organizer", async () => {
      mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)
      mockCheckHackathonOrganizer.mockResolvedValue({ status: "not_authorized" as const })

      const res = await app.handle(
        new Request(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase: "build" }),
        })
      )
      const data = await res.json()

      expect(res.status).toBe(403)
      expect(data.error).toBe("Not authorized to manage this hackathon")
    })

    it("returns 400 when setPhase returns an error", async () => {
      mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)
      mockSetPhase.mockResolvedValue({ error: "Phase not valid for status" })

      const res = await app.handle(
        new Request(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase: "submission_open" }),
        })
      )
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe("Phase not valid for status")
    })

    it("accepts all valid phase values", async () => {
      mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)

      const phases = ["build", "submission_open", "preliminaries", "finals", "results_pending"]

      for (const phase of phases) {
        mockSetPhase.mockResolvedValue({ success: true })

        const res = await app.handle(
          new Request(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phase }),
          })
        )
        const data = await res.json()

        expect(res.status).toBe(200)
        expect(data.phase).toBe(phase)
      }
    })
  })
})
