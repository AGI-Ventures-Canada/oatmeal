import { describe, expect, it, mock, beforeEach } from "bun:test"
import { resetClerkMocks } from "../lib/supabase-mock"

const mockLogAudit = mock(() => Promise.resolve(null))

mock.module("@/lib/services/audit", () => ({
  logAudit: mockLogAudit,
}))

const mockListFulfillments = mock(() => Promise.resolve([]))
const mockGetFulfillmentSummary = mock(() =>
  Promise.resolve({ assigned: 0, contacted: 0, shipped: 0, claimed: 0 })
)
const mockInitializeFulfillments = mock(() => Promise.resolve(0))
const mockUpdateFulfillmentStatus = mock(() => Promise.resolve(null))

mock.module("@/lib/services/prize-fulfillment", () => ({
  listFulfillments: mockListFulfillments,
  getFulfillmentSummary: mockGetFulfillmentSummary,
  initializeFulfillments: mockInitializeFulfillments,
  updateFulfillmentStatus: mockUpdateFulfillmentStatus,
}))

const mockSendFeedbackSurveyEmails = mock(() =>
  Promise.resolve({ sent: 0, failed: 0 })
)

mock.module("@/lib/email/feedback-survey", () => ({
  sendFeedbackSurveyEmails: mockSendFeedbackSurveyEmails,
}))

const mockListReminders = mock(() => Promise.resolve([]))
const mockGetReminderById = mock(() => Promise.resolve(null))
const mockCancelReminder = mock(() => Promise.resolve(true))
const mockProcessReminder = mock(() => Promise.resolve(0))

mock.module("@/lib/services/post-event-reminders", () => ({
  listReminders: mockListReminders,
  getReminderById: mockGetReminderById,
  cancelReminder: mockCancelReminder,
  processReminder: mockProcessReminder,
  schedulePostEventReminders: mock(() => Promise.resolve(0)),
  getPendingReminders: mock(() => Promise.resolve([])),
  markReminderSent: mock(() => Promise.resolve()),
  processAllPendingReminders: mock(() => Promise.resolve({ processed: 0, totalSent: 0 })),
}))

const mockCheckHackathonOrganizer = mock(() =>
  Promise.resolve({ status: "authorized" as const, hackathon: { id: "h1", tenant_id: "tenant-123" } })
)

mock.module("@/lib/services/public-hackathons", () => ({
  checkHackathonOrganizer: mockCheckHackathonOrganizer,
  getPublicHackathon: mock(() => Promise.resolve(null)),
}))

const mockResolvePrincipal = mock(() =>
  Promise.resolve({ kind: "anon" })
)

mock.module("@/lib/auth/principal", () => {
  class AuthError extends Error {
    statusCode: number
    constructor(message: string, statusCode: number) {
      super(message)
      this.statusCode = statusCode
      this.name = "AuthError"
    }
  }

  return {
    resolvePrincipal: mockResolvePrincipal,
    requirePrincipal: (principal: unknown, ..._rest: unknown[]) => {
      if (!principal || (principal as { kind: string }).kind === "anon") {
        throw new AuthError("Unauthorized", 401)
      }
      return principal
    },
    AuthError,
  }
})

mock.module("@/lib/services/rate-limit", () => ({
  checkRateLimit: () => ({ allowed: true, remaining: 100, resetAt: Date.now() + 60000 }),
  getRateLimitHeaders: () => ({}),
  defaultRateLimits: { "api_key:default": { maxRequests: 100, windowMs: 60000 } },
  RateLimitError: class RateLimitError extends Error {
    resetAt: number
    remaining: number
    constructor(resetAt: number, remaining: number) {
      super("Rate limit exceeded")
      this.resetAt = resetAt
      this.remaining = remaining
    }
  },
}))

const { Elysia } = await import("elysia")
const { dashboardPostEventRoutes } = await import("@/lib/api/routes/dashboard-post-event")
const { handleRouteError } = await import("@/lib/api/routes/errors")

const app = new Elysia({ prefix: "/api/dashboard" })
  .onError(({ error, set, path }) => handleRouteError(error, set, path))
  .use(dashboardPostEventRoutes)

const HACKATHON_ID = "11111111-1111-1111-1111-111111111111"
const FULFILLMENT_ID = "22222222-2222-2222-2222-222222222222"
const REMINDER_ID = "33333333-3333-3333-3333-333333333333"

