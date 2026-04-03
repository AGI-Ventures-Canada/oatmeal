import { describe, expect, it, mock, beforeEach } from "bun:test"

const mockListAllAuditLogs = mock(() =>
  Promise.resolve({ logs: [], total: 0 })
)

mock.module("@/lib/services/audit", () => ({
  listAllAuditLogs: mockListAllAuditLogs,
  logAudit: mock(() => Promise.resolve(null)),
}))

mock.module("@/lib/services/admin", () => ({
  getPlatformStats: mock(() => Promise.resolve({ tenants: 0, hackathons: 0, participants: 0, submissions: 0 })),
  listAllHackathons: mock(() => Promise.resolve({ hackathons: [], total: 0 })),
  getHackathonById: mock(() => Promise.resolve(null)),
  updateHackathonAsAdmin: mock(() => Promise.resolve(null)),
  deleteHackathon: mock(() => Promise.resolve()),
}))

mock.module("@/lib/services/admin-scenarios", () => ({
  listScenarios: mock(() => []),
  runScenario: mock(() => Promise.resolve({ hackathonId: "h-1", slug: "s", tenantId: "t-1" })),
}))

mock.module("@/lib/db/client", () => ({
  supabase: () => ({ rpc: mock(() => Promise.resolve({ data: 0, error: null })) }),
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
    requireAdmin: (principal: { kind: string; scopes?: string[] }) => {
      if (principal.kind === "admin") return
      if (
        principal.kind === "api_key" &&
        Array.isArray(principal.scopes) &&
        ["admin:read", "admin:write", "admin:scenarios"].some((s) => principal.scopes!.includes(s))
      ) {
        return
      }
      throw new AuthError("Forbidden", 403)
    },
    requireAdminScopes: (principal: { kind: string; scopes?: string[] }, scopes: string[]) => {
      if (principal.kind === "admin") return
      for (const scope of scopes) {
        if (!principal.scopes?.includes(scope)) {
          throw new AuthError(`Missing required scope: ${scope}`, 403)
        }
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
const { handleRouteError } = await import("@/lib/api/routes/errors")

const app = new Elysia({ prefix: "/api" })
  .onError(({ error, set, path }) => handleRouteError(error, set, path))
  .use(adminRoutes)

const adminPrincipal = {
  kind: "admin" as const,
  userId: "admin-1",
  tenantId: "tenant-1",
  orgId: null,
  scopes: ["admin:read", "admin:write", "admin:scenarios"],
}

const readOnlyApiKeyPrincipal = {
  kind: "api_key" as const,
  tenantId: "t-1",
  keyId: "key-readonly",
  scopes: ["admin:read"],
}

const VALID_UUID = "11111111-1111-1111-1111-111111111111"
const VALID_UUID_2 = "22222222-2222-2222-2222-222222222222"

describe("Admin Activity Route", () => {
  beforeEach(() => {
    mockResolvePrincipal.mockReset()
    mockListAllAuditLogs.mockReset()
    mockListAllAuditLogs.mockResolvedValue({ logs: [], total: 0 })
  })

  describe("GET /admin/activity - UUID validation", () => {
    it("returns 400 for invalid hackathon_id UUID format", async () => {
      mockResolvePrincipal.mockResolvedValue(adminPrincipal)

      const res = await app.handle(
        new Request("http://localhost/api/admin/activity?hackathon_id=not-a-uuid")
      )

      expect(res.status).toBe(400)
      expect(mockListAllAuditLogs).not.toHaveBeenCalled()
    })

    it("returns 400 for invalid tenant_id UUID format", async () => {
      mockResolvePrincipal.mockResolvedValue(adminPrincipal)

      const res = await app.handle(
        new Request("http://localhost/api/admin/activity?tenant_id=bad-id")
      )

      expect(res.status).toBe(400)
      expect(mockListAllAuditLogs).not.toHaveBeenCalled()
    })

    it("returns 400 when both hackathon_id and tenant_id are invalid", async () => {
      mockResolvePrincipal.mockResolvedValue(adminPrincipal)

      const res = await app.handle(
        new Request("http://localhost/api/admin/activity?hackathon_id=bad&tenant_id=also-bad")
      )

      expect(res.status).toBe(400)
      expect(mockListAllAuditLogs).not.toHaveBeenCalled()
    })

    it("accepts valid UUID for hackathon_id", async () => {
      mockResolvePrincipal.mockResolvedValue(adminPrincipal)

      const res = await app.handle(
        new Request(`http://localhost/api/admin/activity?hackathon_id=${VALID_UUID}`)
      )

      expect(res.status).toBe(200)
      expect(mockListAllAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ hackathonId: VALID_UUID })
      )
    })

    it("accepts valid UUID for tenant_id", async () => {
      mockResolvePrincipal.mockResolvedValue(adminPrincipal)

      const res = await app.handle(
        new Request(`http://localhost/api/admin/activity?tenant_id=${VALID_UUID}`)
      )

      expect(res.status).toBe(200)
      expect(mockListAllAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: VALID_UUID })
      )
    })
  })

  describe("GET /admin/activity - successful responses", () => {
    it("returns activity logs with no filters", async () => {
      mockResolvePrincipal.mockResolvedValue(adminPrincipal)
      mockListAllAuditLogs.mockResolvedValue({
        logs: [
          { id: "log-1", action: "admin.hackathon.updated", created_at: "2026-01-01T00:00:00Z" },
          { id: "log-2", action: "admin.hackathon.deleted", created_at: "2026-01-02T00:00:00Z" },
        ],
        total: 2,
      })

      const res = await app.handle(
        new Request("http://localhost/api/admin/activity")
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.logs).toHaveLength(2)
      expect(data.total).toBe(2)
    })

    it("returns activity logs filtered by valid hackathon_id and tenant_id", async () => {
      mockResolvePrincipal.mockResolvedValue(adminPrincipal)
      mockListAllAuditLogs.mockResolvedValue({ logs: [{ id: "log-1" }], total: 1 })

      const res = await app.handle(
        new Request(
          `http://localhost/api/admin/activity?hackathon_id=${VALID_UUID}&tenant_id=${VALID_UUID_2}`
        )
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.logs).toHaveLength(1)
      expect(mockListAllAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          hackathonId: VALID_UUID,
          tenantId: VALID_UUID_2,
        })
      )
    })

    it("passes action and resource_type filters to service", async () => {
      mockResolvePrincipal.mockResolvedValue(adminPrincipal)

      await app.handle(
        new Request(
          "http://localhost/api/admin/activity?action=admin.hackathon.updated&resource_type=hackathon"
        )
      )

      expect(mockListAllAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "admin.hackathon.updated",
          resourceType: "hackathon",
        })
      )
    })
  })

  describe("GET /admin/activity - pagination", () => {
    it("passes limit and offset to service", async () => {
      mockResolvePrincipal.mockResolvedValue(adminPrincipal)

      await app.handle(
        new Request("http://localhost/api/admin/activity?limit=25&offset=50")
      )

      expect(mockListAllAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 25, offset: 50 })
      )
    })

    it("calls service without limit/offset when not provided", async () => {
      mockResolvePrincipal.mockResolvedValue(adminPrincipal)

      await app.handle(
        new Request("http://localhost/api/admin/activity")
      )

      expect(mockListAllAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          hackathonId: undefined,
          tenantId: undefined,
          action: undefined,
          resourceType: undefined,
        })
      )
    })
  })

  describe("GET /admin/activity - auth enforcement", () => {
    it("rejects unauthenticated requests with 403", async () => {
      mockResolvePrincipal.mockResolvedValue({ kind: "anon" })

      const res = await app.handle(
        new Request("http://localhost/api/admin/activity")
      )

      expect(res.status).toBe(403)
      expect(mockListAllAuditLogs).not.toHaveBeenCalled()
    })

    it("allows read-only API key to access activity logs", async () => {
      mockResolvePrincipal.mockResolvedValue(readOnlyApiKeyPrincipal)

      const res = await app.handle(
        new Request("http://localhost/api/admin/activity")
      )

      expect(res.status).toBe(200)
    })
  })
})
