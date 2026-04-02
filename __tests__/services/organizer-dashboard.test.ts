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

  it("returns stats keyed by hackathon ID", async () => {
    setMockFromImplementation((table) => {
      if (table === "hackathon_participants") {
        return createChainableMock({
          data: [
            { hackathon_id: "h1" },
            { hackathon_id: "h1" },
            { hackathon_id: "h2" },
          ],
          error: null,
        })
      }
      if (table === "teams") {
        return createChainableMock({
          data: [{ hackathon_id: "h1" }],
          error: null,
        })
      }
      if (table === "submissions") {
        return createChainableMock({
          data: [{ hackathon_id: "h1" }, { hackathon_id: "h2" }],
          error: null,
        })
      }
      if (table === "judge_assignments") {
        return createChainableMock({
          data: [
            { hackathon_id: "h1", is_complete: true },
            { hackathon_id: "h1", is_complete: false },
            { hackathon_id: "h2", is_complete: true },
          ],
          error: null,
        })
      }
      if (table === "mentor_requests") {
        return createChainableMock({
          data: [{ hackathon_id: "h1" }],
          error: null,
        })
      }
      return createChainableMock({ data: null, error: null })
    })

    const result = await getBatchHackathonStats(["h1", "h2"])

    expect(result.size).toBe(2)

    const h1 = result.get("h1")!
    expect(h1.participantCount).toBe(2)
    expect(h1.teamCount).toBe(1)
    expect(h1.submissionCount).toBe(1)
    expect(h1.judgingTotal).toBe(2)
    expect(h1.judgingComplete).toBe(1)
    expect(h1.openMentorRequests).toBe(1)

    const h2 = result.get("h2")!
    expect(h2.participantCount).toBe(1)
    expect(h2.teamCount).toBe(0)
    expect(h2.submissionCount).toBe(1)
    expect(h2.judgingTotal).toBe(1)
    expect(h2.judgingComplete).toBe(1)
    expect(h2.openMentorRequests).toBe(0)
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
