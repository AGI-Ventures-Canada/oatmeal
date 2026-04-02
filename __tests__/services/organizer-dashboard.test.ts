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

  it("returns count-based stats for each hackathon", async () => {
    setMockFromImplementation((table) => {
      if (table === "hackathon_participants") return createChainableMock({ data: null, error: null, count: 5 })
      if (table === "teams") return createChainableMock({ data: null, error: null, count: 2 })
      if (table === "submissions") return createChainableMock({ data: null, error: null, count: 3 })
      if (table === "judge_assignments") return createChainableMock({ data: null, error: null, count: 4 })
      if (table === "mentor_requests") return createChainableMock({ data: null, error: null, count: 1 })
      return createChainableMock({ data: null, error: null, count: 0 })
    })

    const result = await getBatchHackathonStats(["h1"])

    expect(result.size).toBe(1)
    const h1 = result.get("h1")!
    expect(h1.hackathonId).toBe("h1")
    expect(h1.participantCount).toBe(5)
    expect(h1.teamCount).toBe(2)
    expect(h1.submissionCount).toBe(3)
    expect(h1.judgingTotal).toBe(4)
    expect(h1.judgingComplete).toBe(4)
    expect(h1.openMentorRequests).toBe(1)
  })

  it("creates entries for multiple hackathon IDs", async () => {
    setMockFromImplementation(() =>
      createChainableMock({ data: null, error: null, count: 0 })
    )

    const result = await getBatchHackathonStats(["h1", "h2", "h3"])
    expect(result.size).toBe(3)
    expect(result.has("h1")).toBe(true)
    expect(result.has("h2")).toBe(true)
    expect(result.has("h3")).toBe(true)
  })

  it("handles null counts from queries", async () => {
    setMockFromImplementation(() =>
      createChainableMock({ data: null, error: { message: "error" }, count: null })
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
