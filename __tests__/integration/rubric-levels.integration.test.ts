import { describe, expect, it, mock, beforeEach } from "bun:test"

const mockCheckHackathonOrganizer = mock(() =>
  Promise.resolve({
    status: "authorized" as const,
    hackathon: { id: "h1", organizer: { clerk_org_id: "org_1" } },
  })
)

mock.module("@/lib/services/public-hackathons", () => ({
  checkHackathonOrganizer: mockCheckHackathonOrganizer,
}))

const mockListRubricLevels = mock(() => Promise.resolve([]))
const mockCreateRubricLevel = mock(() => Promise.resolve(null))
const mockUpdateRubricLevel = mock(() => Promise.resolve(null))
const mockDeleteRubricLevel = mock(() =>
  Promise.resolve({ success: false, error: "Failed", levels: [] })
)

mock.module("@/lib/services/rubric-levels", () => ({
  listRubricLevels: mockListRubricLevels,
  createRubricLevel: mockCreateRubricLevel,
  updateRubricLevel: mockUpdateRubricLevel,
  deleteRubricLevel: mockDeleteRubricLevel,
  createDefaultRubricLevels: mock(() => Promise.resolve([])),
}))

mock.module("@/lib/services/judging", () => ({
  listJudgingCriteria: mock(() => Promise.resolve([])),
  createJudgingCriteria: mock(() => Promise.resolve(null)),
  updateJudgingCriteria: mock(() => Promise.resolve(null)),
  deleteJudgingCriteria: mock(() => Promise.resolve(false)),
  listJudges: mock(() => Promise.resolve([])),
  addJudge: mock(() => Promise.resolve({ success: false })),
  removeJudge: mock(() => Promise.resolve({ success: false })),
  listJudgeAssignments: mock(() => Promise.resolve([])),
  assignJudgeToSubmission: mock(() => Promise.resolve({ success: false, error: "", code: "" })),
  removeJudgeAssignment: mock(() => Promise.resolve(false)),
  autoAssignJudges: mock(() => Promise.resolve({ assignedCount: 0 })),
  getJudgingProgress: mock(() => Promise.resolve({ totalAssignments: 0, completedAssignments: 0, judges: [] })),
  getJudgeAssignments: mock(() => Promise.resolve([])),
  getAssignmentDetail: mock(() => Promise.resolve(null)),
  submitScores: mock(() => Promise.resolve({ success: false, error: "", code: "" })),
  saveNotes: mock(() => Promise.resolve(false)),
  getJudgingSetupStatus: mock(() => Promise.resolve({ hasCriteria: false, allCriteriaHaveLevels: true, judgeCount: 0, hasSubmissions: false, hasUnassignedSubmissions: false, isReady: false })),
}))

mock.module("@/lib/services/judge-invitations", () => ({
  createJudgeInvitation: mock(() => Promise.resolve({ success: false })),
  listJudgeInvitations: mock(() => Promise.resolve([])),
  cancelJudgeInvitation: mock(() => Promise.resolve({ success: false })),
}))

mock.module("@/lib/email/judge-invitations", () => ({
  sendJudgeAddedNotification: mock(() => Promise.resolve({ success: true })),
  sendJudgeInvitationEmail: mock(() => Promise.resolve({ success: true })),
}))

const mockLogAudit = mock(() => Promise.resolve(null))
mock.module("@/lib/services/audit", () => ({
  logAudit: mockLogAudit,
}))

