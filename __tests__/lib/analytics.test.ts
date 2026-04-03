import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test"

const mockCapture = mock(() => {})
const mockIdentify = mock(() => {})
const mockShutdown = mock(() => Promise.resolve())

mock.module("posthog-node", () => ({
  PostHog: class {
    capture = mockCapture
    identify = mockIdentify
    shutdown = mockShutdown
  },
}))

const posthog = await import("@/lib/analytics/posthog")

const originalKey = process.env.NEXT_PUBLIC_POSTHOG_KEY

describe("Server Analytics", () => {
  beforeEach(async () => {
    mockCapture.mockClear()
    mockIdentify.mockClear()
    mockShutdown.mockClear()
    await posthog.shutdownAnalytics()
  })

  afterEach(async () => {
    await posthog.shutdownAnalytics()
    if (originalKey === undefined) {
      delete process.env.NEXT_PUBLIC_POSTHOG_KEY
    } else {
      process.env.NEXT_PUBLIC_POSTHOG_KEY = originalKey
    }
  })

  it("trackEvent sends event to PostHog when key is set", () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key"

    posthog.trackEvent("user-123", "hackathon.created", { hackathonId: "h1" })

    expect(mockCapture).toHaveBeenCalledWith({
      distinctId: "user-123",
      event: "hackathon.created",
      properties: { hackathonId: "h1", environment: "development" },
    })
  })

  it("identifyUser sends identify to PostHog", () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key"

    posthog.identifyUser("user-123", { email: "test@test.com" })

    expect(mockIdentify).toHaveBeenCalledWith({
      distinctId: "user-123",
      properties: { email: "test@test.com" },
    })
  })

  it("shutdownAnalytics flushes the client", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key"

    posthog.trackEvent("user-123", "test", {})
    await posthog.shutdownAnalytics()

    expect(mockShutdown).toHaveBeenCalled()
  })
})
