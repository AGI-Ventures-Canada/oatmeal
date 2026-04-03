import { describe, expect, it, mock, beforeEach } from "bun:test"

const mockListJudges = mock(() => Promise.resolve([]))
const mockListJudgeAssignments = mock(() => Promise.resolve([]))
const mockListJudgeInvitations = mock(() => Promise.resolve([]))

mock.module("@/lib/services/judging", () => ({
  listJudges: mockListJudges,
  listJudgeAssignments: mockListJudgeAssignments,
  getJudgingProgress: mock(() => Promise.resolve({})),
  listJudgingCriteria: mock(() => Promise.resolve([])),
  getJudgingSetupStatus: mock(() => Promise.resolve({})),
}))

mock.module("@/lib/services/judge-invitations", () => ({
  listJudgeInvitations: mockListJudgeInvitations,
}))

const mockListPrizeAssignments = mock(() => Promise.resolve([]))
const mockGetResults = mock(() => Promise.resolve([]))

mock.module("@/lib/services/prizes", () => ({
  listPrizes: mock(() => Promise.resolve([])),
  listPrizeAssignments: mockListPrizeAssignments,
}))

mock.module("@/lib/services/results", () => ({
  getResults: mockGetResults,
}))

mock.module("@/components/hackathon/judging/criteria-config", () => ({
  CriteriaConfig: () => null,
}))
mock.module("@/components/hackathon/judging/judging-mode-toggle", () => ({
  JudgingModeToggle: () => null,
}))
mock.module("@/components/hackathon/judging/judge-assignments", () => ({
  JudgeAssignments: () => null,
}))
mock.module("@/components/hackathon/judging/scoring-progress", () => ({
  ScoringProgress: () => null,
}))
mock.module("@/components/hackathon/prizes/prizes-manager", () => ({
  PrizesManager: () => null,
}))
mock.module("@/components/hackathon/results/results-dashboard", () => ({
  ResultsDashboard: () => null,
}))
mock.module("@/components/ui/tabs", () => ({
  Tabs: () => null,
  TabsList: () => null,
  TabsTrigger: () => null,
  TabsContent: () => null,
}))

const { JudgesTabContent } = await import(
  "@/app/(public)/e/[slug]/manage/_judges-tab"
)
const { PrizesTabContent } = await import(
  "@/app/(public)/e/[slug]/manage/_prizes-tab"
)

type ReactEl = { type: unknown; props: Record<string, unknown> }

function findByPropKey(tree: unknown, key: string): Record<string, unknown> | null {
  if (!tree || typeof tree !== "object") return null
  const el = tree as ReactEl
  if (el.props && key in el.props) return el.props
  const children = el.props?.children
  if (!children) return null
  const list = Array.isArray(children) ? children : [children]
  for (const child of list) {
    const found = findByPropKey(child, key)
    if (found) return found
  }
  return null
}

const baseJudgesProps = {
  hackathonId: "h1",
  activeJtab: "criteria",
  criteria: [],
  submissions: [],
  judgingMode: "points" as const,
  anonymousJudging: false,
  judgingProgress: { totalAssignments: 0, completedAssignments: 0 },
}

const basePrizesProps = {
  hackathonId: "h1",
  activePtab: "prizes",
  prizes: [],
  submissions: [],
  resultsPublishedAt: null,
  incompleteAssignments: 0,
}

