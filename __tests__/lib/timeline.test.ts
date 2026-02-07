import { describe, expect, it, beforeEach, afterEach } from "bun:test"
import { getTimelineState } from "@/lib/utils/timeline"
import type { HackathonStatus } from "@/lib/db/hackathon-types"

describe("getTimelineState", () => {
  let originalDate: typeof Date

  beforeEach(() => {
    originalDate = globalThis.Date
  })

  afterEach(() => {
    globalThis.Date = originalDate
  })

  function mockDate(isoString: string) {
    const mockNow = new Date(isoString).getTime()
    globalThis.Date = class extends originalDate {
      constructor(...args: Parameters<typeof Date>) {
        if (args.length === 0) {
          super(mockNow)
        } else {
          // @ts-expect-error - spreading args
          super(...args)
        }
      }
      static now() {
        return mockNow
      }
    } as typeof Date
  }

  describe("status-based states", () => {
    it("returns Completed for completed status", () => {
      const result = getTimelineState({ status: "completed" })
      expect(result).toEqual({ label: "Completed", variant: "outline" })
    })

    it("returns Judging for judging status", () => {
      const result = getTimelineState({ status: "judging" })
      expect(result).toEqual({ label: "Judging", variant: "default" })
    })

    it("returns Live for active status", () => {
      const result = getTimelineState({ status: "active" })
      expect(result).toEqual({ label: "Live", variant: "default" })
    })

    it("returns Draft for draft status", () => {
      const result = getTimelineState({ status: "draft" })
      expect(result).toEqual({ label: "Draft", variant: "secondary" })
    })

    it("returns Archived for archived status", () => {
      const result = getTimelineState({ status: "archived" })
      expect(result).toEqual({ label: "Archived", variant: "outline" })
    })
  })

  describe("date-based states for published status", () => {
    const baseHackathon = {
      status: "published" as HackathonStatus,
      registration_opens_at: "2026-02-01T00:00:00Z",
      registration_closes_at: "2026-02-15T00:00:00Z",
      starts_at: "2026-03-01T00:00:00Z",
      ends_at: "2026-03-02T00:00:00Z",
    }

    it("returns Coming Soon before registration opens", () => {
      mockDate("2026-01-15T00:00:00Z")
      const result = getTimelineState(baseHackathon)
      expect(result).toEqual({ label: "Coming Soon", variant: "secondary" })
    })

    it("returns Registration Open during registration period", () => {
      mockDate("2026-02-10T00:00:00Z")
      const result = getTimelineState(baseHackathon)
      expect(result).toEqual({ label: "Registration Open", variant: "default" })
    })

    it("returns Registration Closed after registration closes but before event starts", () => {
      mockDate("2026-02-20T00:00:00Z")
      const result = getTimelineState(baseHackathon)
      expect(result).toEqual({ label: "Registration Closed", variant: "secondary" })
    })

    it("returns Live during event", () => {
      mockDate("2026-03-01T12:00:00Z")
      const result = getTimelineState(baseHackathon)
      expect(result).toEqual({ label: "Live", variant: "default" })
    })

    it("returns Completed after event ends", () => {
      mockDate("2026-03-03T00:00:00Z")
      const result = getTimelineState(baseHackathon)
      expect(result).toEqual({ label: "Completed", variant: "outline" })
    })
  })

  describe("registration_open status fallback", () => {
    it("returns Registration Open for registration_open status without dates", () => {
      const result = getTimelineState({
        status: "registration_open",
        registration_opens_at: null,
        registration_closes_at: null,
      })
      expect(result).toEqual({ label: "Registration Open", variant: "default" })
    })
  })

  describe("default fallback", () => {
    it("returns Coming Soon for published status without dates", () => {
      const result = getTimelineState({
        status: "published",
        registration_opens_at: null,
        registration_closes_at: null,
      })
      expect(result).toEqual({ label: "Coming Soon", variant: "secondary" })
    })
  })
})
