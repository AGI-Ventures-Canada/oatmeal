import { describe, expect, it, beforeEach, mock } from "bun:test"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
} from "../lib/supabase-mock"

const mockTriggerWebhooks = mock(() => Promise.resolve())
mock.module("@/lib/services/webhooks", () => ({
  triggerWebhooks: mockTriggerWebhooks,
}))

const mockStart = mock(() => Promise.resolve({ runId: "run-1" }))
mock.module("workflow/api", () => ({
  start: mockStart,
}))

const { dispatchTransitionNotifications } = await import(
  "@/lib/services/notification-dispatcher"
)

describe("Notification Dispatcher", () => {
  beforeEach(() => {
    resetSupabaseMocks()
    mockTriggerWebhooks.mockClear()
    mockStart.mockClear()
  })

  it("sends emails and webhooks for hackathon_started", async () => {
    setMockFromImplementation(() =>
      createChainableMock({ data: null, error: { message: "No rows" } })
    )

    await dispatchTransitionNotifications({
      type: "hackathon_started",
      hackathonId: "h1",
      tenantId: "t1",
      hackathon: { name: "Test Hack", slug: "test-hack" },
      trigger: "auto",
      triggeredBy: "system",
      fromStatus: "registration_open",
      toStatus: "active",
    })

    expect(mockStart).toHaveBeenCalledTimes(1)
    expect(mockTriggerWebhooks).toHaveBeenCalledTimes(1)
    const webhookCall = mockTriggerWebhooks.mock.calls[0]
    expect(webhookCall[0]).toBe("t1")
    expect(webhookCall[1]).toBe("hackathon.started")
  })

  it("skips email for registration_opened (no recipients)", async () => {
    setMockFromImplementation(() =>
      createChainableMock({ data: null, error: { message: "No rows" } })
    )

    await dispatchTransitionNotifications({
      type: "registration_opened",
      hackathonId: "h1",
      tenantId: "t1",
      hackathon: { name: "Test Hack", slug: "test-hack" },
      trigger: "manual",
      triggeredBy: "user1",
      fromStatus: "published",
      toStatus: "registration_open",
    })

    expect(mockStart).not.toHaveBeenCalled()
    expect(mockTriggerWebhooks).toHaveBeenCalledTimes(1)
  })

  it("respects per-hackathon notification settings", async () => {
    const settings = {
      hackathon_id: "h1",
      email_on_registration_open: true,
      email_on_hackathon_active: false,
      email_on_judging_started: true,
      email_on_results_published: true,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    }

    setMockFromImplementation(() =>
      createChainableMock({ data: settings, error: null })
    )

    await dispatchTransitionNotifications({
      type: "hackathon_started",
      hackathonId: "h1",
      tenantId: "t1",
      hackathon: { name: "Test Hack", slug: "test-hack" },
      trigger: "auto",
      triggeredBy: "system",
      fromStatus: "registration_open",
      toStatus: "active",
    })

    expect(mockStart).not.toHaveBeenCalled()
    expect(mockTriggerWebhooks).toHaveBeenCalledTimes(1)
  })

  it("fires webhook for judging_started with correct event", async () => {
    setMockFromImplementation(() =>
      createChainableMock({ data: null, error: { message: "No rows" } })
    )

    await dispatchTransitionNotifications({
      type: "judging_started",
      hackathonId: "h1",
      tenantId: "t1",
      hackathon: { name: "Test Hack", slug: "test-hack" },
      trigger: "manual",
      triggeredBy: "user1",
      fromStatus: "active",
      toStatus: "judging",
    })

    expect(mockTriggerWebhooks).toHaveBeenCalledTimes(1)
    expect(mockTriggerWebhooks.mock.calls[0][1]).toBe("hackathon.judging_started")
  })
})
