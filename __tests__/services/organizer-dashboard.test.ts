import { describe, it, expect, beforeEach } from "bun:test"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
} from "../lib/supabase-mock"

const { getBatchHackathonStats } = await import("@/lib/services/organizer-dashboard")

describe("getBatchHackathonStats", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  it("returns empty map for empty input", async () => {
    const result = await getBatchHackathonStats([])
    expect(result.size).toBe(0)
  })

  it("returns correct counts from count queries", async () => {
    setMockFromImplementation((table) => {
      if (table === "hackathon_participants") return createChainableMock({ data: null, error: null, count: 5 })
      if (table === "teams") return createChainableMock({ data: null, error: null, count: 3 })
      if (table === "submissions") return createChainableMock({ data: null, error: null, count: 2 })
      if (table === "judge_assignments") return createChainableMock({
        data: [
          { hackathon_id: "h1", is_complete: true },
          { hackathon_id: "h1", is_complete: false },
        ],
        error: null,
      })
      if (table === "mentor_requests") return createChainableMock({ data: null, error: null, count: 1 })
      return createChainableMock({ data: null, error: null })
    })

    const result = await getBatchHackathonStats(["h1"])
    expect(result.size).toBe(1)

    const h1 = result.get("h1")!
    expect(h1.participantCount).toBe(5)
    expect(h1.teamCount).toBe(3)
    expect(h1.submissionCount).toBe(2)
    expect(h1.judgingTotal).toBe(2)
    expect(h1.judgingComplete).toBe(1)
    expect(h1.openMentorRequests).toBe(1)
  })

  it("splits assignment data correctly across hackathons", async () => {
    setMockFromImplementation((table) => {
      if (table === "judge_assignments") return createChainableMock({
        data: [
          { hackathon_id: "h1", is_complete: true },
          { hackathon_id: "h1", is_complete: false },
          { hackathon_id: "h2", is_complete: true },
        ],
        error: null,
      })
      return createChainableMock({ data: null, error: null, count: 0 })
    })

    const result = await getBatchHackathonStats(["h1", "h2"])
    expect(result.size).toBe(2)

    expect(result.get("h1")!.judgingTotal).toBe(2)
    expect(result.get("h1")!.judgingComplete).toBe(1)
    expect(result.get("h2")!.judgingTotal).toBe(1)
    expect(result.get("h2")!.judgingComplete).toBe(1)
  })

  it("handles null data from queries", async () => {
    setMockFromImplementation(() =>
      createChainableMock({ data: null, error: { message: "error" } })
    )

    const result = await getBatchHackathonStats(["h1"])
    const h1 = result.get("h1")!

    expect(h1.participantCount).toBe(0)
    expect(h1.teamCount).toBe(0)
    expect(h1.submissionCount).toBe(0)
    expect(h1.judgingComplete).toBe(0)
    expect(h1.judgingTotal).toBe(0)
    expect(h1.openMentorRequests).toBe(0)
  })
})
