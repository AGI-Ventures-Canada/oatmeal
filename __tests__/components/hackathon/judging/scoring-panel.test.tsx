import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

const mockFetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input)

  if (url.endsWith("/judging/assignments/a1") && !init?.method) {
    return Promise.resolve({
      ok: true,
      json: async () => ({
        id: "a1",
        submissionId: "s1",
        submissionTitle: "Project Alpha",
        submissionDescription: "A polished project",
        submissionGithubUrl: null,
        submissionLiveAppUrl: null,
        submissionScreenshotUrl: null,
        teamName: "Team Alpha",
        isComplete: false,
        notes: "",
        criteria: [
          {
            id: "c1",
            name: "Innovation",
            description: null,
            max_score: 1,
            weight: 0.6,
            currentScore: null,
          },
          {
            id: "c2",
            name: "Execution",
            description: null,
            max_score: 1,
            weight: 0.4,
            currentScore: null,
          },
        ],
      }),
    })
  }

  if (url.endsWith("/judging/assignments/a1/scores") && init?.method === "POST") {
    return Promise.resolve({
      ok: true,
      json: async () => ({ success: true }),
    })
  }

  if (url.endsWith("/judging/assignments/a1/notes") && init?.method === "PATCH") {
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

const { ScoringPanel } = await import(
  "@/components/hackathon/judging/scoring-panel"
)

describe("ScoringPanel", () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it("requires every binary criterion to be marked before submit", async () => {
    render(
      <ScoringPanel
        hackathonSlug="test-hack"
        assignmentId="a1"
        onClose={() => {}}
        onScoreSubmitted={() => {}}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("Pass / Fail")).toBeDefined()
    })

    fireEvent.click(screen.getAllByRole("button", { name: "Good" })[0])
    fireEvent.click(screen.getByRole("button", { name: "Submit Scores" }))

    await waitFor(() => {
      expect(
        screen.getByText("Mark each criterion as good or bad before submitting")
      ).toBeDefined()
    })

    expect(
      mockFetch.mock.calls.find(([input, init]) =>
        String(input).endsWith("/judging/assignments/a1/scores") &&
        init?.method === "POST"
      )
    ).toBeUndefined()
  })

  it("submits binary scores as 1 and 0", async () => {
    const onScoreSubmitted = mock(() => {})

    render(
      <ScoringPanel
        hackathonSlug="test-hack"
        assignmentId="a1"
        onClose={() => {}}
        onScoreSubmitted={onScoreSubmitted}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("Pass / Fail")).toBeDefined()
    })

    fireEvent.click(screen.getAllByRole("button", { name: "Good" })[0])
    fireEvent.click(screen.getAllByRole("button", { name: "Bad" })[1])
    fireEvent.click(screen.getByRole("button", { name: "Submit Scores" }))

    await waitFor(() => {
      expect(onScoreSubmitted).toHaveBeenCalled()
    })

    const submitCall = mockFetch.mock.calls.find(([input, init]) =>
      String(input).endsWith("/judging/assignments/a1/scores") &&
      init?.method === "POST"
    )

    expect(submitCall).toBeDefined()
    const payload = JSON.parse(String(submitCall?.[1]?.body))
    expect(payload.scores).toEqual([
      { criteriaId: "c1", score: 1 },
      { criteriaId: "c2", score: 0 },
    ])
  })
})
