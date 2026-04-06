import { describe, it, expect, beforeEach, mock } from "bun:test"

const mockSendReminderEmails = mock(() => Promise.resolve(3))
const mockBuildPrizeClaimReminderContent = mock(() => ({
  subject: "Claim your prize",
  htmlContent: "<p>Claim</p>",
  textContent: "Claim",
}))
const mockBuildPrizeClaimFollowupContent = mock(() => ({
  subject: "Don't forget your prize",
  htmlContent: "<p>Follow up</p>",
  textContent: "Follow up",
}))
const mockBuildWinnerUnresponsiveContent = mock(() => ({
  subject: "Unclaimed prizes",
  htmlContent: "<p>Escalation</p>",
  textContent: "Escalation",
}))

mock.module("@/lib/email/post-event-reminders", () => ({
  sendReminderEmails: mockSendReminderEmails,
  buildPrizeClaimReminderContent: mockBuildPrizeClaimReminderContent,
  buildPrizeClaimFollowupContent: mockBuildPrizeClaimFollowupContent,
  buildWinnerUnresponsiveContent: mockBuildWinnerUnresponsiveContent,
}))

const mockListFulfillments = mock(() => Promise.resolve([]))

mock.module("@/lib/services/prize-fulfillment", () => ({
  listFulfillments: mockListFulfillments,
}))

const {
  sendPrizeClaimReminders,
  sendPrizeClaimFollowup,
  sendOrganizerEscalation,
} = await import("@/lib/workflows/post-event-reminders/steps")

const input = {
  hackathonId: "hack_1",
  hackathonName: "Test Hackathon",
  hackathonSlug: "test-hackathon",
}

describe("sendPrizeClaimReminders", () => {
  beforeEach(() => {
    mockSendReminderEmails.mockClear()
    mockBuildPrizeClaimReminderContent.mockClear()
    mockListFulfillments.mockClear()
  })

  it("sends reminder emails and returns count", async () => {
    const sent = await sendPrizeClaimReminders(input)

    expect(sent).toBe(3)
    expect(mockBuildPrizeClaimReminderContent).toHaveBeenCalledWith("Test Hackathon", "test-hackathon")
    expect(mockSendReminderEmails).toHaveBeenCalledTimes(1)
    const args = mockSendReminderEmails.mock.calls[0]!
    expect(args[0]).toBe("hack_1")
    expect(args[1]).toBe("prize_claim")
    expect(args[2]).toBe("unclaimed_winners")
  })
})

describe("sendPrizeClaimFollowup", () => {
  beforeEach(() => {
    mockSendReminderEmails.mockClear()
    mockBuildPrizeClaimFollowupContent.mockClear()
    mockListFulfillments.mockClear()
  })

  it("sends followup when unclaimed fulfillments exist", async () => {
    mockListFulfillments.mockImplementation(() =>
      Promise.resolve([
        { claimed_at: null, prizeName: "Prize A", submissionTitle: "Proj A" },
        { claimed_at: "2026-01-01", prizeName: "Prize B", submissionTitle: "Proj B" },
      ])
    )

    const sent = await sendPrizeClaimFollowup(input)

    expect(sent).toBe(3)
    expect(mockListFulfillments).toHaveBeenCalledWith("hack_1")
    expect(mockSendReminderEmails).toHaveBeenCalledTimes(1)
  })

  it("returns 0 when all prizes are claimed", async () => {
    mockListFulfillments.mockImplementation(() =>
      Promise.resolve([
        { claimed_at: "2026-01-01", prizeName: "Prize", submissionTitle: "Proj" },
      ])
    )

    const sent = await sendPrizeClaimFollowup(input)

    expect(sent).toBe(0)
    expect(mockSendReminderEmails).not.toHaveBeenCalled()
  })

  it("returns 0 when no fulfillments exist", async () => {
    mockListFulfillments.mockImplementation(() => Promise.resolve([]))

    const sent = await sendPrizeClaimFollowup(input)

    expect(sent).toBe(0)
    expect(mockSendReminderEmails).not.toHaveBeenCalled()
  })
})

describe("sendOrganizerEscalation", () => {
  beforeEach(() => {
    mockSendReminderEmails.mockClear()
    mockBuildWinnerUnresponsiveContent.mockClear()
    mockListFulfillments.mockClear()
  })

  it("sends escalation with unclaimed prize details", async () => {
    mockListFulfillments.mockImplementation(() =>
      Promise.resolve([
        { claimed_at: null, prizeName: "Prize A", submissionTitle: "Proj A" },
        { claimed_at: null, prizeName: "Prize B", submissionTitle: "Proj B" },
        { claimed_at: "2026-01-01", prizeName: "Prize C", submissionTitle: "Proj C" },
      ])
    )

    const sent = await sendOrganizerEscalation(input)

    expect(sent).toBe(3)
    expect(mockBuildWinnerUnresponsiveContent).toHaveBeenCalledWith(
      "Test Hackathon",
      "test-hackathon",
      2,
      "Prize A (Proj A), Prize B (Proj B)"
    )
    expect(mockSendReminderEmails).toHaveBeenCalledTimes(1)
    const args = mockSendReminderEmails.mock.calls[0]!
    expect(args[1]).toBe("winner_unresponsive")
    expect(args[2]).toBe("organizers")
  })

  it("returns 0 when all prizes are claimed", async () => {
    mockListFulfillments.mockImplementation(() =>
      Promise.resolve([
        { claimed_at: "2026-01-01", prizeName: "Prize", submissionTitle: "Proj" },
      ])
    )

    const sent = await sendOrganizerEscalation(input)

    expect(sent).toBe(0)
    expect(mockSendReminderEmails).not.toHaveBeenCalled()
  })

  it("returns 0 when no fulfillments exist", async () => {
    mockListFulfillments.mockImplementation(() => Promise.resolve([]))

    const sent = await sendOrganizerEscalation(input)

    expect(sent).toBe(0)
    expect(mockSendReminderEmails).not.toHaveBeenCalled()
  })
})
