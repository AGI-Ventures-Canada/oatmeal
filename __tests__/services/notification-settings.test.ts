import { describe, expect, it, beforeEach } from "bun:test"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
} from "../lib/supabase-mock"

const { getNotificationSettings, upsertNotificationSettings } = await import(
  "@/lib/services/notification-settings"
)

describe("Notification Settings Service", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  describe("getNotificationSettings", () => {
    it("returns stored settings when they exist", async () => {
      const settings = {
        hackathon_id: "h1",
        email_on_registration_open: false,
        email_on_hackathon_active: true,
        email_on_judging_started: true,
        email_on_results_published: false,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      }

      setMockFromImplementation(() =>
        createChainableMock({ data: settings, error: null })
      )

      const result = await getNotificationSettings("h1")

      expect(result.hackathon_id).toBe("h1")
      expect(result.email_on_registration_open).toBe(false)
      expect(result.email_on_results_published).toBe(false)
    })

    it("returns all-true defaults when no settings exist", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: null, error: { message: "No rows" } })
      )

      const result = await getNotificationSettings("h1")

      expect(result.hackathon_id).toBe("h1")
      expect(result.email_on_registration_open).toBe(true)
      expect(result.email_on_hackathon_active).toBe(true)
      expect(result.email_on_judging_started).toBe(true)
      expect(result.email_on_results_published).toBe(true)
    })
  })

  describe("upsertNotificationSettings", () => {
    it("upserts settings and returns result", async () => {
      const upserted = {
        hackathon_id: "h1",
        email_on_registration_open: false,
        email_on_hackathon_active: true,
        email_on_judging_started: true,
        email_on_results_published: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-04-01T00:00:00Z",
      }

      setMockFromImplementation(() =>
        createChainableMock({ data: upserted, error: null })
      )

      const result = await upsertNotificationSettings("h1", {
        email_on_registration_open: false,
      })

      expect(result).not.toBeNull()
      expect(result!.email_on_registration_open).toBe(false)
    })

    it("returns null on error", async () => {
      setMockFromImplementation(() =>
        createChainableMock({ data: null, error: { message: "DB error" } })
      )

      const result = await upsertNotificationSettings("h1", {
        email_on_registration_open: false,
      })

      expect(result).toBeNull()
    })
  })
})
