import { describe, expect, it, mock, beforeEach } from "bun:test"
import { Elysia } from "elysia"

const mockCheckHackathonOrganizer = mock(() =>
  Promise.resolve({ status: "ok", hackathon: { id: "h1" } })
)
const mockGetHackathonByIdForOrganizer = mock(() =>
  Promise.resolve({ id: "h1", status: "draft", registration_opens_at: null, registration_closes_at: null, starts_at: null, ends_at: null })
)
const mockUpdateHackathonSettings = mock(() =>
  Promise.resolve({
    id: "h1",
    name: "Test Hackathon",
    slug: "test-hackathon",
    description: null,
    rules: null,
    banner_url: null,
    status: "published",
    starts_at: null,
    ends_at: null,
    registration_opens_at: null,
    registration_closes_at: null,
    anonymous_judging: false,
    judging_mode: "points",
    location_type: null,
    location_name: null,
    location_url: null,
    location_latitude: null,
    location_longitude: null,
    require_location_verification: false,
    max_participants: null,
    min_team_size: 1,
    max_team_size: 5,
    allow_solo: true,
  })
)
const mockDeleteHackathon = mock(() => Promise.resolve(true))

mock.module("@/lib/services/public-hackathons", () => ({
  checkHackathonOrganizer: mockCheckHackathonOrganizer,
  getHackathonByIdForOrganizer: mockGetHackathonByIdForOrganizer,
  updateHackathonSettings: mockUpdateHackathonSettings,
  deleteHackathon: mockDeleteHackathon,
}))

const mockSendPendingJudgeInvitationEmails = mock(() => Promise.resolve({ sent: 2 }))

mock.module("@/lib/services/judge-invitations", () => ({
  sendPendingJudgeInvitationEmails: mockSendPendingJudgeInvitationEmails,
  createJudgeInvitation: mock(() => Promise.resolve({ success: true })),
  listJudgeInvitations: mock(() => Promise.resolve([])),
}))

const mockLogAudit = mock(() => Promise.resolve(null))
mock.module("@/lib/services/audit", () => ({
  logAudit: mockLogAudit,
}))

const mockTriggerWebhooks = mock(() => Promise.resolve())
mock.module("@/lib/services/webhooks", () => ({
  triggerWebhooks: mockTriggerWebhooks,
}))

const mockGetUser = mock(() =>
  Promise.resolve({ firstName: "Jane", lastName: "Doe" })
)
mock.module("@clerk/nextjs/server", () => ({
  auth: mock(() => Promise.resolve({ userId: null })),
  clerkClient: mock(() => Promise.resolve({ users: { getUser: mockGetUser } })),
}))

mock.module("@/lib/utils/timeline", () => ({
  validateTimelineDates: mock(() => null),
  getEffectiveStatus: mock((h: { status: string }) => h.status),
}))

mock.module("@/lib/utils/url", () => ({
  normalizeOptionalUrl: mock((url: string | undefined) => url),
  normalizeUrl: mock((url: string) => url),
}))

mock.module("@/lib/services/api-keys", () => ({
  createApiKey: mock(() => Promise.resolve(null)),
  listApiKeys: mock(() => Promise.resolve([])),
  revokeApiKey: mock(() => Promise.resolve(false)),
  getApiKeyById: mock(() => Promise.resolve(null)),
}))

mock.module("@/lib/services/jobs", () => ({
  listJobs: mock(() => Promise.resolve([])),
  getJobById: mock(() => Promise.resolve(null)),
}))

