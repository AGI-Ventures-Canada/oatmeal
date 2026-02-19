import { describe, it, expect, beforeEach } from "bun:test"
import type { JudgeInvitation } from "@/lib/db/hackathon-types"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
} from "../lib/supabase-mock"

const {
  createJudgeInvitation,
  getJudgeInvitationByToken,
  acceptJudgeInvitation,
  cancelJudgeInvitation,
  listJudgeInvitations,
} = await import("@/lib/services/judge-invitations")

const mockInvitation: JudgeInvitation = {
  id: "inv1",
  hackathon_id: "h1",
  email: "judge@example.com",
  token: "test-token-123",
  invited_by_clerk_user_id: "organizer_123",
  status: "pending",
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  accepted_by_clerk_user_id: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

describe("Judge Invitations Service", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  describe("createJudgeInvitation", () => {
    it("creates invitation successfully when email is not already invited", async () => {
      let checkedExisting = false
      setMockFromImplementation(() => {
        if (!checkedExisting) {
          checkedExisting = true
          return createChainableMock({ data: null, error: null })
        }
        return createChainableMock({ data: mockInvitation, error: null })
      })

      const result = await createJudgeInvitation({
        hackathonId: "h1",
        email: "judge@example.com",
        invitedByClerkUserId: "organizer_123",
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.invitation.email).toBe("judge@example.com")
      }
    })

    it("returns already_invited error when pending invitation exists for email", async () => {
      const chain = createChainableMock({
        data: { id: "existing" },
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await createJudgeInvitation({
        hackathonId: "h1",
        email: "judge@example.com",
        invitedByClerkUserId: "organizer_123",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe("already_invited")
      }
    })

    it("normalizes email to lowercase before storing", async () => {
      let checkedExisting = false
      setMockFromImplementation(() => {
        if (!checkedExisting) {
          checkedExisting = true
          return createChainableMock({ data: null, error: null })
        }
        return createChainableMock({
          data: { ...mockInvitation, email: "judge@example.com" },
          error: null,
        })
      })

      const result = await createJudgeInvitation({
        hackathonId: "h1",
        email: "JUDGE@EXAMPLE.COM",
        invitedByClerkUserId: "organizer_123",
      })

      expect(result.success).toBe(true)
    })

    it("returns insert_failed error when database insert fails", async () => {
      let checkedExisting = false
      setMockFromImplementation(() => {
        if (!checkedExisting) {
          checkedExisting = true
          return createChainableMock({ data: null, error: null })
        }
        return createChainableMock({
          data: null,
          error: { message: "Insert failed" },
        })
      })

      const result = await createJudgeInvitation({
        hackathonId: "h1",
        email: "judge@example.com",
        invitedByClerkUserId: "organizer_123",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe("insert_failed")
      }
    })
  })

  describe("getJudgeInvitationByToken", () => {
    it("returns invitation with hackathon details", async () => {
      const chain = createChainableMock({
        data: {
          ...mockInvitation,
          hackathons: { name: "Test Hackathon", slug: "test-hackathon", status: "active" },
        },
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await getJudgeInvitationByToken("test-token-123")

      expect(result).not.toBeNull()
      expect(result?.hackathon.name).toBe("Test Hackathon")
      expect(result?.hackathon.slug).toBe("test-hackathon")
    })

    it("returns null when token does not exist in database", async () => {
      const chain = createChainableMock({
        data: null,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await getJudgeInvitationByToken("invalid-token")

      expect(result).toBeNull()
    })

    it("returns null when database query fails", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      setMockFromImplementation(() => chain)

      const result = await getJudgeInvitationByToken("test-token")

      expect(result).toBeNull()
    })
  })

  describe("cancelJudgeInvitation", () => {
    it("cancels pending invitation and updates status to cancelled", async () => {
      let fetchedInvitation = false
      setMockFromImplementation(() => {
        if (!fetchedInvitation) {
          fetchedInvitation = true
          return createChainableMock({
            data: { id: "inv1", status: "pending" },
            error: null,
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await cancelJudgeInvitation("inv1", "h1")

      expect(result.success).toBe(true)
    })

    it("returns error when invitation does not exist", async () => {
      const chain = createChainableMock({
        data: null,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await cancelJudgeInvitation("inv1", "h1")

      expect(result.success).toBe(false)
      expect(result.error).toBe("Invitation not found or not pending")
    })

    it("returns error when invitation status is already accepted", async () => {
      const chain = createChainableMock({
        data: { id: "inv1", status: "accepted" },
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await cancelJudgeInvitation("inv1", "h1")

      expect(result.success).toBe(false)
    })

    it("returns error when database update fails", async () => {
      let fetchedInvitation = false
      setMockFromImplementation(() => {
        if (!fetchedInvitation) {
          fetchedInvitation = true
          return createChainableMock({
            data: { id: "inv1", status: "pending" },
            error: null,
          })
        }
        return createChainableMock({
          data: null,
          error: { message: "Update failed" },
        })
      })

      const result = await cancelJudgeInvitation("inv1", "h1")

      expect(result.success).toBe(false)
    })
  })

  describe("listJudgeInvitations", () => {
    it("returns all invitations for hackathon", async () => {
      const chain = createChainableMock({
        data: [mockInvitation, { ...mockInvitation, id: "inv2", email: "judge2@example.com" }],
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await listJudgeInvitations("h1")

      expect(result).toHaveLength(2)
    })

    it("filters by status when provided", async () => {
      const chain = createChainableMock({
        data: [mockInvitation],
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await listJudgeInvitations("h1", "pending")

      expect(result).toHaveLength(1)
      expect(result[0].status).toBe("pending")
    })

    it("returns empty array when database query fails", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      setMockFromImplementation(() => chain)

      const result = await listJudgeInvitations("h1")

      expect(result).toEqual([])
    })

    it("returns empty array when no invitations exist", async () => {
      const chain = createChainableMock({
        data: [],
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await listJudgeInvitations("h1")

      expect(result).toEqual([])
    })
  })
})
