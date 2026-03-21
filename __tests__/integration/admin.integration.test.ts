import { describe, expect, it, mock, beforeEach } from "bun:test"

const mockGetPlatformStats = mock(() =>
  Promise.resolve({ tenants: 5, hackathons: 10, participants: 50, submissions: 20 })
)
const mockListAllHackathons = mock(() =>
  Promise.resolve({ hackathons: [], total: 0 })
)
const mockGetHackathonById = mock(() => Promise.resolve(null))
const mockUpdateHackathonAsAdmin = mock(() => Promise.resolve({ id: "h-1" }))
const mockDeleteHackathon = mock(() => Promise.resolve())
const mockLogAudit = mock(() => Promise.resolve(null))
const mockListScenarios = mock(() => [
  { name: "pre-registration", description: "Test scenario" },
])
const mockRunScenario = mock(() =>
  Promise.resolve({ hackathonId: "h-1", tenantId: "t-1" })
)

mock.module("@/lib/services/admin", () => ({
  getPlatformStats: mockGetPlatformStats,
  listAllHackathons: mockListAllHackathons,
  getHackathonById: mockGetHackathonById,
  updateHackathonAsAdmin: mockUpdateHackathonAsAdmin,
  deleteHackathon: mockDeleteHackathon,
}))

mock.module("@/lib/services/admin-scenarios", () => ({
  listScenarios: mockListScenarios,
  runScenario: mockRunScenario,
}))

mock.module("@/lib/services/audit", () => ({
  logAudit: mockLogAudit,
}))

const mockResolvePrincipal = mock(() =>
  Promise.resolve({ kind: "anon" })
)

mock.module("@/lib/auth/principal", () => {
  class AuthError extends Error {
    statusCode: number
    constructor(message: string, statusCode = 401) {
      super(message)
      this.statusCode = statusCode
      this.name = "AuthError"
    }
  }

  return {
    resolvePrincipal: mockResolvePrincipal,
    requireAdmin: (principal: { kind: string }) => {
      if (principal.kind !== "admin") {
        throw new AuthError("Forbidden", 403)
      }
    },
    isAdminEnabled: () => true,
    AuthError,
  }
})

