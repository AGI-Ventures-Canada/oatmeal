import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test"
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
    isComplete: false,
    notes: "",
    criteria: [{ id: "c2", name: "Execution", description: null, max_score: 1, weight: 0.5, currentScore: null }],
  },
  a3: {
    id: "a3",
    submissionId: "s3",
    submissionTitle: "Project Gamma",
    submissionDescription: "Desc C",
    submissionGithubUrl: null,
    submissionLiveAppUrl: null,
    submissionScreenshotUrl: null,
    teamName: null,
    isComplete: false,
    notes: "",
    criteria: [{ id: "c3", name: "Polish", description: null, max_score: 1, weight: 0.5, currentScore: null }],
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

const { FocusScoringView } = await import(
  "@/components/hackathon/judging/focus-scoring-view"
)

const baseAssignments = [
  { id: "a1", submissionTitle: "Project Alpha", teamName: "Team A", isComplete: false },
  { id: "a2", submissionTitle: "Project Beta", teamName: "Team B", isComplete: false },
  { id: "a3", submissionTitle: "Project Gamma", teamName: null, isComplete: false },
]

describe("FocusScoringView", () => {
  const onScoreSubmitted = mock(() => {})

  beforeEach(() => {
    onScoreSubmitted.mockClear()
    mockFetch.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it("renders current assignment title and team name", () => {
    render(
      <FocusScoringView
        hackathonSlug="test-hack"
        assignments={baseAssignments}
        initialCompletedIds={new Set()}
        onScoreSubmitted={onScoreSubmitted}
      />
    )
    expect(screen.getByText("Project Alpha")).toBeDefined()
    expect(screen.getByText("Team A")).toBeDefined()
  })

  it("shows position counter", () => {
    render(
      <FocusScoringView
        hackathonSlug="test-hack"
        assignments={baseAssignments}
        initialCompletedIds={new Set()}
        onScoreSubmitted={onScoreSubmitted}
      />
    )
    expect(screen.getByText("1 of 3")).toBeDefined()
  })

  it("shows scored count", () => {
    render(
      <FocusScoringView
        hackathonSlug="test-hack"
        assignments={baseAssignments}
        initialCompletedIds={new Set(["a1"])}
        onScoreSubmitted={onScoreSubmitted}
      />
    )
    expect(screen.getByText("1/3 scored")).toBeDefined()
  })

  it("disables prev button at first assignment", () => {
    render(
      <FocusScoringView
        hackathonSlug="test-hack"
        assignments={baseAssignments}
        initialCompletedIds={new Set()}
        onScoreSubmitted={onScoreSubmitted}
      />
    )
    const buttons = screen.getAllByRole("button")
    const prevButton = buttons[0]
    expect(prevButton.hasAttribute("disabled")).toBe(true)
  })

  it("enables next button when not at last assignment", () => {
    render(
      <FocusScoringView
        hackathonSlug="test-hack"
        assignments={baseAssignments}
        initialCompletedIds={new Set()}
        onScoreSubmitted={onScoreSubmitted}
      />
    )
    const buttons = screen.getAllByRole("button")
    const nextButton = buttons[1]
    expect(nextButton.hasAttribute("disabled")).toBe(false)
  })

  it("shows Pending badge for unscored assignment", () => {
    render(
      <FocusScoringView
        hackathonSlug="test-hack"
        assignments={baseAssignments}
        initialCompletedIds={new Set()}
        onScoreSubmitted={onScoreSubmitted}
      />
    )
    expect(screen.getByText("Pending")).toBeDefined()
  })

  it("shows Scored badge when navigating to scored assignment", () => {
    render(
      <FocusScoringView
        hackathonSlug="test-hack"
        assignments={baseAssignments}
        initialCompletedIds={new Set(["a2"])}
        onScoreSubmitted={onScoreSubmitted}
      />
    )
    const nextButton = screen.getAllByRole("button")[1]
    fireEvent.click(nextButton)
    expect(screen.getByText("Scored")).toBeDefined()
    expect(screen.getByText("Project Beta")).toBeDefined()
  })

  it("starts at first unscored assignment", () => {
    render(
      <FocusScoringView
        hackathonSlug="test-hack"
        assignments={baseAssignments}
        initialCompletedIds={new Set(["a1"])}
        onScoreSubmitted={onScoreSubmitted}
      />
    )
    expect(screen.getByText("Project Beta")).toBeDefined()
    expect(screen.getByText("2 of 3")).toBeDefined()
  })

  it("shows completion state when all scored", () => {
    render(
      <FocusScoringView
        hackathonSlug="test-hack"
        assignments={baseAssignments}
        initialCompletedIds={new Set(["a1", "a2", "a3"])}
        onScoreSubmitted={onScoreSubmitted}
      />
    )
    expect(screen.getByText("All done!")).toBeDefined()
    expect(screen.getByText("You've scored all 3 assignments.")).toBeDefined()
  })

  it("renders the scoring panel skip button", async () => {
    render(
      <FocusScoringView
        hackathonSlug="test-hack"
        assignments={baseAssignments}
        initialCompletedIds={new Set()}
        onScoreSubmitted={onScoreSubmitted}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Skip" })).toBeDefined()
    })
  })

  it("renders the scoring panel content for the current assignment", async () => {
    render(
      <FocusScoringView
        hackathonSlug="test-hack"
        assignments={baseAssignments}
        initialCompletedIds={new Set()}
        onScoreSubmitted={onScoreSubmitted}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("Pass / Fail")).toBeDefined()
    })
  })

  it("handles assignment with no team name", () => {
    render(
      <FocusScoringView
        hackathonSlug="test-hack"
        assignments={baseAssignments}
        initialCompletedIds={new Set(["a1", "a2"])}
        onScoreSubmitted={onScoreSubmitted}
      />
    )
    expect(screen.getByText("Project Gamma")).toBeDefined()
    expect(screen.queryByText("Team")).toBeNull()
  })
})
