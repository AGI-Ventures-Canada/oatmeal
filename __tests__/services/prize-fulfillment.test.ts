import { describe, it, expect, beforeEach } from "bun:test"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
  mockMultiTableQuery,
  mockSuccess,
  mockError,
} from "../lib/supabase-mock"

const {
  initializeFulfillments,
  listFulfillments,
  updateFulfillmentStatus,
  getFulfillmentSummary,
  getClaimByToken,
  claimPrize,
  getClaimTokensForHackathon,
} = await import("@/lib/services/prize-fulfillment")

describe("Prize Fulfillment Service", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  describe("initializeFulfillments", () => {
    it("returns 0 when no prizes exist", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: [], error: null })
      )

      const count = await initializeFulfillments("11111111-1111-1111-1111-111111111111")
      expect(count).toBe(0)
    })

    it("returns 0 when no assignments exist", async () => {
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        if (callCount === 1) {
          return createChainableMock({ data: [{ id: "p1" }], error: null })
        }
        return createChainableMock({ data: [], error: null })
      })

      const count = await initializeFulfillments("11111111-1111-1111-1111-111111111111")
      expect(count).toBe(0)
    })

    it("creates fulfillments for new assignments", async () => {
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        if (callCount === 1) {
          return createChainableMock({ data: [{ id: "p1" }], error: null })
        }
        if (callCount === 2) {
          return createChainableMock({ data: [{ id: "a1" }, { id: "a2" }], error: null })
        }
        if (callCount === 3) {
          return createChainableMock({ data: [], error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const count = await initializeFulfillments("11111111-1111-1111-1111-111111111111")
      expect(count).toBe(2)
    })

    it("skips already-initialized assignments", async () => {
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        if (callCount === 1) {
          return createChainableMock({ data: [{ id: "p1" }], error: null })
        }
        if (callCount === 2) {
          return createChainableMock({ data: [{ id: "a1" }, { id: "a2" }], error: null })
        }
        if (callCount === 3) {
          return createChainableMock({ data: [{ prize_assignment_id: "a1" }], error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const count = await initializeFulfillments("11111111-1111-1111-1111-111111111111")
      expect(count).toBe(1)
    })

    it("returns 0 on insert error", async () => {
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        if (callCount === 1) {
          return createChainableMock({ data: [{ id: "p1" }], error: null })
        }
        if (callCount === 2) {
          return createChainableMock({ data: [{ id: "a1" }], error: null })
        }
        if (callCount === 3) {
          return createChainableMock({ data: [], error: null })
        }
        return createChainableMock({ data: null, error: { message: "insert failed" } })
      })

      const count = await initializeFulfillments("11111111-1111-1111-1111-111111111111")
      expect(count).toBe(0)
    })
  })

  describe("updateFulfillmentStatus", () => {
    it("returns null when fulfillment not found", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: null, error: null })
      )

      const result = await updateFulfillmentStatus(
        "11111111-1111-1111-1111-111111111111",
        "22222222-2222-2222-2222-222222222222",
        "contacted"
      )
      expect(result).toBeNull()
    })

    it("returns null on invalid transition", async () => {
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        if (callCount === 1) {
          return createChainableMock({ data: { status: "claimed" }, error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await updateFulfillmentStatus(
        "11111111-1111-1111-1111-111111111111",
        "22222222-2222-2222-2222-222222222222",
        "contacted"
      )
      expect(result).toBeNull()
    })

    it("updates status with valid transition", async () => {
      let callCount = 0
      const updatedData = {
        id: "11111111-1111-1111-1111-111111111111",
        status: "contacted",
        contacted_at: new Date().toISOString(),
      }
      setMockFromImplementation(() => {
        callCount++
        if (callCount === 1) {
          return createChainableMock({ data: { status: "assigned" }, error: null })
        }
        return createChainableMock({ data: updatedData, error: null })
      })

      const result = await updateFulfillmentStatus(
        "11111111-1111-1111-1111-111111111111",
        "22222222-2222-2222-2222-222222222222",
        "contacted",
        { notes: "Sent email" }
      )
      expect(result).not.toBeNull()
      expect(result!.status).toBe("contacted")
    })

    it("allows skipping statuses (assigned -> shipped)", async () => {
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        if (callCount === 1) {
          return createChainableMock({ data: { status: "assigned" }, error: null })
        }
        return createChainableMock({
          data: { id: "f1", status: "shipped" },
          error: null,
        })
      })

      const result = await updateFulfillmentStatus(
        "11111111-1111-1111-1111-111111111111",
        "22222222-2222-2222-2222-222222222222",
        "shipped"
      )
      expect(result).not.toBeNull()
      expect(result!.status).toBe("shipped")
    })
  })

  describe("getFulfillmentSummary", () => {
    it("returns zero counts when no fulfillments", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: [], error: null })
      )

      const summary = await getFulfillmentSummary("11111111-1111-1111-1111-111111111111")
      expect(summary).toEqual({ assigned: 0, contacted: 0, shipped: 0, claimed: 0 })
    })

    it("counts fulfillments by status", async () => {
      setMockFromImplementation(() =>
        createChainableMock({
          data: [
            { status: "assigned" },
            { status: "assigned" },
            { status: "contacted" },
            { status: "shipped" },
            { status: "claimed" },
            { status: "claimed" },
          ],
          error: null,
        })
      )

      const summary = await getFulfillmentSummary("11111111-1111-1111-1111-111111111111")
      expect(summary).toEqual({ assigned: 2, contacted: 1, shipped: 1, claimed: 2 })
    })

    it("returns zero counts on error", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: null, error: { message: "DB error" } })
      )

      const summary = await getFulfillmentSummary("11111111-1111-1111-1111-111111111111")
      expect(summary).toEqual({ assigned: 0, contacted: 0, shipped: 0, claimed: 0 })
    })
  })

  describe("listFulfillments", () => {
    it("returns empty array when no fulfillments", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: [], error: null })
      )

      const result = await listFulfillments("11111111-1111-1111-1111-111111111111")
      expect(result).toEqual([])
    })

    it("returns empty array on error", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: null, error: { message: "DB error" } })
      )

      const result = await listFulfillments("11111111-1111-1111-1111-111111111111")
      expect(result).toEqual([])
    })
  })

  describe("getClaimByToken", () => {
    it("returns null when token not found", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: null, error: { message: "Not found" } })
      )

      const result = await getClaimByToken("invalid-token")
      expect(result).toBeNull()
    })

    it("returns claim details for valid token", async () => {
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        if (callCount === 1) {
          return createChainableMock({
            data: {
              id: "f1",
              status: "assigned",
              recipient_name: null,
              recipient_email: null,
              shipping_address: null,
              claimed_at: null,
              claim_token_expires_at: "2026-05-01T00:00:00Z",
              prize_assignment: {
                prize: { name: "Best Demo", value: "$500" },
                submission: { title: "Cool Project", team_id: "t1", hackathon_id: "h1" },
              },
            },
            error: null,
          })
        }
        if (callCount === 2) {
          return createChainableMock({
            data: { name: "Test Hackathon", slug: "test-hack" },
            error: null,
          })
        }
        return createChainableMock({
          data: { name: "Team Alpha" },
          error: null,
        })
      })

      const result = await getClaimByToken("valid-token")
      expect(result).not.toBeNull()
      expect(result!.prizeName).toBe("Best Demo")
      expect(result!.prizeValue).toBe("$500")
      expect(result!.hackathonName).toBe("Test Hackathon")
      expect(result!.submissionTitle).toBe("Cool Project")
      expect(result!.teamName).toBe("Team Alpha")
      expect(result!.status).toBe("assigned")
    })
  })

  describe("claimPrize", () => {
    it("returns not_found when token does not exist", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: null, error: { message: "Not found" } })
      )

      const result = await claimPrize("bad-token", {
        recipientName: "Alice",
        recipientEmail: "alice@test.com",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe("not_found")
      }
    })

    it("returns expired when token is past expiry", async () => {
      setMockFromImplementation(() =>
        createChainableMock({
          data: {
            id: "f1",
            status: "assigned",
            hackathon_id: "h1",
            claim_token_expires_at: "2020-01-01T00:00:00Z",
          },
          error: null,
        })
      )

      const result = await claimPrize("expired-token", {
        recipientName: "Alice",
        recipientEmail: "alice@test.com",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe("expired")
      }
    })

    it("returns already_claimed when prize is already claimed", async () => {
      setMockFromImplementation(() =>
        createChainableMock({
          data: {
            id: "f1",
            status: "claimed",
            hackathon_id: "h1",
            claim_token_expires_at: "2027-01-01T00:00:00Z",
          },
          error: null,
        })
      )

      const result = await claimPrize("claimed-token", {
        recipientName: "Alice",
        recipientEmail: "alice@test.com",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe("already_claimed")
      }
    })

    it("successfully claims a prize", async () => {
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        if (callCount === 1) {
          return createChainableMock({
            data: {
              id: "f1",
              status: "assigned",
              hackathon_id: "h1",
              claim_token_expires_at: "2027-01-01T00:00:00Z",
            },
            error: null,
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await claimPrize("valid-token", {
        recipientName: "Alice",
        recipientEmail: "alice@test.com",
        shippingAddress: "123 Main St",
      })
      expect(result.success).toBe(true)
    })

    it("returns update_failed on database error", async () => {
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        if (callCount === 1) {
          return createChainableMock({
            data: {
              id: "f1",
              status: "assigned",
              hackathon_id: "h1",
              claim_token_expires_at: "2027-01-01T00:00:00Z",
            },
            error: null,
          })
        }
        return createChainableMock({ data: null, error: { message: "DB error" } })
      })

      const result = await claimPrize("valid-token", {
        recipientName: "Alice",
        recipientEmail: "alice@test.com",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe("update_failed")
      }
    })
  })

  describe("getClaimTokensForHackathon", () => {
    it("returns empty object when no tokens exist", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: [], error: null })
      )

      const result = await getClaimTokensForHackathon("11111111-1111-1111-1111-111111111111")
      expect(result).toEqual({})
    })

    it("returns token map indexed by prize_assignment_id", async () => {
      setMockFromImplementation(() =>
        createChainableMock({
          data: [
            { prize_assignment_id: "a1", claim_token: "tok-1" },
            { prize_assignment_id: "a2", claim_token: "tok-2" },
          ],
          error: null,
        })
      )

      const result = await getClaimTokensForHackathon("11111111-1111-1111-1111-111111111111")
      expect(result).toEqual({ a1: "tok-1", a2: "tok-2" })
    })

    it("returns empty object on error", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: null, error: { message: "DB error" } })
      )

      const result = await getClaimTokensForHackathon("11111111-1111-1111-1111-111111111111")
      expect(result).toEqual({})
    })
  })
})