mock.module("@clerk/nextjs/server", () => ({
  auth: mock(() => Promise.resolve({ userId: null })),
  clerkClient: mock(() => Promise.resolve({
    organizations: { getOrganization: mock(() => Promise.resolve({ name: "Test Org" })) },
    users: { getUser: mock(() => Promise.resolve(null)), getUserList: mock(() => Promise.resolve({ data: [] })) },
  })),
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

const { Elysia } = await import("elysia")
const { dashboardJudgingRoutes } = await import("@/lib/api/routes/dashboard-judging")

const app = new Elysia({ prefix: "/api/dashboard" }).use(dashboardJudgingRoutes)

const mockUserPrincipal = {
  kind: "user" as const,
  userId: "user_1",
  tenantId: "org_1",
  scopes: ["hackathons:read", "hackathons:write"],
}

const BASE = "http://localhost/api/dashboard"
const LEVELS_URL = `${BASE}/hackathons/h1/judging/criteria/c1/levels`
const LEVEL_URL = `${LEVELS_URL}/lv1`

function makeRequest(url: string, init?: RequestInit) {
  return new Request(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  })
}

describe("Rubric Levels API", () => {
  beforeEach(() => {
    mockResolvePrincipal.mockReset()
    mockListRubricLevels.mockReset()
    mockCreateRubricLevel.mockReset()
    mockUpdateRubricLevel.mockReset()
    mockDeleteRubricLevel.mockReset()
    mockCheckHackathonOrganizer.mockReset()
    mockLogAudit.mockReset()

    mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)
    mockCheckHackathonOrganizer.mockResolvedValue({
      status: "authorized" as const,
      hackathon: { id: "h1", organizer: { clerk_org_id: "org_1" } },
    })
  })

  describe("GET /levels", () => {
    it("rejects unauthenticated requests", async () => {
      mockResolvePrincipal.mockResolvedValue({ kind: "anon" })

      const res = await app.handle(makeRequest(LEVELS_URL))
      expect(res.ok).toBe(false)
    })

    it("returns 404 when hackathon not found", async () => {
      mockCheckHackathonOrganizer.mockResolvedValue({ status: "not_found" as const })

      const res = await app.handle(makeRequest(LEVELS_URL))
      expect(res.status).toBe(404)
    })

    it("returns 403 when not organizer", async () => {
      mockCheckHackathonOrganizer.mockResolvedValue({ status: "not_authorized" as const })

      const res = await app.handle(makeRequest(LEVELS_URL))
      expect(res.status).toBe(403)
    })

    it("returns levels on success", async () => {
      const mockLevels = [
        { id: "lv1", criteria_id: "c1", level_number: 1, label: "Poor", description: null },
        { id: "lv2", criteria_id: "c1", level_number: 2, label: "Good", description: "Solid work" },
      ]
      mockListRubricLevels.mockResolvedValue(mockLevels)

      const res = await app.handle(makeRequest(LEVELS_URL))
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.levels).toHaveLength(2)
      expect(data.levels[0].label).toBe("Poor")
    })
  })

  describe("POST /levels", () => {
    it("rejects unauthenticated requests", async () => {
      mockResolvePrincipal.mockResolvedValue({ kind: "anon" })

      const res = await app.handle(
        makeRequest(LEVELS_URL, {
          method: "POST",
          body: JSON.stringify({ label: "Excellent" }),
        })
      )
      expect(res.ok).toBe(false)
    })

    it("returns 422 when label is empty", async () => {
      const res = await app.handle(
        makeRequest(LEVELS_URL, {
          method: "POST",
          body: JSON.stringify({ label: "" }),
        })
      )
      expect(res.status).toBe(422)
    })

    it("returns 500 when creation fails", async () => {
      mockCreateRubricLevel.mockResolvedValue(null)

      const res = await app.handle(
        makeRequest(LEVELS_URL, {
          method: "POST",
          body: JSON.stringify({ label: "Excellent" }),
        })
      )
      expect(res.status).toBe(500)
    })

    it("creates level on success", async () => {
      const created = { id: "lv-new", criteria_id: "c1", level_number: 3, label: "Excellent", description: null }
      mockCreateRubricLevel.mockResolvedValue(created)

      const res = await app.handle(
        makeRequest(LEVELS_URL, {
          method: "POST",
          body: JSON.stringify({ label: "Excellent", description: "Outstanding work" }),
        })
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.level.label).toBe("Excellent")
    })
  })

  describe("PATCH /levels/:levelId", () => {
    it("rejects unauthenticated requests", async () => {
      mockResolvePrincipal.mockResolvedValue({ kind: "anon" })

      const res = await app.handle(
        makeRequest(LEVEL_URL, {
          method: "PATCH",
          body: JSON.stringify({ label: "Updated" }),
        })
      )
      expect(res.ok).toBe(false)
    })

    it("returns 404 when level not found", async () => {
      mockUpdateRubricLevel.mockResolvedValue(null)

      const res = await app.handle(
        makeRequest(LEVEL_URL, {
          method: "PATCH",
          body: JSON.stringify({ label: "Updated" }),
        })
      )
      expect(res.status).toBe(404)
    })

    it("updates level on success", async () => {
      const updated = { id: "lv1", criteria_id: "c1", level_number: 1, label: "Updated", description: null }
      mockUpdateRubricLevel.mockResolvedValue(updated)

      const res = await app.handle(
        makeRequest(LEVEL_URL, {
          method: "PATCH",
          body: JSON.stringify({ label: "Updated" }),
        })
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.level.label).toBe("Updated")
    })
  })

  describe("DELETE /levels/:levelId", () => {
    it("rejects unauthenticated requests", async () => {
      mockResolvePrincipal.mockResolvedValue({ kind: "anon" })

      const res = await app.handle(makeRequest(LEVEL_URL, { method: "DELETE" }))
      expect(res.ok).toBe(false)
    })

    it("returns 400 when delete fails (minimum levels)", async () => {
      mockDeleteRubricLevel.mockResolvedValue({ success: false, error: "Minimum 2 levels required", levels: [] })

      const res = await app.handle(makeRequest(LEVEL_URL, { method: "DELETE" }))
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toContain("Minimum")
    })

    it("deletes level on success", async () => {
      const remaining = [
        { id: "lv2", criteria_id: "c1", level_number: 1, label: "Good", description: null },
        { id: "lv3", criteria_id: "c1", level_number: 2, label: "Great", description: null },
      ]
      mockDeleteRubricLevel.mockResolvedValue({ success: true, levels: remaining })

      const res = await app.handle(makeRequest(LEVEL_URL, { method: "DELETE" }))
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.levels).toHaveLength(2)
    })
  })
})
