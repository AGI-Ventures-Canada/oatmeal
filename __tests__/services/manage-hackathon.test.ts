import { describe, it, expect, beforeEach } from "bun:test"
import {
  resetAllMocks,
  mockAuth,
} from "../lib/supabase-mock"
import { mock } from "bun:test"

const mockGetPublicHackathon = mock(() => Promise.resolve(null))

mock.module("@/lib/services/public-hackathons", () => ({
  getPublicHackathon: mockGetPublicHackathon,
}))

const { getManageHackathon } = await import("@/lib/services/manage-hackathon")

const mockHackathon = {
  id: "h1",
  name: "Test Hackathon",
  slug: "test-hackathon",
  organizer: {
    id: "t1",
    name: "Test Org",
    clerk_org_id: "org_123",
    slug: "test-org",
  },
}

describe("Manage Hackathon Service", () => {
  beforeEach(() => {
    resetAllMocks()
    mockGetPublicHackathon.mockClear()
  })

  describe("getManageHackathon", () => {
    it("returns null when user is not authenticated", async () => {
      mockAuth.mockImplementation(() =>
        Promise.resolve({ userId: null, orgId: null, orgRole: null })
      )

      const result = await getManageHackathon("test-hackathon")

      expect(result).toBeNull()
    })

    it("returns null when hackathon is not found", async () => {
      mockAuth.mockImplementation(() =>
        Promise.resolve({ userId: "user_123", orgId: "org_123", orgRole: "admin" })
      )
      mockGetPublicHackathon.mockImplementation(() => Promise.resolve(null))

      const result = await getManageHackathon("nonexistent-hackathon")

      expect(result).toBeNull()
      expect(mockGetPublicHackathon).toHaveBeenCalledWith("nonexistent-hackathon", {
        includeUnpublished: true,
      })
    })

    it("returns null when user is not the organizer", async () => {
      mockAuth.mockImplementation(() =>
        Promise.resolve({ userId: "user_123", orgId: "org_different", orgRole: "admin" })
      )
      mockGetPublicHackathon.mockImplementation(() => Promise.resolve(mockHackathon))

      const result = await getManageHackathon("test-hackathon")

      expect(result).toBeNull()
    })

    it("returns null when user has no orgId", async () => {
      mockAuth.mockImplementation(() =>
        Promise.resolve({ userId: "user_123", orgId: null, orgRole: null })
      )
      mockGetPublicHackathon.mockImplementation(() => Promise.resolve(mockHackathon))

      const result = await getManageHackathon("test-hackathon")

      expect(result).toBeNull()
    })

    it("returns hackathon when user is the organizer", async () => {
      mockAuth.mockImplementation(() =>
        Promise.resolve({ userId: "user_123", orgId: "org_123", orgRole: "admin" })
      )
      mockGetPublicHackathon.mockImplementation(() => Promise.resolve(mockHackathon))

      const result = await getManageHackathon("test-hackathon")

      expect(result).not.toBeNull()
      expect(result?.hackathon).toEqual(mockHackathon)
      expect(result?.isOrganizer).toBe(true)
    })

    it("calls getPublicHackathon with includeUnpublished true", async () => {
      mockAuth.mockImplementation(() =>
        Promise.resolve({ userId: "user_123", orgId: "org_123", orgRole: "admin" })
      )
      mockGetPublicHackathon.mockImplementation(() => Promise.resolve(mockHackathon))

      await getManageHackathon("my-hackathon")

      expect(mockGetPublicHackathon).toHaveBeenCalledWith("my-hackathon", {
        includeUnpublished: true,
      })
    })
  })
})