const mockUserPrincipal = {
  kind: "user" as const,
  tenantId: "tenant-123",
  userId: "user-456",
  orgId: "org-789",
  orgRole: "org:admin",
  scopes: ["hackathons:read", "hackathons:write"],
}

describe("Dashboard Post-Event Routes", () => {
  beforeEach(() => {
    resetClerkMocks()
    mockResolvePrincipal.mockReset()
    mockCheckHackathonOrganizer.mockReset()
    mockLogAudit.mockReset()
    mockListFulfillments.mockReset()
    mockGetFulfillmentSummary.mockReset()
    mockInitializeFulfillments.mockReset()
    mockUpdateFulfillmentStatus.mockReset()
    mockSendFeedbackSurveyEmails.mockReset()
    mockListReminders.mockReset()
    mockGetReminderById.mockReset()
    mockCancelReminder.mockReset()
    mockProcessReminder.mockReset()

    mockCheckHackathonOrganizer.mockResolvedValue({
      status: "authorized" as const,
      hackathon: { id: HACKATHON_ID, tenant_id: "tenant-123" },
    })
    mockResolvePrincipal.mockResolvedValue(mockUserPrincipal)
  })

  describe("GET /hackathons/:id/fulfillments", () => {
    const url = `http://localhost/api/dashboard/hackathons/${HACKATHON_ID}/fulfillments`

    it("rejects unauthenticated requests", async () => {
      mockResolvePrincipal.mockResolvedValue({ kind: "anon" })

      const res = await app.handle(new Request(url))
      const data = await res.json()

      expect(data.error).toBe("Unauthorized")
      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it("returns 404 when hackathon not found", async () => {
      mockCheckHackathonOrganizer.mockResolvedValue({ status: "not_found" as const })

      const res = await app.handle(new Request(url))
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data.error).toBe("Hackathon not found")
    })

    it("returns 403 when not authorized", async () => {
      mockCheckHackathonOrganizer.mockResolvedValue({ status: "not_authorized" as const })

      const res = await app.handle(new Request(url))
      const data = await res.json()

      expect(res.status).toBe(403)
      expect(data.error).toBe("Not authorized")
    })

    it("returns fulfillments and summary", async () => {
      mockListFulfillments.mockResolvedValue([
        {
          id: FULFILLMENT_ID,
          prize_assignment_id: "pa-1",
          prizeName: "Best Hack",
          prizeValue: "$500",
          submissionTitle: "Cool Project",
          teamName: "Team Alpha",
          status: "assigned",
          recipient_email: null,
          recipient_name: null,
          shipping_address: null,
          tracking_number: null,
          notes: null,
          contacted_at: null,
          shipped_at: null,
          claimed_at: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      ])
      mockGetFulfillmentSummary.mockResolvedValue({
        assigned: 1,
        contacted: 0,
        shipped: 0,
        claimed: 0,
      })

      const res = await app.handle(new Request(url))
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.fulfillments).toHaveLength(1)
      expect(data.fulfillments[0].prizeName).toBe("Best Hack")
      expect(data.summary.assigned).toBe(1)
    })
  })

  describe("POST /hackathons/:id/fulfillments/initialize", () => {
    const url = `http://localhost/api/dashboard/hackathons/${HACKATHON_ID}/fulfillments/initialize`

    it("initializes fulfillments successfully", async () => {
      mockInitializeFulfillments.mockResolvedValue(3)

      const res = await app.handle(new Request(url, { method: "POST" }))
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.count).toBe(3)
      expect(mockLogAudit).toHaveBeenCalled()
    })

    it("rejects unauthenticated requests", async () => {
      mockResolvePrincipal.mockResolvedValue({ kind: "anon" })

      const res = await app.handle(new Request(url, { method: "POST" }))
      const data = await res.json()

      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("PATCH /hackathons/:id/fulfillments/:fulfillmentId", () => {
    const url = `http://localhost/api/dashboard/hackathons/${HACKATHON_ID}/fulfillments/${FULFILLMENT_ID}`

    it("updates fulfillment status", async () => {
      mockUpdateFulfillmentStatus.mockResolvedValue({ id: FULFILLMENT_ID, status: "contacted" })

      const res = await app.handle(
        new Request(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "contacted", notes: "Emailed winner" }),
        })
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.id).toBe(FULFILLMENT_ID)
      expect(data.status).toBe("contacted")
      expect(mockLogAudit).toHaveBeenCalled()
    })

    it("returns 400 for invalid transition", async () => {
      mockUpdateFulfillmentStatus.mockResolvedValue(null)

      const res = await app.handle(
        new Request(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "shipped" }),
        })
      )
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe("Invalid status transition or fulfillment not found")
    })
  })

  describe("POST /hackathons/:id/feedback-survey", () => {
    const url = `http://localhost/api/dashboard/hackathons/${HACKATHON_ID}/feedback-survey`

    it("sends survey emails successfully", async () => {
      mockSendFeedbackSurveyEmails.mockResolvedValue({ sent: 10, failed: 1 })

      const res = await app.handle(
        new Request(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ surveyUrl: "https://forms.google.com/test" }),
        })
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sent).toBe(10)
      expect(data.failed).toBe(1)
      expect(mockLogAudit).toHaveBeenCalled()
    })

    it("returns 400 when no participants or already sent", async () => {
      mockSendFeedbackSurveyEmails.mockResolvedValue({ sent: 0, failed: 0 })

      const res = await app.handle(
        new Request(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ surveyUrl: "https://example.com/survey" }),
        })
      )
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe("Survey already sent or no participants found")
    })
  })

  describe("GET /hackathons/:id/reminders", () => {
    const url = `http://localhost/api/dashboard/hackathons/${HACKATHON_ID}/reminders`

    it("returns reminders list", async () => {
      mockListReminders.mockResolvedValue([
        {
          id: REMINDER_ID,
          hackathon_id: HACKATHON_ID,
          type: "prize_claim",
          scheduled_for: "2026-01-04T00:00:00Z",
          sent_at: null,
          cancelled_at: null,
          recipient_filter: "winners",
          metadata: {},
          created_at: "2026-01-01T00:00:00Z",
        },
      ])

      const res = await app.handle(new Request(url))
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.reminders).toHaveLength(1)
      expect(data.reminders[0].type).toBe("prize_claim")
    })
  })

  describe("DELETE /hackathons/:id/reminders/:reminderId", () => {
    const url = `http://localhost/api/dashboard/hackathons/${HACKATHON_ID}/reminders/${REMINDER_ID}`

    it("cancels a reminder successfully", async () => {
      mockCancelReminder.mockResolvedValue(true)

      const res = await app.handle(new Request(url, { method: "DELETE" }))
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockLogAudit).toHaveBeenCalled()
    })

    it("returns 400 when reminder not found or already processed", async () => {
      mockCancelReminder.mockResolvedValue(false)

      const res = await app.handle(new Request(url, { method: "DELETE" }))
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe("Reminder not found or already sent/cancelled")
    })
  })

  describe("POST /hackathons/:id/reminders/:reminderId/send", () => {
    const url = `http://localhost/api/dashboard/hackathons/${HACKATHON_ID}/reminders/${REMINDER_ID}/send`

    it("sends a reminder immediately", async () => {
      mockGetReminderById.mockResolvedValue({
        id: REMINDER_ID,
        hackathon_id: HACKATHON_ID,
        type: "prize_claim",
        scheduled_for: "2026-01-04T00:00:00Z",
        sent_at: null,
        cancelled_at: null,
        recipient_filter: "winners",
        metadata: {},
        created_at: "2026-01-01T00:00:00Z",
      })
      mockProcessReminder.mockResolvedValue(5)

      const res = await app.handle(new Request(url, { method: "POST" }))
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sent).toBe(5)
      expect(mockLogAudit).toHaveBeenCalled()
    })

    it("returns 400 when reminder not found", async () => {
      mockGetReminderById.mockResolvedValue(null)

      const res = await app.handle(new Request(url, { method: "POST" }))
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe("Reminder not found or already sent/cancelled")
    })

    it("returns 400 when reminder already sent", async () => {
      mockGetReminderById.mockResolvedValue({
        id: REMINDER_ID,
        hackathon_id: HACKATHON_ID,
        type: "prize_claim",
        scheduled_for: "2026-01-04T00:00:00Z",
        sent_at: "2026-01-04T00:00:00Z",
        cancelled_at: null,
        recipient_filter: "winners",
        metadata: {},
        created_at: "2026-01-01T00:00:00Z",
      })

      const res = await app.handle(new Request(url, { method: "POST" }))
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe("Reminder not found or already sent/cancelled")
    })
  })
})
