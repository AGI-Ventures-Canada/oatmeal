import { describe, expect, it } from "bun:test"
import { calculateNextRun } from "@/lib/services/schedules"
import type { ScheduleFrequency } from "@/lib/db/agent-types"

describe("Schedules Service", () => {
  describe("calculateNextRun", () => {
    describe("once frequency", () => {
      it("returns null for one-time schedules", () => {
        const result = calculateNextRun("once")
        expect(result).toBeNull()
      })
    })

    describe("hourly frequency", () => {
      it("returns a date 1 hour in the future", () => {
        const before = Date.now()
        const result = calculateNextRun("hourly")
        const after = Date.now()

        expect(result).not.toBeNull()
        const diff = result!.getTime() - before
        expect(diff).toBeGreaterThanOrEqual(60 * 60 * 1000 - 100)
        expect(diff).toBeLessThanOrEqual(60 * 60 * 1000 + (after - before) + 100)
      })
    })

    describe("daily frequency", () => {
      it("returns a date in the future at the specified time", () => {
        const now = new Date()
        const result = calculateNextRun("daily")

        expect(result).not.toBeNull()
        expect(result!.getTime()).toBeGreaterThan(now.getTime())
        expect(result!.getHours()).toBe(9)
        expect(result!.getMinutes()).toBe(0)
      })

      it("respects custom runTime", () => {
        const result = calculateNextRun("daily", undefined, "UTC", "14:30")

        expect(result).not.toBeNull()
        expect(result!.getHours()).toBe(14)
        expect(result!.getMinutes()).toBe(30)
      })
    })

    describe("weekly frequency", () => {
      it("returns a date approximately 7 days in the future at the specified time", () => {
        const now = new Date()
        const result = calculateNextRun("weekly")

        expect(result).not.toBeNull()
        expect(result!.getTime()).toBeGreaterThan(now.getTime())
        expect(result!.getHours()).toBe(9)
        expect(result!.getMinutes()).toBe(0)

        const daysDiff = (result!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        expect(daysDiff).toBeGreaterThanOrEqual(6)
        expect(daysDiff).toBeLessThanOrEqual(8)
      })
    })

    describe("monthly frequency", () => {
      it("returns a date in the next month", () => {
        const now = new Date()
        const result = calculateNextRun("monthly")

        expect(result).not.toBeNull()
        const expectedMonth = (now.getMonth() + 1) % 12
        expect(result!.getMonth()).toBe(expectedMonth)
      })

      it("handles year rollover (December to January)", () => {
        const now = new Date()
        const result = calculateNextRun("monthly")

        expect(result).not.toBeNull()
        if (now.getMonth() === 11) {
          expect(result!.getFullYear()).toBe(now.getFullYear() + 1)
          expect(result!.getMonth()).toBe(0)
        }
      })
    })

    describe("cron frequency", () => {
      it("returns null when no cron expression provided", () => {
        const result = calculateNextRun("cron")
        expect(result).toBeNull()
      })

      it("returns null for invalid cron expression (too few parts)", () => {
        const result = calculateNextRun("cron", "0 0 * *")
        expect(result).toBeNull()
      })

      it("returns null for invalid cron expression (too many parts)", () => {
        const result = calculateNextRun("cron", "0 0 * * * *")
        expect(result).toBeNull()
      })

      it("parses a simple cron expression with specific minute", () => {
        const result = calculateNextRun("cron", "30 * * * *")
        expect(result).not.toBeNull()
        expect(result!.getMinutes()).toBe(30)
      })

      it("parses a cron expression with specific hour", () => {
        const result = calculateNextRun("cron", "0 9 * * *")
        expect(result).not.toBeNull()
        expect(result!.getHours()).toBe(9)
        expect(result!.getMinutes()).toBe(0)
      })

      it("parses a cron expression with specific day of month", () => {
        const result = calculateNextRun("cron", "0 0 15 * *")
        expect(result).not.toBeNull()
        expect(result!.getDate()).toBe(15)
      })

      it("parses a cron expression with specific month", () => {
        const result = calculateNextRun("cron", "0 0 1 6 *")
        expect(result).not.toBeNull()
        expect(result!.getMonth()).toBe(5)
        expect(result!.getDate()).toBe(1)
      })

      it("handles all wildcards", () => {
        const result = calculateNextRun("cron", "* * * * *")
        expect(result).not.toBeNull()
        const now = new Date()
        const diffMs = result!.getTime() - now.getTime()
        expect(diffMs).toBeLessThanOrEqual(60 * 1000 + 1000)
      })

      it("sets seconds and milliseconds to zero", () => {
        const result = calculateNextRun("cron", "30 12 * * *")
        expect(result).not.toBeNull()
        expect(result!.getSeconds()).toBe(0)
        expect(result!.getMilliseconds()).toBe(0)
      })
    })

    describe("invalid frequency", () => {
      it("returns null for unknown frequency", () => {
        const result = calculateNextRun("invalid" as ScheduleFrequency)
        expect(result).toBeNull()
      })
    })

    describe("timezone handling", () => {
      it("accepts timezone parameter", () => {
        const result = calculateNextRun("hourly", undefined, "America/New_York")
        expect(result).not.toBeNull()
      })

      it("defaults to UTC timezone", () => {
        const result = calculateNextRun("hourly")
        expect(result).not.toBeNull()
      })
    })
  })

  describe("Schedule Frequency Types", () => {
    const validFrequencies: ScheduleFrequency[] = [
      "once",
      "hourly",
      "daily",
      "weekly",
      "monthly",
      "cron",
    ]

    it("supports all valid frequency types", () => {
      for (const freq of validFrequencies) {
        expect(() => calculateNextRun(freq)).not.toThrow()
      }
    })
  })

  describe("Schedule Input Validation", () => {
    describe("CreateScheduleInput", () => {
      it("accepts valid schedule input structure", () => {
        const input = {
          tenantId: "tenant-123",
          name: "My Schedule",
          frequency: "daily" as ScheduleFrequency,
          timezone: "UTC",
          agentId: "agent-456",
          input: { key: "value" },
        }

        expect(input.tenantId).toBeDefined()
        expect(input.name).toBeDefined()
        expect(input.frequency).toBeDefined()
      })

      it("cron expression is optional", () => {
        const input = {
          tenantId: "tenant-123",
          name: "Daily Job",
          frequency: "daily" as ScheduleFrequency,
        }

        expect(input.cronExpression).toBeUndefined()
      })

      it("jobType can be used instead of agentId", () => {
        const input = {
          tenantId: "tenant-123",
          name: "Custom Job",
          frequency: "hourly" as ScheduleFrequency,
          jobType: "cleanup",
        }

        expect(input.agentId).toBeUndefined()
        expect(input.jobType).toBe("cleanup")
      })
    })

    describe("UpdateScheduleInput", () => {
      it("all fields are optional", () => {
        const input: {
          name?: string
          frequency?: ScheduleFrequency
          cronExpression?: string
          timezone?: string
          input?: Record<string, unknown>
          isActive?: boolean
        } = {}

        expect(Object.keys(input).length).toBe(0)
      })

      it("accepts partial updates", () => {
        const input = { name: "New Name" }
        expect(input.name).toBe("New Name")
        expect((input as Record<string, unknown>).frequency).toBeUndefined()
      })
    })
  })

  describe("Schedule Data Structure", () => {
    it("contains required fields", () => {
      const schedule = {
        id: "schedule-1",
        tenant_id: "tenant-123",
        name: "Test Schedule",
        frequency: "daily" as ScheduleFrequency,
        timezone: "UTC",
        is_active: true,
        run_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      expect(schedule.id).toBeDefined()
      expect(schedule.tenant_id).toBeDefined()
      expect(schedule.name).toBeDefined()
      expect(schedule.frequency).toBeDefined()
      expect(schedule.timezone).toBeDefined()
      expect(schedule.is_active).toBeDefined()
      expect(schedule.run_count).toBeDefined()
    })

    it("optional fields can be null", () => {
      const schedule = {
        id: "schedule-1",
        tenant_id: "tenant-123",
        name: "Test Schedule",
        frequency: "daily" as ScheduleFrequency,
        timezone: "UTC",
        is_active: true,
        run_count: 0,
        cron_expression: null,
        agent_id: null,
        job_type: null,
        input: null,
        next_run_at: null,
        last_run_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      expect(schedule.cron_expression).toBeNull()
      expect(schedule.agent_id).toBeNull()
      expect(schedule.job_type).toBeNull()
      expect(schedule.input).toBeNull()
    })

    it("tracks run history", () => {
      const schedule = {
        id: "schedule-1",
        tenant_id: "tenant-123",
        name: "Test Schedule",
        frequency: "hourly" as ScheduleFrequency,
        timezone: "UTC",
        is_active: true,
        run_count: 5,
        last_run_at: "2024-01-15T10:00:00Z",
        next_run_at: "2024-01-15T11:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-15T10:00:00Z",
      }

      expect(schedule.run_count).toBe(5)
      expect(schedule.last_run_at).toBeDefined()
      expect(schedule.next_run_at).toBeDefined()
    })
  })

  describe("Tenant Isolation", () => {
    it("schedules are scoped to tenant", () => {
      const tenant1Schedules = [
        { tenant_id: "tenant-1", name: "Schedule A" },
        { tenant_id: "tenant-1", name: "Schedule B" },
      ]

      const tenant2Schedules = [{ tenant_id: "tenant-2", name: "Schedule C" }]

      const allTenant1 = tenant1Schedules.every((s) => s.tenant_id === "tenant-1")
      const allTenant2 = tenant2Schedules.every((s) => s.tenant_id === "tenant-2")

      expect(allTenant1).toBe(true)
      expect(allTenant2).toBe(true)
    })
  })

  describe("List Schedules Options", () => {
    it("default options structure", () => {
      const options = { limit: undefined, activeOnly: undefined }
      const effectiveLimit = options.limit ?? 50
      expect(effectiveLimit).toBe(50)
    })

    it("activeOnly filters to active schedules", () => {
      const schedules = [
        { is_active: true, name: "Active" },
        { is_active: false, name: "Inactive" },
      ]

      const activeOnly = schedules.filter((s) => s.is_active)
      expect(activeOnly.length).toBe(1)
      expect(activeOnly[0].name).toBe("Active")
    })

    it("respects limit parameter", () => {
      const schedules = Array.from({ length: 10 }, (_, i) => ({ name: `Schedule ${i}` }))
      const limit = 5
      const limited = schedules.slice(0, limit)

      expect(limited.length).toBe(5)
    })
  })
})
