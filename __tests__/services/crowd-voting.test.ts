import { describe, it, expect, beforeEach } from "bun:test"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
} from "../lib/supabase-mock"

const {
  castVote,
  removeVote,
  getVoteCounts,
  getUserVote,
  getCrowdFavoriteWinner,
} = await import("@/lib/services/crowd-voting")

describe("Crowd Voting Service", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  describe("castVote", () => {
    it("casts a vote successfully", async () => {
      const chain = createChainableMock({
        data: null,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await castVote("h1", "s1", "user1")

      expect(result.success).toBe(true)
    })

    it("returns error when delete fails", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      setMockFromImplementation(() => chain)

      const result = await castVote("h1", "s1", "user1")

      expect(result.success).toBe(false)
    })
  })

  describe("removeVote", () => {
    it("removes vote successfully", async () => {
      const chain = createChainableMock({
        data: null,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await removeVote("h1", "user1")

      expect(result).toBe(true)
    })

    it("returns false when database delete fails", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      setMockFromImplementation(() => chain)

      const result = await removeVote("h1", "user1")

      expect(result).toBe(false)
    })
  })

  describe("getVoteCounts", () => {
    it("returns vote counts per submission", async () => {
      const chain = createChainableMock({
        data: [
          { submission_id: "s1" },
          { submission_id: "s1" },
          { submission_id: "s2" },
        ],
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await getVoteCounts("h1")

      expect(result).toHaveLength(2)
      const s1 = result.find((c) => c.submissionId === "s1")
      expect(s1?.voteCount).toBe(2)
      const s2 = result.find((c) => c.submissionId === "s2")
      expect(s2?.voteCount).toBe(1)
    })

    it("returns empty array when no votes exist", async () => {
      const chain = createChainableMock({
        data: [],
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await getVoteCounts("h1")

      expect(result).toEqual([])
    })

    it("returns empty array when database query fails", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      setMockFromImplementation(() => chain)

      const result = await getVoteCounts("h1")

      expect(result).toEqual([])
    })
  })

  describe("getUserVote", () => {
    it("returns submission id for user vote", async () => {
      const chain = createChainableMock({
        data: { submission_id: "s1" },
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await getUserVote("h1", "user1")

      expect(result).toBe("s1")
    })

    it("returns null when user has not voted", async () => {
      const chain = createChainableMock({
        data: null,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await getUserVote("h1", "user1")

      expect(result).toBeNull()
    })
  })

  describe("getCrowdFavoriteWinner", () => {
    it("returns submission with most votes", async () => {
      const chain = createChainableMock({
        data: [
          { submission_id: "s1" },
          { submission_id: "s1" },
          { submission_id: "s1" },
          { submission_id: "s2" },
        ],
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await getCrowdFavoriteWinner("h1")

      expect(result).toBe("s1")
    })

    it("returns null when no votes exist", async () => {
      const chain = createChainableMock({
        data: [],
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await getCrowdFavoriteWinner("h1")

      expect(result).toBeNull()
    })
  })
})
