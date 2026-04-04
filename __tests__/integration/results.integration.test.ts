import { describe, expect, it, mock, beforeEach } from "bun:test"
import { createIntegrationChainableMock } from "../lib/integration-mock"

const mockAuth = mock(() => Promise.resolve({ userId: null }))
const mockClerkClient = mock(() =>
  Promise.resolve({
    organizations: {
      getOrganization: mock(() => Promise.resolve({ name: "Test Org" })),
    },
  })
)

mock.module("@clerk/nextjs/server", () => ({
  auth: mockAuth,
  clerkClient: mockClerkClient,
}))

const mockSendWinnerEmails = mock(() => Promise.resolve(3))

mock.module("@/lib/email/winner-notifications", () => ({
  sendWinnerEmails: mockSendWinnerEmails,
}))

const mockFrom = mock()
const mockRpc = mock()

mock.module("@/lib/db/client", () => ({
  supabase: () => ({
    from: mockFrom,
    rpc: mockRpc,
  }),
}))

const { publishResults } = await import("@/lib/services/results")

describe("Results Integration - publishResults", () => {
  beforeEach(() => {
    mockFrom.mockClear()
    mockSendWinnerEmails.mockClear()
    mockSendWinnerEmails.mockImplementation(() => Promise.resolve(3))
  })

  it("publishes results successfully and sends winner notification emails", async () => {
    let hackathonCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === "hackathons") {
        hackathonCallCount++
        if (hackathonCallCount === 1) {
          return createIntegrationChainableMock({
            data: { id: "h1", status: "judging", tenant_id: "t1", winner_emails_sent_at: null },
            error: null,
          })
        }
        if (hackathonCallCount === 2) {
          return createIntegrationChainableMock({ data: { id: "h1" }, error: null })
        }
        return createIntegrationChainableMock({ data: null, error: null })
      }
      if (table === "hackathon_results") {
        return createIntegrationChainableMock({ data: [{ id: "r1" }], error: null })
      }
      return createIntegrationChainableMock({ data: null, error: null })
    })

    const result = await publishResults("h1", "t1")

    expect(result.success).toBe(true)
    expect(mockSendWinnerEmails).toHaveBeenCalledWith("h1")
  })

  it("returns error when hackathon does not exist", async () => {
    mockFrom.mockImplementation(() =>
      createIntegrationChainableMock({ data: null, error: null })
    )

    const result = await publishResults("h1", "t1")

    expect(result.success).toBe(false)
    expect(result.error).toBe("Hackathon not found")
  })

  it("returns error when no results have been calculated yet", async () => {
    let hackathonQueried = false
    mockFrom.mockImplementation((table: string) => {
      if (table === "hackathons" && !hackathonQueried) {
        hackathonQueried = true
        return createIntegrationChainableMock({
          data: { id: "h1", status: "judging", tenant_id: "t1" },
          error: null,
        })
      }
      if (table === "hackathon_results") {
        return createIntegrationChainableMock({ data: [], error: null })
      }
      return createIntegrationChainableMock({ data: null, error: null })
    })

    const result = await publishResults("h1", "t1")

    expect(result.success).toBe(false)
    expect(result.error).toContain("No results calculated")
  })

  it("returns error when results are already published", async () => {
    let hackathonCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === "hackathons") {
        hackathonCallCount++
        if (hackathonCallCount === 1) {
          return createIntegrationChainableMock({
            data: { id: "h1", status: "judging", tenant_id: "t1", winner_emails_sent_at: null },
            error: null,
          })
        }
        return createIntegrationChainableMock({
          data: { results_published_at: "2026-03-01T00:00:00Z" },
          error: null,
        })
      }
      if (table === "hackathon_results") {
        return createIntegrationChainableMock({ data: [{ id: "r1" }], error: null })
      }
      return createIntegrationChainableMock({ data: null, error: null })
    })

    const result = await publishResults("h1", "t1")

    expect(result.success).toBe(false)
    expect(result.error).toBe("Results are already published")
  })

  it("skips email sending when winner emails were already sent", async () => {
    let hackathonCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === "hackathons") {
        hackathonCallCount++
        if (hackathonCallCount === 1) {
          return createIntegrationChainableMock({
            data: {
              id: "h1",
              status: "judging",
              tenant_id: "t1",
              winner_emails_sent_at: "2026-01-01T00:00:00Z",
            },
            error: null,
          })
        }
        if (hackathonCallCount === 2) {
          return createIntegrationChainableMock({ data: { id: "h1" }, error: null })
        }
        return createIntegrationChainableMock({ data: null, error: null })
      }
      if (table === "hackathon_results") {
        return createIntegrationChainableMock({ data: [{ id: "r1" }], error: null })
      }
      return createIntegrationChainableMock({ data: null, error: null })
    })

    const result = await publishResults("h1", "t1")

    expect(result.success).toBe(true)
    expect(mockSendWinnerEmails).not.toHaveBeenCalled()
  })

  it("succeeds even when email sending fails", async () => {
    mockSendWinnerEmails.mockImplementation(() => Promise.reject(new Error("Email failed")))

    let hackathonCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === "hackathons") {
        hackathonCallCount++
        if (hackathonCallCount === 1) {
          return createIntegrationChainableMock({
            data: { id: "h1", status: "judging", tenant_id: "t1", winner_emails_sent_at: null },
            error: null,
          })
        }
        if (hackathonCallCount === 2) {
          return createIntegrationChainableMock({ data: { id: "h1" }, error: null })
        }
        return createIntegrationChainableMock({ data: null, error: null })
      }
      if (table === "hackathon_results") {
        return createIntegrationChainableMock({ data: [{ id: "r1" }], error: null })
      }
      return createIntegrationChainableMock({ data: null, error: null })
    })

    const result = await publishResults("h1", "t1")

    expect(result.success).toBe(true)
  })

  it("updates winner_emails_sent_at timestamp after successful email send", async () => {
    let hackathonCallCount = 0
    let updateCalled = false
    mockFrom.mockImplementation((table: string) => {
      if (table === "hackathons") {
        hackathonCallCount++
        if (hackathonCallCount === 1) {
          return createIntegrationChainableMock({
            data: { id: "h1", status: "judging", tenant_id: "t1", winner_emails_sent_at: null },
            error: null,
          })
        }
        if (hackathonCallCount === 2) {
          return createIntegrationChainableMock({ data: { id: "h1" }, error: null })
        }
        if (hackathonCallCount === 3) {
          updateCalled = true
          return createIntegrationChainableMock({ data: null, error: null })
        }
        return createIntegrationChainableMock({ data: null, error: null })
      }
      if (table === "hackathon_results") {
        return createIntegrationChainableMock({ data: [{ id: "r1" }], error: null })
      }
      return createIntegrationChainableMock({ data: null, error: null })
    })

    const result = await publishResults("h1", "t1")

    expect(result.success).toBe(true)
    expect(updateCalled).toBe(true)
  })
})
