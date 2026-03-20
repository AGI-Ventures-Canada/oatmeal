import { describe, it, expect, beforeEach } from "bun:test"
import type { RubricLevel } from "@/lib/db/hackathon-types"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
} from "../lib/supabase-mock"

const {
  listRubricLevels,
  createRubricLevel,
  updateRubricLevel,
  deleteRubricLevel,
  createDefaultRubricLevels,
  DEFAULT_RUBRIC_LEVELS,
} = await import("@/lib/services/rubric-levels")

const mockLevel: RubricLevel = {
  id: "rl1",
  criteria_id: "c1",
  level_number: 1,
  label: "Far Below Expectations",
  description: null,
  created_at: "2026-01-01T00:00:00Z",
}

describe("Rubric Levels Service", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  describe("listRubricLevels", () => {
    it("returns levels ordered by level_number", async () => {
      const chain = createChainableMock({
        data: [mockLevel],
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await listRubricLevels("c1")
      expect(result).toHaveLength(1)
      expect(result[0].label).toBe("Far Below Expectations")
    })

    it("returns empty array on error", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "fail" },
      })
      setMockFromImplementation(() => chain)

      const result = await listRubricLevels("c1")
      expect(result).toEqual([])
    })
  })

  describe("createDefaultRubricLevels", () => {
    it("creates 5 default levels for a criteria", async () => {
      const chain = createChainableMock({
        data: DEFAULT_RUBRIC_LEVELS.map((l, i) => ({
          id: `rl${i}`,
          criteria_id: "c1",
          ...l,
          description: null,
          created_at: "2026-01-01T00:00:00Z",
        })),
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await createDefaultRubricLevels("c1")
      expect(result).toHaveLength(5)
    })
  })

  describe("createRubricLevel", () => {
    it("creates a level with next sequential number", async () => {
      const selectChain = createChainableMock({
        data: [{ level_number: 5 }],
        error: null,
      })
      const insertChain = createChainableMock({
        data: { ...mockLevel, id: "rl-new", level_number: 6, label: "Outstanding" },
        error: null,
      })
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        return callCount === 1 ? selectChain : insertChain
      })

      const result = await createRubricLevel("c1", { label: "Outstanding" })
      expect(result).not.toBeNull()
      expect(result!.label).toBe("Outstanding")
    })
  })

  describe("updateRubricLevel", () => {
    it("updates label and description", async () => {
      const chain = createChainableMock({
        data: { ...mockLevel, label: "Updated Label", description: "New desc" },
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await updateRubricLevel("rl1", { label: "Updated Label", description: "New desc" })
      expect(result).not.toBeNull()
      expect(result!.label).toBe("Updated Label")
    })
  })

  describe("deleteRubricLevel", () => {
    it("deletes a level and renumbers remaining", async () => {
      const countChain = createChainableMock({ count: 5, data: null, error: null })
      const deleteChain = createChainableMock({ data: { criteria_id: "c1" }, error: null })
      const selectChain = createChainableMock({
        data: [
          { id: "rl1", level_number: 1 },
          { id: "rl3", level_number: 3 },
          { id: "rl4", level_number: 4 },
          { id: "rl5", level_number: 5 },
        ],
        error: null,
      })
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        if (callCount === 1) return countChain
        if (callCount === 2) return deleteChain
        return selectChain
      })

      const result = await deleteRubricLevel("rl2", "c1")
      expect(result.success).toBe(true)
    })

    it("rejects deletion when only 2 levels remain", async () => {
      const countChain = createChainableMock({ count: 2, data: null, error: null })
      setMockFromImplementation(() => countChain)

      const result = await deleteRubricLevel("rl1", "c1")
      expect(result.success).toBe(false)
      expect(result.error).toContain("minimum")
    })
  })
})
