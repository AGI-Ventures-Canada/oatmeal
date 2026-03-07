import { describe, expect, it, mock, beforeEach } from "bun:test"

const mockAuth = mock(() => Promise.resolve({ userId: null }))

mock.module("@clerk/nextjs/server", () => ({
  auth: mockAuth,
  clerkClient: mock(() => Promise.resolve({
    organizations: {
      getOrganization: mock(() => Promise.resolve({ name: "Test Org" })),
    },
  })),
}))

const mockGetPublicHackathon = mock(() => Promise.resolve(null))

mock.module("@/lib/services/public-hackathons", () => ({
  getPublicHackathon: mockGetPublicHackathon,
  getPublicHackathonById: mock(() => Promise.resolve(null)),
  listPublicHackathons: mock(() => Promise.resolve({ hackathons: [], total: 0 })),
  getHackathonByIdForOrganizer: mock(() => Promise.resolve(null)),
  checkHackathonOrganizer: mock(() => Promise.resolve({ status: "not_found" })),
  getHackathonByIdWithFullData: mock(() => Promise.resolve(null)),
  getHackathonByIdWithAccess: mock(() => Promise.resolve(null)),
  updateHackathonSettings: mock(() => Promise.resolve(null)),
}))

mock.module("@/lib/services/hackathons", () => ({
  registerForHackathon: mock(() => Promise.resolve({ success: true })),
  getParticipantCount: mock(() => Promise.resolve(0)),
  isUserRegistered: mock(() => Promise.resolve(false)),
  getRegistrationInfo: mock(() => Promise.resolve({ participantRole: null })),
}))

