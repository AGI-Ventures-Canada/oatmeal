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
})
