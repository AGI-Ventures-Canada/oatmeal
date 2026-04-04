import { describe, it, expect, beforeEach } from "bun:test"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
} from "../lib/supabase-mock"

const {
  schedulePostEventReminders,
  listReminders,
  getReminderById,
  cancelReminder,
  getPendingReminders,
  markReminderSent,
} = await import("@/lib/services/post-event-reminders")

describe("Post-Event Reminders Service", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  describe("schedulePostEventReminders", () => {
    it("returns 0 when hackathon not found", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: null, error: null })
      )

      const count = await schedulePostEventReminders("11111111-1111-1111-1111-111111111111")
      expect(count).toBe(0)
    })

    it("schedules reminders for a hackathon", async () => {
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        if (callCount === 1) {
          return createChainableMock({
            data: {
              id: "11111111-1111-1111-1111-111111111111",
              name: "Test Hack",
              slug: "test-hack",
              feedback_survey_sent_at: null,
              feedback_survey_url: null,
            },
            error: null,
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const count = await schedulePostEventReminders("11111111-1111-1111-1111-111111111111")
      expect(count).toBe(2)
    })

    it("schedules feedback followup when survey URL exists", async () => {
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        if (callCount === 1) {
          return createChainableMock({
            data: {
              id: "11111111-1111-1111-1111-111111111111",
              name: "Test Hack",
              slug: "test-hack",
              feedback_survey_sent_at: null,
              feedback_survey_url: "https://forms.google.com/test",
            },
            error: null,
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const count = await schedulePostEventReminders("11111111-1111-1111-1111-111111111111")
      expect(count).toBe(3)
    })

    it("skips feedback followup when survey already sent", async () => {
      let callCount = 0
      setMockFromImplementation(() => {
        callCount++
        if (callCount === 1) {
          return createChainableMock({
            data: {
              id: "11111111-1111-1111-1111-111111111111",
              name: "Test Hack",
              slug: "test-hack",
              feedback_survey_sent_at: "2026-01-01T00:00:00Z",
              feedback_survey_url: "https://forms.google.com/test",
            },
            error: null,
          })
        }
        return createChainableMock({ data: null, error: null })
      })

      const count = await schedulePostEventReminders("11111111-1111-1111-1111-111111111111")
      expect(count).toBe(2)
    })
  })

  describe("listReminders", () => {
    it("returns empty array when no reminders", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: [], error: null })
      )

      const result = await listReminders("11111111-1111-1111-1111-111111111111")
      expect(result).toEqual([])
    })

    it("returns reminders on success", async () => {
      const mockReminders = [
        {
          id: "r1",
          hackathon_id: "h1",
          type: "prize_claim",
          scheduled_for: "2026-04-06T00:00:00Z",
          sent_at: null,
          cancelled_at: null,
          recipient_filter: "winners",
          metadata: {},
          created_at: "2026-04-03T00:00:00Z",
        },
      ]
      setMockFromImplementation(() =>
        createChainableMock({ data: mockReminders, error: null })
      )

      const result = await listReminders("11111111-1111-1111-1111-111111111111")
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe("prize_claim")
    })

    it("returns empty array on error", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: null, error: { message: "DB error" } })
      )

      const result = await listReminders("11111111-1111-1111-1111-111111111111")
      expect(result).toEqual([])
    })
  })

  describe("getReminderById", () => {
    it("returns reminder when found", async () => {
      const mockReminder = {
        id: "r1",
        hackathon_id: "h1",
        type: "prize_claim",
        scheduled_for: "2026-04-06T00:00:00Z",
        sent_at: null,
        cancelled_at: null,
        recipient_filter: "winners",
        metadata: {},
        created_at: "2026-04-03T00:00:00Z",
      }
      setMockFromImplementation(() =>
        createChainableMock({ data: mockReminder, error: null })
      )

      const result = await getReminderById("r1", "h1")
      expect(result).not.toBeNull()
      expect(result!.type).toBe("prize_claim")
    })

    it("returns null when not found", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: null, error: { message: "Not found" } })
      )

      const result = await getReminderById("r1", "h1")
      expect(result).toBeNull()
    })
  })

  describe("cancelReminder", () => {
    it("cancels a pending reminder", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: [{ id: "r1" }], error: null })
      )

      const result = await cancelReminder("r1", "h1")
      expect(result).toBe(true)
    })

    it("returns false when no rows matched", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: [], error: null })
      )

      const result = await cancelReminder("r1", "h1")
      expect(result).toBe(false)
    })

    it("returns false on error", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: null, error: { message: "DB error" } })
      )

      const result = await cancelReminder("r1", "h1")
      expect(result).toBe(false)
    })
  })

  describe("getPendingReminders", () => {
    it("returns empty array when no pending reminders", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: [], error: null })
      )

      const result = await getPendingReminders()
      expect(result).toEqual([])
    })

    it("returns pending reminders", async () => {
      const mockData = [
        {
          id: "r1",
          hackathon_id: "h1",
          type: "prize_claim",
          scheduled_for: "2026-04-01T00:00:00Z",
          sent_at: null,
          cancelled_at: null,
          recipient_filter: "winners",
          metadata: {},
          created_at: "2026-03-29T00:00:00Z",
        },
      ]
      setMockFromImplementation(() =>
        createChainableMock({ data: mockData, error: null })
      )

      const result = await getPendingReminders()
      expect(result).toHaveLength(1)
    })
  })

  describe("markReminderSent", () => {
    it("marks a reminder as sent", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: null, error: null })
      )

      await markReminderSent("r1")
    })
  })
})
