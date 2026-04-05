import { describe, it, expect, beforeEach } from "bun:test"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
} from "../lib/supabase-mock"

const { listSponsorFulfillments } = await import("@/lib/services/sponsor-fulfillments")

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
})
