import { describe, expect, it, mock, beforeEach } from "bun:test"
import { resetClerkMocks } from "../lib/supabase-mock"

const mockListSponsorFulfillments = mock(() => Promise.resolve([]))
const mockMarkSponsorFulfilled = mock(() => Promise.resolve(true))

mock.module("@/lib/services/sponsor-fulfillments", () => ({
  listSponsorFulfillments: mockListSponsorFulfillments,
  markSponsorFulfilled: mockMarkSponsorFulfilled,
}))

mock.module("@/lib/services/public-hackathons", () => ({
  checkHackathonOrganizer: mock(() => Promise.resolve({ status: "ok" })),
}))

mock.module("@/lib/services/audit", () => ({
  logAudit: mock(() => Promise.resolve(null)),
  listAllAuditLogs: mock(() => Promise.resolve({ logs: [], total: 0 })),
}))

mock.module("@/lib/services/storage", () => ({
  uploadLogo: mock(() => Promise.resolve(null)),
  deleteLogo: mock(() => Promise.resolve(true)),
  uploadBanner: mock(() => Promise.resolve(null)),
  deleteBanner: mock(() => Promise.resolve(true)),
  uploadScreenshot: mock(() => Promise.resolve(null)),
  deleteScreenshot: mock(() => Promise.resolve(true)),
  uploadSponsorLogo: mock(() => Promise.resolve(null)),
  deleteSponsorLogo: mock(() => Promise.resolve(true)),
  optimizeImage: mock(() => Promise.resolve({ buffer: Buffer.alloc(64), mimeType: "image/webp" })),
  optimizeScreenshot: mock(() => Promise.resolve({ buffer: Buffer.alloc(64), mimeType: "image/webp" })),
  optimizeBanner: mock(() => Promise.resolve({ buffer: Buffer.alloc(64), mimeType: "image/webp" })),
  ImageTooLargeError: class ImageTooLargeError extends Error {
    constructor(size: number) {
      super(`Image too large: ${size}`)
      this.name = "ImageTooLargeError"
    }
  },
}))

mock.module("@/lib/services/sponsors", () => ({
  updateSponsor: mock(() => Promise.resolve(null)),
  listHackathonSponsors: mock(() => Promise.resolve([])),
}))

mock.module("@/lib/services/tenant-sponsors", () => ({
  updateTenantSponsorLogos: mock(() => Promise.resolve()),
}))

mock.module("@/lib/services/tenant-profiles", () => ({
  isSlugAvailable: mock(() => Promise.resolve(true)),
}))

const mockResolvePrincipal = mock(() => Promise.resolve({ kind: "anon" }))

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
    isAdminEnabled: () => true,
    requireAdmin: (principal: { kind: string }) => {
      if (principal.kind !== "admin") throw new AuthError("Forbidden", 403)
    },
    requireAdminScopes: () => {},
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
const { dashboardRoutes } = await import("@/lib/api/routes/dashboard")
const { handleRouteError } = await import("@/lib/api/routes/errors")

const app = new Elysia({ prefix: "/api" })
  .onError(({ error, set, path }) => handleRouteError(error, set, path))
  .use(dashboardRoutes)

const VALID_UUID = "11111111-1111-1111-1111-111111111111"
const VALID_UUID2 = "22222222-2222-2222-2222-222222222222"

const mockUserPrincipal = {
  kind: "user" as const,
  tenantId: "tenant-123",
  userId: "user-456",
  orgId: "org-789",
  orgRole: "org:admin",
  scopes: ["hackathons:read", "hackathons:write"],
}

