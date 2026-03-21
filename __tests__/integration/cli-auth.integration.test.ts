import { describe, expect, it, mock, beforeEach } from "bun:test"

const mockCreateCliAuthSession = mock(() =>
  Promise.resolve({
    id: "session-1",
    device_token: "a".repeat(32),
    status: "pending",
    expires_at: new Date(Date.now() + 300_000).toISOString(),
  })
)
const mockPollCliAuthSession = mock(() =>
  Promise.resolve({ status: "pending" as const })
)
const mockCompleteCliAuthSession = mock(() =>
  Promise.resolve({ success: true })
)

mock.module("@/lib/services/cli-auth", () => ({
  createCliAuthSession: mockCreateCliAuthSession,
  pollCliAuthSession: mockPollCliAuthSession,
  completeCliAuthSession: mockCompleteCliAuthSession,
}))

const mockLogAudit = mock(() => Promise.resolve(null))

mock.module("@/lib/services/audit", () => ({
  logAudit: mockLogAudit,
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
    requirePrincipal: (principal: unknown, allowedKinds: string[]) => {
      if (!principal || (principal as { kind: string }).kind === "anon") {
        throw new AuthError("Unauthorized", 401)
      }
      const kind = (principal as { kind: string }).kind
      if (!allowedKinds.includes(kind)) {
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

mock.module("@clerk/nextjs/server", () => ({
  auth: mock(() => Promise.resolve({ userId: null, orgId: null })),
  clerkClient: mock(() => Promise.resolve({
    organizations: {
      getOrganization: mock(() => Promise.resolve({ name: "Test Org" })),
    },
    users: {
      getUser: mock(() => Promise.resolve({ firstName: "Test", lastName: "User", username: null, emailAddresses: [] })),
    },
  })),
}))

mock.module("@/lib/services/public-hackathons", () => ({
  getPublicHackathon: mock(() => Promise.resolve(null)),
  getPublicHackathonById: mock(() => Promise.resolve(null)),
  listPublicHackathons: mock(() => Promise.resolve({ hackathons: [], total: 0 })),
  getHackathonByIdForOrganizer: mock(() => Promise.resolve(null)),
  checkHackathonOrganizer: mock(() => Promise.resolve({ status: "not_found" })),
  getHackathonByIdWithFullData: mock(() => Promise.resolve(null)),
  getHackathonByIdWithAccess: mock(() => Promise.resolve(null)),
  updateHackathonSettings: mock(() => Promise.resolve(null)),
}))

mock.module("@/lib/services/hackathons", () => ({
  registerForHackathon: mock(() => Promise.resolve({ success: false })),
  getParticipantCount: mock(() => Promise.resolve(0)),
  isUserRegistered: mock(() => Promise.resolve(false)),
}))

mock.module("@/lib/services/tenant-profiles", () => ({
  getPublicTenantWithEvents: mock(() => Promise.resolve(null)),
  isSlugAvailable: mock(() => Promise.resolve(true)),
}))

mock.module("@/lib/integrations/oauth", () => ({
  exchangeCodeForTokens: mock(() => Promise.resolve(null)),
  saveIntegration: mock(() => Promise.resolve()),
  getProviderConfig: mock(() => null),
}))

mock.module("@/lib/services/submissions", () => ({
  getParticipantWithTeam: mock(() => Promise.resolve(null)),
  getSubmissionForParticipant: mock(() => Promise.resolve(null)),
  getExistingSubmission: mock(() => Promise.resolve(null)),
  createSubmission: mock(() => Promise.resolve(null)),
  updateSubmission: mock(() => Promise.resolve(null)),
  getHackathonSubmissions: mock(() => Promise.resolve([])),
}))

mock.module("@/lib/utils/url", () => ({
  urlInputProps: { type: "text", inputMode: "url", autoCapitalize: "none", spellCheck: false },
  normalizeUrl: mock((url: string) => url),
  normalizeUrlFieldValue: mock((url: string) => url),
  normalizeOptionalUrl: mock((url: string | null | undefined) => url ?? null),
}))

const { Elysia } = await import("elysia")
const { dashboardRoutes } = await import("@/lib/api/routes/dashboard")
const { publicRoutes } = await import("@/lib/api/routes/public")

const dashboardApp = new Elysia({ prefix: "/api" }).use(dashboardRoutes)
const publicApp = new Elysia({ prefix: "/api" }).use(publicRoutes)

const mockUserPrincipal = {
  kind: "user" as const,
  tenantId: "tenant-123",
  userId: "user-456",
  orgId: "org-789",
  orgRole: "org:admin",
  scopes: ["keys:read", "keys:write", "hackathons:read", "hackathons:write"],
}

const mockApiKeyPrincipal = {
  kind: "api_key" as const,
  tenantId: "tenant-123",
  keyId: "key-456",
  scopes: ["hackathons:read", "hackathons:write"],
}

const validToken = "a".repeat(32)

describe("CLI Auth Routes Integration Tests", () => {
  beforeEach(() => {
    mockCreateCliAuthSession.mockClear()
    mockPollCliAuthSession.mockClear()
    mockCompleteCliAuthSession.mockClear()
    mockLogAudit.mockClear()
    mockResolvePrincipal.mockReset()
  })

  describe("POST /api/dashboard/cli-auth/complete", () => {
    it("completes session for authenticated user", async () => {
      mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)

      const res = await dashboardApp.handle(
        new Request("http://localhost/api/dashboard/cli-auth/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceToken: validToken }),
        })
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(mockCompleteCliAuthSession).toHaveBeenCalledTimes(1)
      expect(mockCompleteCliAuthSession.mock.calls[0]).toEqual([
        validToken,
        "tenant-123",
        undefined,
      ])
    })

    it("passes hostname when provided", async () => {
      mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)

      const res = await dashboardApp.handle(
        new Request("http://localhost/api/dashboard/cli-auth/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceToken: validToken, hostname: "my-laptop" }),
        })
      )

      expect(res.status).toBe(200)
      expect(mockCompleteCliAuthSession.mock.calls[0]).toEqual([
        validToken,
        "tenant-123",
        "my-laptop",
      ])
    })

    it("logs audit event on success", async () => {
      mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)

      await dashboardApp.handle(
        new Request("http://localhost/api/dashboard/cli-auth/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceToken: validToken }),
        })
      )

      expect(mockLogAudit).toHaveBeenCalledTimes(1)
      const auditCall = mockLogAudit.mock.calls[0] as unknown as [{ action: string; resourceType: string; resourceId: string }]
      expect(auditCall[0].action).toBe("cli_auth.completed")
      expect(auditCall[0].resourceType).toBe("cli_auth_session")
      expect(auditCall[0].resourceId).toBe(validToken.slice(0, 12))
    })

    it("returns 400 when device token is too short", async () => {
      mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)

      const res = await dashboardApp.handle(
        new Request("http://localhost/api/dashboard/cli-auth/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceToken: "short" }),
        })
      )

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe("Invalid device token")
      expect(mockCompleteCliAuthSession).not.toHaveBeenCalled()
    })

    it("returns 400 when service reports failure", async () => {
      mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)
      mockCompleteCliAuthSession.mockResolvedValueOnce({
        success: false,
        error: "Session not found or expired",
      })

      const res = await dashboardApp.handle(
        new Request("http://localhost/api/dashboard/cli-auth/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceToken: validToken }),
        })
      )

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe("Session not found or expired")
      expect(mockLogAudit).not.toHaveBeenCalled()
    })

    it("does not log audit on failure", async () => {
      mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)
      mockCompleteCliAuthSession.mockResolvedValueOnce({
        success: false,
        error: "Session expired",
      })

      await dashboardApp.handle(
        new Request("http://localhost/api/dashboard/cli-auth/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceToken: validToken }),
        })
      )

      expect(mockLogAudit).not.toHaveBeenCalled()
    })

    it("rejects unauthenticated requests", async () => {
      mockResolvePrincipal.mockResolvedValue({ kind: "anon" })

      const res = await dashboardApp.handle(
        new Request("http://localhost/api/dashboard/cli-auth/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceToken: validToken }),
        })
      )

      const data = await res.json()
      expect(data.error).toBe("Unauthorized")
      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it("rejects API key authentication (Clerk-only)", async () => {
      mockResolvePrincipal.mockResolvedValue(mockApiKeyPrincipal)

      const res = await dashboardApp.handle(
        new Request("http://localhost/api/dashboard/cli-auth/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceToken: validToken }),
        })
      )

      const data = await res.json()
      expect(data.error).toBe("Unauthorized")
      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it("returns 422 when body is missing deviceToken", async () => {
      mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)

      const res = await dashboardApp.handle(
        new Request("http://localhost/api/dashboard/cli-auth/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
      )

      expect(res.status).toBe(422)
    })
  })

  describe("GET /api/public/cli-auth/poll", () => {
    it("returns pending status for new session", async () => {
      mockPollCliAuthSession.mockResolvedValueOnce({ status: "pending" })

      const res = await publicApp.handle(
        new Request(`http://localhost/api/public/cli-auth/poll?token=${validToken}`)
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.status).toBe("pending")
    })

    it("returns complete with API key", async () => {
      mockPollCliAuthSession.mockResolvedValueOnce({
        status: "complete",
        apiKey: "sk_live_test123",
      })

      const res = await publicApp.handle(
        new Request(`http://localhost/api/public/cli-auth/poll?token=${validToken}`)
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.status).toBe("complete")
      expect(data.apiKey).toBe("sk_live_test123")
    })

    it("creates new session when expired and returns pending", async () => {
      mockPollCliAuthSession.mockResolvedValueOnce({ status: "expired" })

      const res = await publicApp.handle(
        new Request(`http://localhost/api/public/cli-auth/poll?token=${validToken}`)
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.status).toBe("pending")
      expect(mockCreateCliAuthSession).toHaveBeenCalledWith(validToken)
    })

    it("returns pending even if session re-creation fails", async () => {
      mockPollCliAuthSession.mockResolvedValueOnce({ status: "expired" })
      mockCreateCliAuthSession.mockRejectedValueOnce(new Error("DB error"))

      const res = await publicApp.handle(
        new Request(`http://localhost/api/public/cli-auth/poll?token=${validToken}`)
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.status).toBe("pending")
    })

    it("returns 400 for short token", async () => {
      const res = await publicApp.handle(
        new Request("http://localhost/api/public/cli-auth/poll?token=short")
      )

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe("Invalid token")
    })

    it("returns 422 when token query param is missing", async () => {
      const res = await publicApp.handle(
        new Request("http://localhost/api/public/cli-auth/poll")
      )

      expect(res.status).toBe(422)
    })

    it("does not require authentication", async () => {
      mockPollCliAuthSession.mockResolvedValueOnce({ status: "pending" })

      const res = await publicApp.handle(
        new Request(`http://localhost/api/public/cli-auth/poll?token=${validToken}`)
      )

      expect(res.status).toBe(200)
    })
  })
})