mock.module("@/lib/services/rate-limit", () => ({
  checkRateLimit: () => ({
    allowed: true,
    remaining: 100,
    resetAt: Date.now() + 60000,
  }),
  getRateLimitHeaders: () => ({}),
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
const { adminRoutes } = await import("@/lib/api/routes/admin")

const app = new Elysia({ prefix: "/api" }).use(adminRoutes)

const adminPrincipal = {
  kind: "admin" as const,
  userId: "admin-1",
  scopes: ["admin:read", "admin:write", "admin:scenarios"],
}

const userPrincipal = {
  kind: "user" as const,
  tenantId: "t-1",
  userId: "user-1",
  orgId: "org-1",
  orgRole: "org:admin",
  scopes: ["hackathons:read"],
}

describe("Admin API Routes", () => {
  beforeEach(() => {
    mockResolvePrincipal.mockReset()
    mockGetPlatformStats.mockReset()
    mockListAllHackathons.mockReset()
    mockGetHackathonById.mockReset()
    mockUpdateHackathonAsAdmin.mockReset()
    mockDeleteHackathon.mockReset()
    mockLogAudit.mockReset()
    mockListScenarios.mockReset()
    mockRunScenario.mockReset()

    mockGetPlatformStats.mockResolvedValue({
      tenants: 5,
      hackathons: 10,
      participants: 50,
      submissions: 20,
    })
    mockListAllHackathons.mockResolvedValue({ hackathons: [], total: 0 })
    mockListScenarios.mockReturnValue([
      { name: "pre-registration", description: "Test scenario" },
    ])
  })

  describe("Auth enforcement", () => {
    it("rejects unauthenticated requests with 403", async () => {
      mockResolvePrincipal.mockResolvedValue({ kind: "anon" })

      const res = await app.handle(
        new Request("http://localhost/api/admin/stats")
      )

      expect(res.status).toBe(403)
    })

    it("rejects non-admin users with 403", async () => {
      mockResolvePrincipal.mockResolvedValue(userPrincipal)

      const res = await app.handle(
        new Request("http://localhost/api/admin/stats")
      )

      expect(res.status).toBe(403)
    })

    it("rejects unauthenticated requests to hackathons", async () => {
      mockResolvePrincipal.mockResolvedValue({ kind: "anon" })

      const res = await app.handle(
        new Request("http://localhost/api/admin/hackathons")
      )

      expect(res.status).toBe(403)
    })

    it("rejects unauthenticated requests to scenarios", async () => {
      mockResolvePrincipal.mockResolvedValue({ kind: "anon" })

      const res = await app.handle(
        new Request("http://localhost/api/admin/scenarios")
      )

      expect(res.status).toBe(403)
    })
  })

  describe("GET /admin/stats", () => {
    it("returns platform stats for admin", async () => {
      mockResolvePrincipal.mockResolvedValue(adminPrincipal)

      const res = await app.handle(
        new Request("http://localhost/api/admin/stats")
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.tenants).toBe(5)
      expect(data.hackathons).toBe(10)
      expect(data.participants).toBe(50)
      expect(data.submissions).toBe(20)
    })
  })

  describe("GET /admin/hackathons", () => {
    it("returns hackathon list for admin", async () => {
      mockResolvePrincipal.mockResolvedValue(adminPrincipal)
      mockListAllHackathons.mockResolvedValue({
        hackathons: [{ id: "h-1", name: "Test Hack" }],
        total: 1,
      })

      const res = await app.handle(
        new Request("http://localhost/api/admin/hackathons")
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.hackathons).toHaveLength(1)
      expect(data.total).toBe(1)
    })

    it("passes query params to service", async () => {
      mockResolvePrincipal.mockResolvedValue(adminPrincipal)
      mockListAllHackathons.mockResolvedValue({ hackathons: [], total: 0 })

      await app.handle(
        new Request(
          "http://localhost/api/admin/hackathons?limit=10&offset=5&status=active&search=test"
        )
      )

      expect(mockListAllHackathons).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 5,
          status: "active",
          search: "test",
        })
      )
    })
  })

  describe("GET /admin/hackathons/:id", () => {
    it("returns hackathon detail for admin", async () => {
      mockResolvePrincipal.mockResolvedValue(adminPrincipal)
      mockGetHackathonById.mockResolvedValue({
        id: "h-1",
        name: "Test Hack",
        tenant_id: "t-1",
      })

      const res = await app.handle(
        new Request("http://localhost/api/admin/hackathons/h-1")
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.id).toBe("h-1")
    })

    it("returns 404 for missing hackathon", async () => {
      mockResolvePrincipal.mockResolvedValue(adminPrincipal)
      mockGetHackathonById.mockResolvedValue(null)

      const res = await app.handle(
        new Request("http://localhost/api/admin/hackathons/missing")
      )

      expect(res.status).toBe(404)
    })
  })

  describe("PATCH /admin/hackathons/:id", () => {
    it("updates hackathon and logs audit", async () => {
      mockResolvePrincipal.mockResolvedValue(adminPrincipal)
      mockGetHackathonById.mockResolvedValue({
        id: "h-1",
        name: "Old Name",
        tenant_id: "t-1",
      })
      mockUpdateHackathonAsAdmin.mockResolvedValue({
        id: "h-1",
        name: "New Name",
      })

      const res = await app.handle(
        new Request("http://localhost/api/admin/hackathons/h-1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "New Name" }),
        })
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.name).toBe("New Name")
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "admin.hackathon.updated",
          resourceId: "h-1",
          targetTenantId: "t-1",
        })
      )
    })

    it("rejects invalid status values", async () => {
      mockResolvePrincipal.mockResolvedValue(adminPrincipal)
      mockGetHackathonById.mockResolvedValue({
        id: "h-1",
        tenant_id: "t-1",
      })

      const res = await app.handle(
        new Request("http://localhost/api/admin/hackathons/h-1", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "invalid_status" }),
        })
      )

      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(mockUpdateHackathonAsAdmin).not.toHaveBeenCalled()
    })
  })

  describe("DELETE /admin/hackathons/:id", () => {
    it("deletes hackathon and logs audit", async () => {
      mockResolvePrincipal.mockResolvedValue(adminPrincipal)
      mockGetHackathonById.mockResolvedValue({
        id: "h-1",
        name: "Doomed",
        slug: "doomed",
        tenant_id: "t-1",
      })

      const res = await app.handle(
        new Request("http://localhost/api/admin/hackathons/h-1", {
          method: "DELETE",
        })
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockDeleteHackathon).toHaveBeenCalledWith("h-1")
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "admin.hackathon.deleted",
          targetTenantId: "t-1",
        })
      )
    })

    it("returns 404 for missing hackathon", async () => {
      mockResolvePrincipal.mockResolvedValue(adminPrincipal)
      mockGetHackathonById.mockResolvedValue(null)

      const res = await app.handle(
        new Request("http://localhost/api/admin/hackathons/missing", {
          method: "DELETE",
        })
      )

      expect(res.status).toBe(404)
    })
  })

  describe("GET /admin/scenarios", () => {
    it("returns scenario list for admin", async () => {
      mockResolvePrincipal.mockResolvedValue(adminPrincipal)

      const res = await app.handle(
        new Request("http://localhost/api/admin/scenarios")
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.scenarios).toHaveLength(1)
    })
  })

  describe("POST /admin/scenarios/:name", () => {
    it("runs scenario and logs audit", async () => {
      mockResolvePrincipal.mockResolvedValue(adminPrincipal)
      mockRunScenario.mockResolvedValue({
        hackathonId: "h-new",
        tenantId: "t-new",
      })

      const res = await app.handle(
        new Request("http://localhost/api/admin/scenarios/pre-registration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.hackathonId).toBe("h-new")
      expect(mockLogAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "admin.scenario.created",
          metadata: { scenario: "pre-registration" },
        })
      )
    })
  })
})