describe("Sponsor Fulfillments API Integration Tests", () => {
  beforeEach(() => {
    resetClerkMocks()
    mockResolvePrincipal.mockReset()
    mockListSponsorFulfillments.mockReset()
    mockMarkSponsorFulfilled.mockReset()

    mockListSponsorFulfillments.mockResolvedValue([])
    mockMarkSponsorFulfilled.mockResolvedValue(true)
  })

  describe("GET /api/dashboard/hackathons/:id/sponsor-fulfillments", () => {
    it("returns 401 when unauthenticated", async () => {
      mockResolvePrincipal.mockResolvedValue({ kind: "anon" })
      const res = await app.handle(
        new Request(`http://localhost/api/dashboard/hackathons/${VALID_UUID}/sponsor-fulfillments`)
      )
      expect(res.status).toBe(401)
    })

    it("returns 404 for invalid UUID", async () => {
      mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)
      const res = await app.handle(
        new Request("http://localhost/api/dashboard/hackathons/not-a-uuid/sponsor-fulfillments")
      )
      expect(res.status).toBe(404)
    })

    it("returns fulfillments for authenticated sponsor", async () => {
      mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)
      mockListSponsorFulfillments.mockResolvedValue([
        {
          fulfillmentId: "f-1",
          prizeName: "Grand Prize",
          prizeValue: "$1000",
          submissionTitle: "Cool Project",
          teamName: "Team A",
          status: "claimed",
          recipientName: "Alice",
          recipientEmail: "alice@test.com",
          shippingAddress: null,
          paymentMethod: "venmo",
          paymentDetail: "@alice",
          trackingNumber: null,
          claimedAt: "2026-04-01T00:00:00Z",
        },
      ])

      const res = await app.handle(
        new Request(`http://localhost/api/dashboard/hackathons/${VALID_UUID}/sponsor-fulfillments`)
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.fulfillments).toHaveLength(1)
      expect(data.fulfillments[0].prizeName).toBe("Grand Prize")
    })

    it("passes correct tenantId and hackathonId to service", async () => {
      mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)

      await app.handle(
        new Request(`http://localhost/api/dashboard/hackathons/${VALID_UUID}/sponsor-fulfillments`)
      )

      expect(mockListSponsorFulfillments).toHaveBeenCalledWith("tenant-123", VALID_UUID)
    })
  })

  describe("PATCH /api/dashboard/hackathons/:id/sponsor-fulfillments/:fulfillmentId", () => {
    it("returns 401 when unauthenticated", async () => {
      mockResolvePrincipal.mockResolvedValue({ kind: "anon" })
      const res = await app.handle(
        new Request(`http://localhost/api/dashboard/hackathons/${VALID_UUID}/sponsor-fulfillments/${VALID_UUID2}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
      )
      expect(res.status).toBe(401)
    })

    it("returns 404 for invalid hackathon UUID", async () => {
      mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)
      const res = await app.handle(
        new Request(`http://localhost/api/dashboard/hackathons/bad-id/sponsor-fulfillments/${VALID_UUID2}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
      )
      expect(res.status).toBe(404)
    })

    it("returns 404 for invalid fulfillment UUID", async () => {
      mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)
      const res = await app.handle(
        new Request(`http://localhost/api/dashboard/hackathons/${VALID_UUID}/sponsor-fulfillments/bad-id`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
      )
      expect(res.status).toBe(404)
    })

    it("returns 400 when fulfillment cannot be marked", async () => {
      mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)
      mockMarkSponsorFulfilled.mockResolvedValue(false)

      const res = await app.handle(
        new Request(`http://localhost/api/dashboard/hackathons/${VALID_UUID}/sponsor-fulfillments/${VALID_UUID2}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
      )

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain("Cannot mark as fulfilled")
    })

    it("returns success when fulfillment is marked", async () => {
      mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)
      mockMarkSponsorFulfilled.mockResolvedValue(true)

      const res = await app.handle(
        new Request(`http://localhost/api/dashboard/hackathons/${VALID_UUID}/sponsor-fulfillments/${VALID_UUID2}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackingNumber: "TRACK123" }),
        })
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it("passes tracking number to service", async () => {
      mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)

      await app.handle(
        new Request(`http://localhost/api/dashboard/hackathons/${VALID_UUID}/sponsor-fulfillments/${VALID_UUID2}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackingNumber: "1Z999" }),
        })
      )

      expect(mockMarkSponsorFulfilled).toHaveBeenCalledWith(
        "tenant-123",
        VALID_UUID,
        VALID_UUID2,
        "1Z999"
      )
    })
  })
})
