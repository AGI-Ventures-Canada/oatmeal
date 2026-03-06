import { describe, expect, it, mock, afterEach, beforeEach } from "bun:test"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"

mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: mock(() => {}),
    refresh: mock(() => {}),
    replace: mock(() => {}),
    prefetch: mock(() => {}),
  }),
  usePathname: () => "/e/test-hack/judge",
}))

const assignmentDetails = {
  a1: {
    id: "a1",
    submissionId: "s1",
    submissionTitle: "Project Alpha",
    submissionDescription: "Desc A",
    submissionGithubUrl: null,
    submissionLiveAppUrl: null,
    submissionScreenshotUrl: null,
    teamName: "Team A",
    isComplete: false,
    notes: "",
    criteria: [{ id: "c1", name: "Innovation", description: null, max_score: 1, weight: 0.5, currentScore: null }],
  },
  a2: {
    id: "a2",
    submissionId: "s2",
    submissionTitle: "Project Beta",
    submissionDescription: "Desc B",
    submissionGithubUrl: null,
    submissionLiveAppUrl: null,
    submissionScreenshotUrl: null,
    teamName: "Team B",
    isComplete: true,
    notes: "Good work",
    criteria: [{ id: "c2", name: "Execution", description: null, max_score: 1, weight: 0.5, currentScore: 1 }],
  },
} satisfies Record<string, unknown>

const mockFetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input)
  const assignmentId = url.match(/assignments\/([^/]+)/)?.[1]

  if (assignmentId && !init?.method) {
    return Promise.resolve({
      ok: true,
      json: async () => assignmentDetails[assignmentId as keyof typeof assignmentDetails],
    })
  }

  if (url.endsWith("/scores") && init?.method === "POST") {
    return Promise.resolve({
      ok: true,
      json: async () => ({ success: true }),
    })
  }

  if (url.endsWith("/notes") && init?.method === "PATCH") {
    return Promise.resolve({
      ok: true,
      json: async () => ({ success: true }),
    })
  }

  return Promise.resolve({
    ok: true,
    json: async () => ({}),
  })
})

globalThis.fetch = mockFetch as unknown as typeof fetch

const { JudgeAssignmentsCard } = await import(
  "@/components/hackathon/judging/judge-assignments-card"
)

const baseAssignments = [
  {
    id: "a1",
    submissionId: "s1",
    submissionTitle: "Project Alpha",
    submissionDescription: "Desc A",
    submissionGithubUrl: null,
    submissionLiveAppUrl: null,
    submissionScreenshotUrl: null,
    teamName: "Team A",
    isComplete: false,
    notes: "",
  },
  {
    id: "a2",
    submissionId: "s2",
    submissionTitle: "Project Beta",
    submissionDescription: "Desc B",
    submissionGithubUrl: null,
    submissionLiveAppUrl: null,
    submissionScreenshotUrl: null,
    teamName: "Team B",
    isComplete: true,
    notes: "Good work",
  },
]

describe("JudgeAssignmentsCard", () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it("renders nothing when no assignments", () => {
    const { container } = render(
      <JudgeAssignmentsCard
        hackathonSlug="test-hack"
        assignments={[]}
      />
    )
    expect(container.innerHTML).toBe("")
  })

  it("renders card title", () => {
    render(
      <JudgeAssignmentsCard
        hackathonSlug="test-hack"
        assignments={baseAssignments}
      />
    )
    expect(screen.getByText("Your Judging Assignments")).toBeDefined()
  })

  it("renders scored count badge", () => {
    render(
      <JudgeAssignmentsCard
        hackathonSlug="test-hack"
        assignments={baseAssignments}
      />
    )
    const matches = screen.getAllByText((text) => text.includes("1") && text.includes("2") && text.includes("scored"))
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it("renders Focus and List toggle buttons", () => {
    render(
      <JudgeAssignmentsCard
        hackathonSlug="test-hack"
        assignments={baseAssignments}
      />
    )
    expect(screen.getByText("Focus")).toBeDefined()
    expect(screen.getByText("List")).toBeDefined()
  })

  it("defaults to Focus view with assignment content", () => {
    render(
      <JudgeAssignmentsCard
        hackathonSlug="test-hack"
        assignments={baseAssignments}
      />
    )
    expect(screen.getByText("1 of 2")).toBeDefined()
  })

  it("switches to List view when List button clicked", () => {
    render(
      <JudgeAssignmentsCard
        hackathonSlug="test-hack"
        assignments={baseAssignments}
      />
    )
    fireEvent.click(screen.getByText("List"))
    expect(screen.getByText("Project Alpha")).toBeDefined()
    expect(screen.getByText("Project Beta")).toBeDefined()
  })

  it("shows assignment status badges in list view", () => {
    render(
      <JudgeAssignmentsCard
        hackathonSlug="test-hack"
        assignments={baseAssignments}
      />
    )
    fireEvent.click(screen.getByText("List"))
    expect(screen.getByText("Pending")).toBeDefined()
    expect(screen.getByText("Scored")).toBeDefined()
  })

  it("switches back to Focus view", () => {
    render(
      <JudgeAssignmentsCard
        hackathonSlug="test-hack"
        assignments={baseAssignments}
      />
    )
    fireEvent.click(screen.getByText("List"))
    fireEvent.click(screen.getByText("Focus"))
    expect(screen.getByText("1 of 2")).toBeDefined()
  })

  it("renders scoring content when the list item is expanded", async () => {
    render(
      <JudgeAssignmentsCard
        hackathonSlug="test-hack"
        assignments={baseAssignments}
      />
    )

    fireEvent.click(screen.getByText("List"))
    fireEvent.click(screen.getByText("Project Alpha"))

    await waitFor(() => {
      expect(screen.getByText("Pass / Fail")).toBeDefined()
    })
  })
})
