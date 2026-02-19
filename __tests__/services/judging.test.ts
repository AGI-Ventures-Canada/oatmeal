import { describe, it, expect, beforeEach } from "bun:test"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
} from "../lib/supabase-mock"

const { getJudgingSetupStatus } = await import("@/lib/services/judging")

describe("Judging Service", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  describe("getJudgingSetupStatus", () => {
    it("returns zero judges and no unassigned submissions when no data", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_participants") {
          return createChainableMock({ data: [], error: null })
        }
        if (table === "submissions") {
          return createChainableMock({ data: [], error: null })
        }
        if (table === "judge_assignments") {
          return createChainableMock({ data: [], error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getJudgingSetupStatus("hackathon_123")

      expect(result.judgeCount).toBe(0)
      expect(result.hasUnassignedSubmissions).toBe(false)
    })

    it("returns correct judge count", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_participants") {
          return createChainableMock({
            data: [{ id: "j1" }, { id: "j2" }, { id: "j3" }],
            error: null,
          })
        }
        if (table === "submissions") {
          return createChainableMock({ data: [], error: null })
        }
        if (table === "judge_assignments") {
          return createChainableMock({ data: [], error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getJudgingSetupStatus("hackathon_123")

      expect(result.judgeCount).toBe(3)
    })

    it("returns hasUnassignedSubmissions true when submissions have no assignments", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_participants") {
          return createChainableMock({
            data: [{ id: "j1" }],
            error: null,
          })
        }
        if (table === "submissions") {
          return createChainableMock({
            data: [{ id: "s1" }, { id: "s2" }],
            error: null,
          })
        }
        if (table === "judge_assignments") {
          return createChainableMock({ data: [], error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getJudgingSetupStatus("hackathon_123")

      expect(result.hasUnassignedSubmissions).toBe(true)
    })

    it("returns hasUnassignedSubmissions false when all submissions are assigned", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_participants") {
          return createChainableMock({
            data: [{ id: "j1" }],
            error: null,
          })
        }
        if (table === "submissions") {
          return createChainableMock({
            data: [{ id: "s1" }, { id: "s2" }],
            error: null,
          })
        }
        if (table === "judge_assignments") {
          return createChainableMock({
            data: [{ submission_id: "s1" }, { submission_id: "s2" }],
            error: null,
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getJudgingSetupStatus("hackathon_123")

      expect(result.hasUnassignedSubmissions).toBe(false)
    })

    it("returns hasUnassignedSubmissions true when some submissions are not assigned", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_participants") {
          return createChainableMock({
            data: [{ id: "j1" }],
            error: null,
          })
        }
        if (table === "submissions") {
          return createChainableMock({
            data: [{ id: "s1" }, { id: "s2" }, { id: "s3" }],
            error: null,
          })
        }
        if (table === "judge_assignments") {
          return createChainableMock({
            data: [{ submission_id: "s1" }],
            error: null,
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getJudgingSetupStatus("hackathon_123")

      expect(result.hasUnassignedSubmissions).toBe(true)
    })

    it("handles null data from queries gracefully", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_participants") {
          return createChainableMock({ data: null, error: null })
        }
        if (table === "submissions") {
          return createChainableMock({ data: null, error: null })
        }
        if (table === "judge_assignments") {
          return createChainableMock({ data: null, error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getJudgingSetupStatus("hackathon_123")

      expect(result.judgeCount).toBe(0)
      expect(result.hasUnassignedSubmissions).toBe(false)
    })

    it("handles multiple assignments for same submission", async () => {
      setMockFromImplementation((table) => {
        if (table === "hackathon_participants") {
          return createChainableMock({
            data: [{ id: "j1" }, { id: "j2" }],
            error: null,
          })
        }
        if (table === "submissions") {
          return createChainableMock({
            data: [{ id: "s1" }],
            error: null,
          })
        }
        if (table === "judge_assignments") {
          return createChainableMock({
            data: [
              { submission_id: "s1" },
              { submission_id: "s1" },
            ],
            error: null,
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await getJudgingSetupStatus("hackathon_123")

      expect(result.judgeCount).toBe(2)
      expect(result.hasUnassignedSubmissions).toBe(false)
    })
  })
})
