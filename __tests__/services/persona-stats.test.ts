import { describe, it, expect, beforeEach } from "bun:test"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
} from "../lib/supabase-mock"

const { getBatchJudgeStats, getSponsorshipDetails } = await import(
  "@/lib/services/persona-stats"
)

describe("getBatchJudgeStats", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  it("returns empty map for empty hackathonIds", async () => {
    const result = await getBatchJudgeStats([], "user_1")
    expect(result.size).toBe(0)
  })

  it("returns empty map when no judge participants found", async () => {
    setMockFromImplementation(() =>
      createChainableMock({ data: [], error: null }),
    )
    const result = await getBatchJudgeStats(["h1"], "user_1")
    expect(result.size).toBe(0)
  })

  it("returns stats with assignment counts", async () => {
    let callCount = 0
    setMockFromImplementation(() => {
      callCount++
      if (callCount === 1) {
        return createChainableMock({
          data: [{ id: "p1", hackathon_id: "h1" }],
          error: null,
        })
      }
      return createChainableMock({
        data: [
          { judge_participant_id: "p1", hackathon_id: "h1", is_complete: true },
          { judge_participant_id: "p1", hackathon_id: "h1", is_complete: false },
          { judge_participant_id: "p1", hackathon_id: "h1", is_complete: true },
        ],
        error: null,
      })
    })

    const result = await getBatchJudgeStats(["h1"], "user_1")
    expect(result.size).toBe(1)
    const stats = result.get("h1")!
    expect(stats.totalAssignments).toBe(3)
    expect(stats.completedAssignments).toBe(2)
  })

  it("handles multiple hackathons", async () => {
    let callCount = 0
    setMockFromImplementation(() => {
      callCount++
      if (callCount === 1) {
        return createChainableMock({
          data: [
            { id: "p1", hackathon_id: "h1" },
            { id: "p2", hackathon_id: "h2" },
          ],
          error: null,
        })
      }
      return createChainableMock({
        data: [
          { judge_participant_id: "p1", hackathon_id: "h1", is_complete: true },
          { judge_participant_id: "p2", hackathon_id: "h2", is_complete: false },
        ],
        error: null,
      })
    })

    const result = await getBatchJudgeStats(["h1", "h2"], "user_1")
    expect(result.size).toBe(2)
    expect(result.get("h1")!.completedAssignments).toBe(1)
    expect(result.get("h2")!.completedAssignments).toBe(0)
  })
})

describe("getSponsorshipDetails", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  it("returns empty map for empty hackathonIds", async () => {
    const result = await getSponsorshipDetails("t1", [])
    expect(result.size).toBe(0)
  })

  it("returns sponsorship info with tiers", async () => {
    setMockFromImplementation(() =>
      createChainableMock({
        data: [
          { hackathon_id: "h1", tier: "gold", name: "Acme Corp" },
          { hackathon_id: "h2", tier: "silver", name: "Beta Inc" },
        ],
        error: null,
      }),
    )

    const result = await getSponsorshipDetails("t1", ["h1", "h2"])
    expect(result.size).toBe(2)
    expect(result.get("h1")!.tier).toBe("gold")
    expect(result.get("h2")!.name).toBe("Beta Inc")
  })

  it("returns empty map on error", async () => {
    setMockFromImplementation(() =>
      createChainableMock({ data: null, error: { message: "fail" } }),
    )

    const result = await getSponsorshipDetails("t1", ["h1"])
    expect(result.size).toBe(0)
  })
})
