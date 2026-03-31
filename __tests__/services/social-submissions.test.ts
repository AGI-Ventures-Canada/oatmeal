import { describe, it, expect, beforeEach, mock } from "bun:test"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
  mockSuccess,
  mockError,
} from "../lib/supabase-mock"

const {
  listSocialSubmissions,
  reviewSocialSubmission,
  fetchOgMetadata,
} = await import("@/lib/services/social-submissions")

const HACKATHON_ID = "11111111-1111-1111-1111-111111111111"
const SUB_ID = "22222222-2222-2222-2222-222222222222"

describe("social-submissions service", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  describe("listSocialSubmissions", () => {
    it("returns submissions", async () => {
      const subs = [
        { id: SUB_ID, hackathon_id: HACKATHON_ID, team_id: null, participant_id: "p1", url: "https://twitter.com/post", platform: "twitter", og_title: "My Post", og_description: null, og_image_url: null, status: "pending", reviewed_at: null, created_at: "2026-04-01" },
      ]
      setMockFromImplementation(() => createChainableMock(mockSuccess(subs)))
      const result = await listSocialSubmissions(HACKATHON_ID)
      expect(result).toHaveLength(1)
      expect(result[0].platform).toBe("twitter")
    })

    it("filters by status", async () => {
      setMockFromImplementation(() => createChainableMock(mockSuccess([])))
      const result = await listSocialSubmissions(HACKATHON_ID, "approved")
      expect(result).toEqual([])
    })

    it("returns empty on error", async () => {
      setMockFromImplementation(() => createChainableMock(mockError("Failed")))
      const result = await listSocialSubmissions(HACKATHON_ID)
      expect(result).toEqual([])
    })
  })

  describe("reviewSocialSubmission", () => {
    it("approves a submission", async () => {
      setMockFromImplementation(() => createChainableMock({ data: null, error: null }))
      expect(await reviewSocialSubmission(SUB_ID, "approved")).toBe(true)
    })

    it("rejects a submission", async () => {
      setMockFromImplementation(() => createChainableMock({ data: null, error: null }))
      expect(await reviewSocialSubmission(SUB_ID, "rejected")).toBe(true)
    })

    it("returns false on error", async () => {
      setMockFromImplementation(() => createChainableMock(mockError("Failed")))
      expect(await reviewSocialSubmission(SUB_ID, "approved")).toBe(false)
    })
  })

  describe("fetchOgMetadata", () => {
    it("returns null values on fetch failure", async () => {
      const result = await fetchOgMetadata("https://invalid.example.com/404")
      expect(result.title).toBeNull()
      expect(result.description).toBeNull()
      expect(result.imageUrl).toBeNull()
    })
  })
})
