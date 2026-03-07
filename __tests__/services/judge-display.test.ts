import { describe, it, expect, beforeEach } from "bun:test"
import type { HackathonJudgeDisplay } from "@/lib/db/hackathon-types"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
  mockTableQuery,
  mockSuccess,
  mockError,
  mockCount,
} from "../lib/supabase-mock"

const {
  listJudgeDisplayProfiles,
  createJudgeDisplayProfile,
  updateJudgeDisplayProfile,
  deleteJudgeDisplayProfile,
  countJudgeDisplayProfiles,
} = await import("@/lib/services/judge-display")

const mockJudge: HackathonJudgeDisplay = {
  id: "j1",
  hackathon_id: "h1",
  name: "Jane Doe",
  title: "CTO",
  organization: "Acme Corp",
  headshot_url: null,
  clerk_user_id: null,
  participant_id: null,
  display_order: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

describe("Judge Display Service", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  describe("listJudgeDisplayProfiles", () => {
    it("returns judge profiles ordered by display_order", async () => {
      const chain = createChainableMock({
        data: [mockJudge, { ...mockJudge, id: "j2", name: "John Smith", display_order: 1 }],
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await listJudgeDisplayProfiles("h1")

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe("Jane Doe")
    })

    it("returns empty array when database query fails", async () => {
      mockTableQuery("hackathon_judges_display", mockError("DB error"))

      const result = await listJudgeDisplayProfiles("h1")

      expect(result).toEqual([])
    })

    it("returns empty array when no judges exist", async () => {
      mockTableQuery("hackathon_judges_display", mockSuccess([]))

      const result = await listJudgeDisplayProfiles("h1")

      expect(result).toEqual([])
    })
  })

  describe("createJudgeDisplayProfile", () => {
    it("creates judge profile with required fields", async () => {
      const chain = createChainableMock({
        data: mockJudge,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await createJudgeDisplayProfile("h1", {
        name: "Jane Doe",
      })

      expect(result).not.toBeNull()
      expect(result?.name).toBe("Jane Doe")
    })

    it("creates judge profile with all fields", async () => {
      const chain = createChainableMock({
        data: mockJudge,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await createJudgeDisplayProfile("h1", {
        name: "Jane Doe",
        title: "CTO",
        organization: "Acme Corp",
        displayOrder: 0,
      })

      expect(result).not.toBeNull()
      expect(result?.title).toBe("CTO")
    })

    it("returns null when database insert fails", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      setMockFromImplementation(() => chain)

      const result = await createJudgeDisplayProfile("h1", { name: "Test" })

      expect(result).toBeNull()
    })
  })

  describe("updateJudgeDisplayProfile", () => {
    it("updates judge profile name", async () => {
      const updated = { ...mockJudge, name: "Updated Name" }
      const chain = createChainableMock({
        data: updated,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await updateJudgeDisplayProfile("j1", "h1", {
        name: "Updated Name",
      })

      expect(result).not.toBeNull()
      expect(result?.name).toBe("Updated Name")
    })

    it("returns null when database update fails", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      setMockFromImplementation(() => chain)

      const result = await updateJudgeDisplayProfile("j1", "h1", { name: "Test" })

      expect(result).toBeNull()
    })
  })

  describe("deleteJudgeDisplayProfile", () => {
    it("returns true on successful deletion", async () => {
      const chain = createChainableMock({
        data: null,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await deleteJudgeDisplayProfile("j1", "h1")

      expect(result).toBe(true)
    })

    it("returns false when database delete fails", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      setMockFromImplementation(() => chain)

      const result = await deleteJudgeDisplayProfile("j1", "h1")

      expect(result).toBe(false)
    })
  })

  describe("countJudgeDisplayProfiles", () => {
    it("returns count of judge profiles", async () => {
      const chain = createChainableMock(mockCount(3))
      setMockFromImplementation(() => chain)

      const result = await countJudgeDisplayProfiles("h1")

      expect(result).toBe(3)
    })

    it("returns 0 when database query fails", async () => {
      const chain = createChainableMock(mockError("DB error"))
      setMockFromImplementation(() => chain)

      const result = await countJudgeDisplayProfiles("h1")

      expect(result).toBe(0)
    })
  })
})
