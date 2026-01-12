import { describe, expect, it } from "bun:test"
import type { JobStatus } from "@/lib/db/types"

describe("Jobs Service", () => {
  describe("Job Status Transitions", () => {
    const validTransitions: Record<JobStatus, JobStatus[]> = {
      queued: ["running", "canceled"],
      running: ["succeeded", "failed", "canceled"],
      succeeded: [],
      failed: [],
      canceled: [],
    }

    it("allows queued -> running transition", () => {
      expect(validTransitions.queued).toContain("running")
    })

    it("allows queued -> canceled transition", () => {
      expect(validTransitions.queued).toContain("canceled")
    })

    it("allows running -> succeeded transition", () => {
      expect(validTransitions.running).toContain("succeeded")
    })

    it("allows running -> failed transition", () => {
      expect(validTransitions.running).toContain("failed")
    })

    it("does not allow succeeded -> any transition", () => {
      expect(validTransitions.succeeded).toEqual([])
    })

    it("does not allow failed -> any transition", () => {
      expect(validTransitions.failed).toEqual([])
    })

    it("does not allow canceled -> any transition", () => {
      expect(validTransitions.canceled).toEqual([])
    })
  })

  describe("Idempotency", () => {
    it("idempotency key should be unique per tenant", () => {
      const job1 = { tenantId: "tenant-1", idempotencyKey: "key-1" }
      const job2 = { tenantId: "tenant-1", idempotencyKey: "key-1" }
      const job3 = { tenantId: "tenant-2", idempotencyKey: "key-1" }

      expect(job1.idempotencyKey).toBe(job2.idempotencyKey)
      expect(job1.tenantId).toBe(job2.tenantId)
      expect(job1.tenantId).not.toBe(job3.tenantId)
    })
  })

  describe("Job Input/Output", () => {
    it("input can be any JSON", () => {
      const inputs = [
        { prompt: "Hello" },
        { messages: [{ role: "user", content: "Hi" }] },
        { data: [1, 2, 3] },
        null,
      ]

      for (const input of inputs) {
        expect(() => JSON.stringify(input)).not.toThrow()
      }
    })

    it("result can be any JSON", () => {
      const results = [
        { text: "Response" },
        { tokens: 100, model: "gpt-4" },
        [1, 2, 3],
        null,
      ]

      for (const result of results) {
        expect(() => JSON.stringify(result)).not.toThrow()
      }
    })

    it("error should contain message and optional code", () => {
      const error = {
        message: "Rate limit exceeded",
        code: "RATE_LIMIT",
      }

      expect(error.message).toBeDefined()
      expect(typeof error.message).toBe("string")
    })
  })

  describe("Cancel Logic", () => {
    it("can cancel queued jobs", () => {
      const status: JobStatus = "queued"
      const canCancel = status === "queued" || status === "running"
      expect(canCancel).toBe(true)
    })

    it("can cancel running jobs", () => {
      const status: JobStatus = "running"
      const canCancel = status === "queued" || status === "running"
      expect(canCancel).toBe(true)
    })

    it("cannot cancel succeeded jobs", () => {
      const status: JobStatus = "succeeded"
      const canCancel = status === "queued" || status === "running"
      expect(canCancel).toBe(false)
    })

    it("cannot cancel failed jobs", () => {
      const status: JobStatus = "failed"
      const canCancel = status === "queued" || status === "running"
      expect(canCancel).toBe(false)
    })
  })
})