describe("JudgesTabContent", () => {
  beforeEach(() => {
    mockListJudges.mockClear()
    mockListJudgeAssignments.mockClear()
    mockListJudgeInvitations.mockClear()
  })

  it("fetches judges, assignments, and invitations for the given hackathonId", async () => {
    await JudgesTabContent(baseJudgesProps)
    expect(mockListJudges).toHaveBeenCalledWith("h1")
    expect(mockListJudgeAssignments).toHaveBeenCalledWith("h1")
    expect(mockListJudgeInvitations).toHaveBeenCalledWith("h1", "pending")
  })

  it("maps judge_participant_id to judgeParticipantId and is_complete to isComplete", async () => {
    mockListJudgeAssignments.mockResolvedValueOnce([
      {
        id: "a1",
        judge_participant_id: "p1",
        judgeName: "Alice",
        judgeEmail: "alice@example.com",
        submission_id: "s1",
        submissionTitle: "Project X",
        is_complete: true,
        assigned_at: "2026-01-01T00:00:00Z",
      },
    ])

    const tree = await JudgesTabContent(baseJudgesProps)
    const jaProps = findByPropKey(tree, "initialAssignments")
    const assignments = jaProps?.initialAssignments as Array<Record<string, unknown>>

    expect(assignments).toHaveLength(1)
    expect(assignments[0].judgeParticipantId).toBe("p1")
    expect(assignments[0].submissionId).toBe("s1")
    expect(assignments[0].isComplete).toBe(true)
  })

  it("maps invitation expires_at to expiresAt", async () => {
    mockListJudgeInvitations.mockResolvedValueOnce([
      {
        id: "inv1",
        email: "judge@example.com",
        status: "pending",
        expires_at: "2026-06-01T00:00:00Z",
        created_at: "2026-01-01T00:00:00Z",
      },
    ])

    const tree = await JudgesTabContent(baseJudgesProps)
    const jaProps = findByPropKey(tree, "initialInvitations")
    const invitations = jaProps?.initialInvitations as Array<Record<string, unknown>>

    expect(invitations[0].expiresAt).toBe("2026-06-01T00:00:00Z")
  })

  it("passes anonymousJudging through to JudgeAssignments", async () => {
    const tree = await JudgesTabContent({ ...baseJudgesProps, anonymousJudging: true })
    const jaProps = findByPropKey(tree, "anonymousJudging")
    expect(jaProps?.anonymousJudging).toBe(true)
  })
})

describe("PrizesTabContent", () => {
  beforeEach(() => {
    mockListPrizeAssignments.mockClear()
    mockGetResults.mockClear()
  })

  it("fetches prize assignments and results for the given hackathonId", async () => {
    await PrizesTabContent(basePrizesProps)
    expect(mockListPrizeAssignments).toHaveBeenCalledWith("h1")
    expect(mockGetResults).toHaveBeenCalledWith("h1")
  })

  it("maps prize_id to prizeId and submission_id to submissionId", async () => {
    mockListPrizeAssignments.mockResolvedValueOnce([
      {
        id: "pa1",
        prize_id: "prize1",
        prizeName: "Grand Prize",
        submission_id: "sub1",
        submissionTitle: "Best Project",
        teamName: "Team A",
        assigned_at: "2026-01-01T00:00:00Z",
      },
    ])

    const tree = await PrizesTabContent(basePrizesProps)
    const pmProps = findByPropKey(tree, "initialAssignments")
    const assignments = pmProps?.initialAssignments as Array<Record<string, unknown>>

    expect(assignments[0].prizeId).toBe("prize1")
    expect(assignments[0].submissionId).toBe("sub1")
  })

  it("maps result DB fields to camelCase prop names", async () => {
    mockGetResults.mockResolvedValueOnce([
      {
        id: "r1",
        rank: 1,
        submission_id: "s1",
        submissionTitle: "Winner",
        teamName: "Team A",
        total_score: 95.5,
        weighted_score: 90.0,
        judge_count: 3,
        published_at: "2026-03-01T00:00:00Z",
        prizes: [],
      },
    ])

    const tree = await PrizesTabContent(basePrizesProps)
    const rdProps = findByPropKey(tree, "initialResults")
    const results = rdProps?.initialResults as Array<Record<string, unknown>>

    expect(results[0].submissionId).toBe("s1")
    expect(results[0].totalScore).toBe(95.5)
    expect(results[0].weightedScore).toBe(90.0)
    expect(results[0].judgeCount).toBe(3)
    expect(results[0].publishedAt).toBe("2026-03-01T00:00:00Z")
  })

  it("sets isPublished=false when resultsPublishedAt is null", async () => {
    const tree = await PrizesTabContent({ ...basePrizesProps, resultsPublishedAt: null })
    const rdProps = findByPropKey(tree, "isPublished")
    expect(rdProps?.isPublished).toBe(false)
  })

  it("sets isPublished=true when resultsPublishedAt has a value", async () => {
    const tree = await PrizesTabContent({
      ...basePrizesProps,
      resultsPublishedAt: "2026-03-01T00:00:00Z",
    })
    const rdProps = findByPropKey(tree, "isPublished")
    expect(rdProps?.isPublished).toBe(true)
  })

  it("passes incompleteAssignments through to ResultsDashboard", async () => {
    const tree = await PrizesTabContent({ ...basePrizesProps, incompleteAssignments: 7 })
    const rdProps = findByPropKey(tree, "incompleteAssignments")
    expect(rdProps?.incompleteAssignments).toBe(7)
  })
})
