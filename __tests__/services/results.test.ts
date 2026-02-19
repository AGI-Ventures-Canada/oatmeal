import { describe, it, expect, beforeEach } from "bun:test"
import type { HackathonResult } from "@/lib/db/hackathon-types"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
  setMockRpcImplementation,
} from "../lib/supabase-mock"

const {
  calculateResults,
  getResults,
  unpublishResults,
  getPublicResults,
} = await import("@/lib/services/results")

const mockResult: HackathonResult = {
  id: "r1",
  hackathon_id: "h1",
  submission_id: "s1",
  rank: 1,
  total_score: 85,
  weighted_score: 85.0,
  judge_count: 3,
  published_at: null,
  created_at: "2026-01-01T00:00:00Z",
}

describe("Results Service", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  describe("calculateResults", () => {
    it("calculates results successfully", async () => {
      setMockRpcImplementation((fn) => {
        if (fn === "calculate_results") {
          return Promise.resolve({
            data: [{ success: true, results_count: 5 }],
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const result = await calculateResults("h1")

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.count).toBe(5)
      }
    })

    it("returns rpc_failed error when database RPC call fails", async () => {
      setMockRpcImplementation(() =>
        Promise.resolve({
          data: null,
          error: { message: "RPC failed" },
        })
      )

      const result = await calculateResults("h1")

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe("rpc_failed")
      }
    })

    it("returns error code from RPC when calculation fails with business error", async () => {
      setMockRpcImplementation(() =>
        Promise.resolve({
          data: [{ success: false, error_message: "No submissions", error_code: "no_submissions" }],
          error: null,
        })
      )

      const result = await calculateResults("h1")

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe("no_submissions")
        expect(result.error).toBe("No submissions")
      }
    })

    it("returns unknown error when RPC returns empty result array", async () => {
      setMockRpcImplementation(() =>
        Promise.resolve({
          data: [],
          error: null,
        })
      )

      const result = await calculateResults("h1")

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe("unknown")
      }
    })
  })

  describe("getResults", () => {
    it("returns results with submission and team details", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_results") {
          return createChainableMock({
            data: [
              {
                ...mockResult,
                submission: { title: "Project 1", team_id: "t1" },
              },
            ],
            error: null,
          })
        }
        if (table === "teams") {
          return createChainableMock({
            data: [{ id: "t1", name: "Team One" }],
            error: null,
          })
        }
        if (table === "prize_assignments") {
          return createChainableMock({
            data: [
              {
                submission_id: "s1",
                prize: { id: "p1", name: "First Place", value: "$5000" },
              },
            ],
            error: null,
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getResults("h1")

      expect(result).toHaveLength(1)
      expect(result[0].submissionTitle).toBe("Project 1")
      expect(result[0].teamName).toBe("Team One")
      expect(result[0].prizes).toHaveLength(1)
      expect(result[0].prizes[0].name).toBe("First Place")
    })

    it("returns empty array when database query fails", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      setMockFromImplementation(() => chain)

      const result = await getResults("h1")

      expect(result).toEqual([])
    })

    it("returns null teamName for solo submissions without teams", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_results") {
          return createChainableMock({
            data: [
              {
                ...mockResult,
                submission: { title: "Solo Project", team_id: null },
              },
            ],
            error: null,
          })
        }
        if (table === "prize_assignments") {
          return createChainableMock({ data: [], error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getResults("h1")

      expect(result).toHaveLength(1)
      expect(result[0].teamName).toBeNull()
      expect(result[0].prizes).toEqual([])
    })

    it("returns empty prizes array when submission has no prize assignments", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_results") {
          return createChainableMock({
            data: [
              {
                ...mockResult,
                submission: { title: "Project 1", team_id: "t1" },
              },
            ],
            error: null,
          })
        }
        if (table === "teams") {
          return createChainableMock({
            data: [{ id: "t1", name: "Team One" }],
            error: null,
          })
        }
        if (table === "prize_assignments") {
          return createChainableMock({ data: [], error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getResults("h1")

      expect(result).toHaveLength(1)
      expect(result[0].prizes).toEqual([])
    })

    it("returns results sorted by rank", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_results") {
          return createChainableMock({
            data: [
              {
                ...mockResult,
                rank: 1,
                submission: { title: "First Place Project", team_id: null },
              },
              {
                ...mockResult,
                id: "r2",
                submission_id: "s2",
                rank: 2,
                total_score: 80,
                submission: { title: "Second Place Project", team_id: null },
              },
            ],
            error: null,
          })
        }
        if (table === "prize_assignments") {
          return createChainableMock({ data: [], error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getResults("h1")

      expect(result).toHaveLength(2)
      expect(result[0].rank).toBe(1)
      expect(result[1].rank).toBe(2)
    })
  })

  describe("unpublishResults", () => {
    it("unpublishes results successfully", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_results") {
          return createChainableMock({ data: null, error: null })
        }
        if (table === "hackathons") {
          return createChainableMock({ data: null, error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await unpublishResults("h1", "t1")

      expect(result.success).toBe(true)
    })

    it("returns error when hackathon_results update fails", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_results") {
          return createChainableMock({
            data: null,
            error: { message: "Update failed" },
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await unpublishResults("h1", "t1")

      expect(result.success).toBe(false)
      expect(result.error).toBe("Failed to unpublish results")
    })

    it("returns error when hackathons status update fails", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_results") {
          return createChainableMock({ data: null, error: null })
        }
        if (table === "hackathons") {
          return createChainableMock({
            data: null,
            error: { message: "Update failed" },
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await unpublishResults("h1", "t1")

      expect(result.success).toBe(false)
      expect(result.error).toBe("Failed to update hackathon status")
    })
  })

  describe("getPublicResults", () => {
    it("returns results when hackathon results are published", async () => {
      let hackathonChecked = false
      setMockFromImplementation((table) => {
        if (table === "hackathons" && !hackathonChecked) {
          hackathonChecked = true
          return createChainableMock({
            data: { results_published_at: "2026-01-01T00:00:00Z" },
            error: null,
          })
        }
        if (table === "hackathon_results") {
          return createChainableMock({
            data: [
              {
                ...mockResult,
                submission: { title: "Project 1", team_id: null },
              },
            ],
            error: null,
          })
        }
        if (table === "prize_assignments") {
          return createChainableMock({ data: [], error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getPublicResults("h1")

      expect(result).not.toBeNull()
      expect(result).toHaveLength(1)
    })

    it("returns null when results have not been published yet", async () => {
      const chain = createChainableMock({
        data: { results_published_at: null },
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await getPublicResults("h1")

      expect(result).toBeNull()
    })

    it("returns null when hackathon does not exist", async () => {
      const chain = createChainableMock({
        data: null,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await getPublicResults("h1")

      expect(result).toBeNull()
    })
  })
})