mock.module("@/lib/services/tenant-profiles", () => ({
  getPublicTenantWithEvents: mock(() => Promise.resolve(null)),
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

const mockSubmitScores = mock(() => Promise.resolve({ success: true }))

mock.module("@/lib/services/judging", () => ({
  addJudge: mock(() => Promise.resolve({ success: true })),
  listJudgingCriteria: mock(() => Promise.resolve([])),
  createJudgingCriteria: mock(() => Promise.resolve(null)),
  updateJudgingCriteria: mock(() => Promise.resolve(null)),
  deleteJudgingCriteria: mock(() => Promise.resolve(false)),
  listJudges: mock(() => Promise.resolve([])),
  removeJudge: mock(() => Promise.resolve({ success: false })),
  listJudgeAssignments: mock(() => Promise.resolve([])),
  assignJudgeToSubmission: mock(() => Promise.resolve({ success: false })),
  removeJudgeAssignment: mock(() => Promise.resolve(false)),
  autoAssignJudges: mock(() => Promise.resolve({ assignedCount: 0 })),
  getJudgingProgress: mock(() => Promise.resolve({ totalAssignments: 0, completedAssignments: 0, judges: [] })),
  getJudgeAssignments: mock(() => Promise.resolve([])),
  getAssignmentDetail: mock(() => Promise.resolve(null)),
  submitScores: mockSubmitScores,
  saveNotes: mock(() => Promise.resolve(true)),
  getJudgingSetupStatus: mock(() => Promise.resolve({ judgeCount: 0, hasUnassignedSubmissions: false })),
}))

mock.module("@/lib/utils/sort-hackathons", () => ({
  sortByStatusPriority: mock((arr: unknown[]) => arr),
}))

const { Elysia } = await import("elysia")
const { publicRoutes } = await import("@/lib/api/routes/public")

const app = new Elysia({ prefix: "/api" }).use(publicRoutes)

const mockHackathon = {
  id: "h1",
  name: "Test Hackathon",
  slug: "test-hackathon",
  status: "judging",
  anonymous_judging: false,
  organizer: { id: "t1", name: "Test Org", slug: "test-org", clerk_org_id: "org_123", logo_url: null },
  sponsors: [],
}

const scorePayload = {
  scores: [{ criteriaId: "c1", score: 8 }],
  notes: "Good work",
}

describe("POST /api/public/hackathons/:slug/judging/assignments/:assignmentId/scores", () => {
  beforeEach(() => {
    mockAuth.mockReset()
    mockGetPublicHackathon.mockReset()
    mockSubmitScores.mockReset()
    mockSubmitScores.mockImplementation(() => Promise.resolve({ success: true }))
  })

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const res = await app.handle(
      new Request("http://localhost/api/public/hackathons/test-hackathon/judging/assignments/a1/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scorePayload),
      })
    )
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data.code).toBe("not_authenticated")
  })

  it("returns 404 when hackathon not found", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" })
    mockGetPublicHackathon.mockResolvedValue(null)

    const res = await app.handle(
      new Request("http://localhost/api/public/hackathons/nonexistent/judging/assignments/a1/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scorePayload),
      })
    )

    expect(res.status).toBe(404)
  })

  it("returns 400 when hackathon is in completed status", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" })
    mockGetPublicHackathon.mockResolvedValue({ ...mockHackathon, status: "completed" })

    const res = await app.handle(
      new Request("http://localhost/api/public/hackathons/test-hackathon/judging/assignments/a1/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scorePayload),
      })
    )
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.code).toBe("not_judging")
  })

  it("returns 400 when hackathon is in draft status", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" })
    mockGetPublicHackathon.mockResolvedValue({ ...mockHackathon, status: "draft" })

    const res = await app.handle(
      new Request("http://localhost/api/public/hackathons/test-hackathon/judging/assignments/a1/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scorePayload),
      })
    )
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.code).toBe("not_judging")
  })

  it("returns 400 when hackathon is in archived status", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" })
    mockGetPublicHackathon.mockResolvedValue({ ...mockHackathon, status: "archived" })

    const res = await app.handle(
      new Request("http://localhost/api/public/hackathons/test-hackathon/judging/assignments/a1/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scorePayload),
      })
    )
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.code).toBe("not_judging")
  })

  it("submits scores when hackathon is in judging status", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" })
    mockGetPublicHackathon.mockResolvedValue({ ...mockHackathon, status: "judging" })

    const res = await app.handle(
      new Request("http://localhost/api/public/hackathons/test-hackathon/judging/assignments/a1/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scorePayload),
      })
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockSubmitScores).toHaveBeenCalledWith("a1", "user_123", {
      scores: scorePayload.scores,
      notes: scorePayload.notes,
    })
  })

  it("submits scores when hackathon is in active status", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" })
    mockGetPublicHackathon.mockResolvedValue({ ...mockHackathon, status: "active" })

    const res = await app.handle(
      new Request("http://localhost/api/public/hackathons/test-hackathon/judging/assignments/a1/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scorePayload),
      })
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockSubmitScores).toHaveBeenCalledWith("a1", "user_123", {
      scores: scorePayload.scores,
      notes: scorePayload.notes,
    })
  })

  it("submits scores when hackathon is in published status", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" })
    mockGetPublicHackathon.mockResolvedValue({ ...mockHackathon, status: "published" })

    const res = await app.handle(
      new Request("http://localhost/api/public/hackathons/test-hackathon/judging/assignments/a1/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scorePayload),
      })
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it("submits scores when hackathon is in registration_open status", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" })
    mockGetPublicHackathon.mockResolvedValue({ ...mockHackathon, status: "registration_open" })

    const res = await app.handle(
      new Request("http://localhost/api/public/hackathons/test-hackathon/judging/assignments/a1/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scorePayload),
      })
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it("returns 400 when score submission fails", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" })
    mockGetPublicHackathon.mockResolvedValue({ ...mockHackathon, status: "judging" })
    mockSubmitScores.mockResolvedValue({ success: false, error: "Assignment not found", code: "not_found" })

    const res = await app.handle(
      new Request("http://localhost/api/public/hackathons/test-hackathon/judging/assignments/a1/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scorePayload),
      })
    )
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.code).toBe("not_found")
  })
})