mock.module("@/lib/api/routes/dashboard-judging", () => ({
  dashboardJudgingRoutes: new Elysia(),
}))
mock.module("@/lib/api/routes/dashboard-prizes", () => ({
  dashboardPrizesRoutes: new Elysia(),
}))
mock.module("@/lib/api/routes/dashboard-results", () => ({
  dashboardResultsRoutes: new Elysia(),
}))
mock.module("@/lib/api/routes/dashboard-judge-display", () => ({
  dashboardJudgeDisplayRoutes: new Elysia(),
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

const { dashboardRoutes } = await import("@/lib/api/routes/dashboard")
const { handleRouteError } = await import("@/lib/api/routes/errors")

const app = new Elysia({ prefix: "/api" })
  .onError(({ error, set, path }) => handleRouteError(error, set, path))
  .use(dashboardRoutes)

const mockUserPrincipal = {
  kind: "user" as const,
  tenantId: "tenant-123",
  userId: "user-456",
  orgId: "org-789",
  orgRole: "org:admin",
  scopes: ["hackathons:read", "hackathons:write"],
}

function patchSettings(body: Record<string, unknown>) {
  return app.handle(
    new Request("http://localhost/api/dashboard/hackathons/h1/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  )
}

const mockHackathonResponse = {
  id: "h1",
  name: "Test Hackathon",
  slug: "test-hackathon",
  description: null,
  rules: null,
  banner_url: null,
  starts_at: null,
  ends_at: null,
  registration_opens_at: null,
  registration_closes_at: null,
  anonymous_judging: false,
  judging_mode: "points",
  location_type: null,
  location_name: null,
  location_url: null,
  location_latitude: null,
  location_longitude: null,
  require_location_verification: false,
  max_participants: null,
  min_team_size: 1,
  max_team_size: 5,
  allow_solo: true,
}

describe("PATCH /api/dashboard/hackathons/:id/settings - status change emails", () => {
  beforeEach(() => {
    mockResolvePrincipal.mockClear()
    mockGetHackathonByIdForOrganizer.mockClear()
    mockUpdateHackathonSettings.mockClear()
    mockSendPendingJudgeInvitationEmails.mockClear()
    mockLogAudit.mockClear()
    mockTriggerWebhooks.mockClear()
    mockGetUser.mockClear()

    mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)
  })

  it("sends pending invitation emails when transitioning from draft to published", async () => {
    mockGetHackathonByIdForOrganizer.mockResolvedValue({
      id: "h1", status: "draft",
      registration_opens_at: null, registration_closes_at: null, starts_at: null, ends_at: null,
    })
    mockUpdateHackathonSettings.mockResolvedValue({ ...mockHackathonResponse, status: "published" })

    const res = await patchSettings({ status: "published" })
    expect(res.status).toBe(200)

    await Promise.resolve()

    expect(mockSendPendingJudgeInvitationEmails).toHaveBeenCalledTimes(1)
    expect(mockSendPendingJudgeInvitationEmails).toHaveBeenCalledWith(
      "h1",
      "Test Hackathon",
      "Jane Doe"
    )
  })

  it("does not send pending invitation emails when status stays draft", async () => {
    mockGetHackathonByIdForOrganizer.mockResolvedValue({
      id: "h1", status: "draft",
      registration_opens_at: null, registration_closes_at: null, starts_at: null, ends_at: null,
    })
    mockUpdateHackathonSettings.mockResolvedValue({ ...mockHackathonResponse, status: "draft" })

    const res = await patchSettings({ status: "draft" })
    expect(res.status).toBe(200)

    await Promise.resolve()

    expect(mockSendPendingJudgeInvitationEmails).not.toHaveBeenCalled()
  })

  it("does not send pending invitation emails when previous status was not draft", async () => {
    mockGetHackathonByIdForOrganizer.mockResolvedValue({
      id: "h1", status: "published",
      registration_opens_at: null, registration_closes_at: null, starts_at: null, ends_at: null,
    })
    mockUpdateHackathonSettings.mockResolvedValue({ ...mockHackathonResponse, status: "active" })

    const res = await patchSettings({ status: "active" })
    expect(res.status).toBe(200)

    await Promise.resolve()

    expect(mockSendPendingJudgeInvitationEmails).not.toHaveBeenCalled()
  })

  it("does not send pending invitation emails for non-status updates", async () => {
    mockUpdateHackathonSettings.mockResolvedValue({ ...mockHackathonResponse, name: "Renamed Hackathon" })

    const res = await patchSettings({ name: "Renamed Hackathon" })
    expect(res.status).toBe(200)

    await Promise.resolve()

    expect(mockSendPendingJudgeInvitationEmails).not.toHaveBeenCalled()
  })

  it("does not send pending invitation emails when getHackathonByIdForOrganizer returns null", async () => {
    mockGetHackathonByIdForOrganizer.mockResolvedValue(null)
    mockUpdateHackathonSettings.mockResolvedValue({ ...mockHackathonResponse, status: "published" })

    const res = await patchSettings({ status: "published" })
    expect(res.status).toBe(200)

    await Promise.resolve()

    expect(mockSendPendingJudgeInvitationEmails).not.toHaveBeenCalled()
  })
})
