import { describe, it, expect, beforeEach } from "bun:test"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
} from "../lib/supabase-mock"

const {
  getPhasesForStatus,
  getPhaseLabel,
  validatePhaseTransition,
  setPhase,
  getPhase,
} = await import("@/lib/services/phases")

describe("Phases Service", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  describe("getPhasesForStatus", () => {
    it("returns build and submission_open for active status", () => {
      const phases = getPhasesForStatus("active")
      expect(phases).toEqual(["build", "submission_open"])
    })

    it("returns judging phases for judging status", () => {
      const phases = getPhasesForStatus("judging")
      expect(phases).toEqual(["preliminaries", "finals", "results_pending"])
    })

    it("returns empty array for statuses without phases", () => {
      expect(getPhasesForStatus("draft")).toEqual([])
      expect(getPhasesForStatus("published")).toEqual([])
      expect(getPhasesForStatus("registration_open")).toEqual([])
      expect(getPhasesForStatus("completed")).toEqual([])
      expect(getPhasesForStatus("archived")).toEqual([])
    })
  })

  describe("getPhaseLabel", () => {
    it("returns correct labels for all phases", () => {
      expect(getPhaseLabel("build")).toBe("Building")
      expect(getPhaseLabel("submission_open")).toBe("Submissions Open")
      expect(getPhaseLabel("preliminaries")).toBe("Preliminary Judging")
      expect(getPhaseLabel("finals")).toBe("Grand Finals")
      expect(getPhaseLabel("results_pending")).toBe("Results Pending")
    })
  })

  describe("validatePhaseTransition", () => {
    it("allows valid forward transitions within active status", () => {
      const error = validatePhaseTransition("active", "build", "submission_open")
      expect(error).toBeNull()
    })

    it("allows valid forward transitions within judging status", () => {
      expect(validatePhaseTransition("judging", "preliminaries", "finals")).toBeNull()
      expect(validatePhaseTransition("judging", "finals", "results_pending")).toBeNull()
    })

    it("allows backward transitions", () => {
      expect(validatePhaseTransition("active", "submission_open", "build")).toBeNull()
      expect(validatePhaseTransition("judging", "finals", "preliminaries")).toBeNull()
    })

    it("rejects phases not valid for the given status", () => {
      const error = validatePhaseTransition("active", null, "preliminaries")
      expect(error).toContain("not valid for status")
      expect(error).toContain("active")
    })

    it("returns error for statuses that don't support phases", () => {
      const error = validatePhaseTransition("draft", null, "build")
      expect(error).toContain("not available for status")
    })

    it("allows transition from null phase", () => {
      expect(validatePhaseTransition("active", null, "build")).toBeNull()
      expect(validatePhaseTransition("judging", null, "preliminaries")).toBeNull()
    })
  })

  describe("setPhase", () => {
    const hackathonId = "11111111-1111-1111-1111-111111111111"
    const tenantId = "tenant-123"

    it("sets phase successfully", async () => {
      const selectChain = createChainableMock({
        data: { status: "active", phase: "build", tenant_id: tenantId },
        error: null,
      })
      const updateChain = createChainableMock({ data: null, error: null })

      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        return callCount === 1 ? selectChain : updateChain
      })

      const result = await setPhase(hackathonId, tenantId, "submission_open")
      expect(result).toEqual({ success: true })
    })

    it("returns error when hackathon not found", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: null, error: { message: "Not found" } })
      )

      const result = await setPhase(hackathonId, tenantId, "build")
      expect(result).toEqual({ error: "Hackathon not found" })
    })

    it("returns error when tenant does not match", async () => {
      setMockFromImplementation(() =>
        createChainableMock({
          data: { status: "active", phase: null, tenant_id: "other-tenant" },
          error: null,
        })
      )

      const result = await setPhase(hackathonId, tenantId, "build")
      expect(result).toEqual({ error: "Unauthorized" })
    })

    it("returns error for invalid phase transition", async () => {
      setMockFromImplementation(() =>
        createChainableMock({
          data: { status: "active", phase: null, tenant_id: tenantId },
          error: null,
        })
      )

      const result = await setPhase(hackathonId, tenantId, "preliminaries")
      expect(result).toHaveProperty("error")
      expect((result as { error: string }).error).toContain("not valid for status")
    })

    it("returns error when update fails", async () => {
      const selectChain = createChainableMock({
        data: { status: "active", phase: null, tenant_id: tenantId },
        error: null,
      })
      const updateChain = createChainableMock({
        data: null,
        error: { message: "Update failed" },
      })

      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        return callCount === 1 ? selectChain : updateChain
      })

      const result = await setPhase(hackathonId, tenantId, "build")
      expect(result).toEqual({ error: "Failed to update phase" })
    })
  })

  describe("getPhase", () => {
    const hackathonId = "11111111-1111-1111-1111-111111111111"

    it("returns the current phase", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: { phase: "build" }, error: null })
      )

      const phase = await getPhase(hackathonId)
      expect(phase).toBe("build")
    })

    it("returns null when hackathon not found", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: null, error: { message: "Not found" } })
      )

      const phase = await getPhase(hackathonId)
      expect(phase).toBeNull()
    })

    it("returns null when phase is not set", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: { phase: null }, error: null })
      )

      const phase = await getPhase(hackathonId)
      expect(phase).toBeNull()
    })
  })
})
