import { describe, it, expect, beforeEach } from "bun:test"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
} from "../lib/supabase-mock"

const { listSponsorFulfillments, markSponsorFulfilled } = await import("@/lib/services/sponsor-fulfillments")

describe("Sponsor Fulfillments Service", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  describe("listSponsorFulfillments", () => {
    it("returns empty array when sponsor not found", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: null, error: { message: "Not found" } })
      )

      const result = await listSponsorFulfillments("tenant-1", "hack-1")
      expect(result).toEqual([])
    })

    it("returns empty array when no tracks linked to sponsor", async () => {
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        if (callCount === 1) {
          return createChainableMock({ data: { id: "sponsor-1" }, error: null })
        }
        return createChainableMock({ data: [], error: null })
      })

      const result = await listSponsorFulfillments("tenant-1", "hack-1")
      expect(result).toEqual([])
    })

    it("returns empty array when no prizes in sponsor tracks", async () => {
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        if (callCount === 1) {
          return createChainableMock({ data: { id: "sponsor-1" }, error: null })
        }
        if (callCount === 2) {
          return createChainableMock({ data: [{ id: "track-1" }], error: null })
        }
        return createChainableMock({ data: [], error: null })
      })

      const result = await listSponsorFulfillments("tenant-1", "hack-1")
      expect(result).toEqual([])
    })
  })

  describe("markSponsorFulfilled", () => {
    it("returns false when sponsor not found", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: null, error: { message: "Not found" } })
      )

      const result = await markSponsorFulfilled("tenant-1", "hack-1", "fulfill-1")
      expect(result).toBe(false)
    })

    it("returns false when fulfillment not found", async () => {
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        if (callCount === 1) {
          return createChainableMock({ data: { id: "sponsor-1" }, error: null })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await markSponsorFulfilled("tenant-1", "hack-1", "fulfill-1")
      expect(result).toBe(false)
    })

    it("returns false when prize has no track", async () => {
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        if (callCount === 1) {
          return createChainableMock({ data: { id: "sponsor-1" }, error: null })
        }
        if (callCount === 2) {
          return createChainableMock({
            data: {
              id: "fulfill-1",
              status: "claimed",
              prize_assignment: { prize: { prize_track_id: null } },
            },
            error: null,
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await markSponsorFulfilled("tenant-1", "hack-1", "fulfill-1")
      expect(result).toBe(false)
    })

    it("returns false when track belongs to a different sponsor", async () => {
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        if (callCount === 1) {
          return createChainableMock({ data: { id: "sponsor-1" }, error: null })
        }
        if (callCount === 2) {
          return createChainableMock({
            data: {
              id: "fulfill-1",
              status: "claimed",
              prize_assignment: { prize: { prize_track_id: "track-1" } },
            },
            error: null,
          })
        }
        if (callCount === 3) {
          return createChainableMock({
            data: { sponsor_id: "different-sponsor" },
            error: null,
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await markSponsorFulfilled("tenant-1", "hack-1", "fulfill-1")
      expect(result).toBe(false)
    })

    it("returns false when fulfillment is not in claimed status", async () => {
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        if (callCount === 1) {
          return createChainableMock({ data: { id: "sponsor-1" }, error: null })
        }
        if (callCount === 2) {
          return createChainableMock({
            data: {
              id: "fulfill-1",
              status: "assigned",
              prize_assignment: { prize: { prize_track_id: "track-1" } },
            },
            error: null,
          })
        }
        if (callCount === 3) {
          return createChainableMock({
            data: { sponsor_id: "sponsor-1" },
            error: null,
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const result = await markSponsorFulfilled("tenant-1", "hack-1", "fulfill-1")
      expect(result).toBe(false)
    })
  })
})
