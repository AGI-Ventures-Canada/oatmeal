import { describe, it, expect, mock, beforeEach } from "bun:test"

const mockSendEmail = mock(() => Promise.resolve({ id: "email_123" }))

mock.module("@/lib/email/resend", () => ({
  sendEmail: mockSendEmail,
}))

const { sendTeamInvitationEmail } = await import("@/lib/email/team-invitations")

describe("Team Invitation Email", () => {
  beforeEach(() => {
    mockSendEmail.mockClear()
    mockSendEmail.mockResolvedValue({ id: "email_123" })
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com"
  })

  describe("sendTeamInvitationEmail", () => {
    const validInput = {
      to: "invitee@example.com",
      teamName: "Awesome Team",
      hackathonName: "AI Hackathon 2026",
      inviterName: "John Doe",
      inviteToken: "abc123token",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }

    it("sends email successfully", async () => {
      const result = await sendTeamInvitationEmail(validInput)

      expect(result.success).toBe(true)
      expect(mockSendEmail).toHaveBeenCalledTimes(1)
    })

    it("passes correct recipient", async () => {
      await sendTeamInvitationEmail(validInput)

      const callArgs = mockSendEmail.mock.calls[0][0]
      expect(callArgs.to).toBe("invitee@example.com")
    })

    it("includes team name in subject", async () => {
      await sendTeamInvitationEmail(validInput)

      const callArgs = mockSendEmail.mock.calls[0][0]
      expect(callArgs.subject).toContain("Awesome Team")
    })

    it("includes hackathon name in subject", async () => {
      await sendTeamInvitationEmail(validInput)

      const callArgs = mockSendEmail.mock.calls[0][0]
      expect(callArgs.subject).toContain("AI Hackathon 2026")
    })

    it("includes accept URL in HTML body", async () => {
      await sendTeamInvitationEmail(validInput)

      const callArgs = mockSendEmail.mock.calls[0][0]
      expect(callArgs.html).toContain("https://example.com/invite/abc123token")
    })

    it("includes accept URL in text body", async () => {
      await sendTeamInvitationEmail(validInput)

      const callArgs = mockSendEmail.mock.calls[0][0]
      expect(callArgs.text).toContain("https://example.com/invite/abc123token")
    })

    it("includes inviter name in body", async () => {
      await sendTeamInvitationEmail(validInput)

      const callArgs = mockSendEmail.mock.calls[0][0]
      expect(callArgs.html).toContain("John Doe")
      expect(callArgs.text).toContain("John Doe")
    })

    it("includes team name in body", async () => {
      await sendTeamInvitationEmail(validInput)

      const callArgs = mockSendEmail.mock.calls[0][0]
      expect(callArgs.html).toContain("Awesome Team")
      expect(callArgs.text).toContain("Awesome Team")
    })

    it("includes hackathon name in body", async () => {
      await sendTeamInvitationEmail(validInput)

      const callArgs = mockSendEmail.mock.calls[0][0]
      expect(callArgs.html).toContain("AI Hackathon 2026")
      expect(callArgs.text).toContain("AI Hackathon 2026")
    })

    it("includes expiry date in body", async () => {
      const fixedDate = new Date("2026-02-20T12:00:00Z")
      await sendTeamInvitationEmail({
        ...validInput,
        expiresAt: fixedDate.toISOString(),
      })

      const callArgs = mockSendEmail.mock.calls[0][0]
      expect(callArgs.html).toContain("February")
      expect(callArgs.text).toContain("February")
    })

    it("adds team_invitation tag", async () => {
      await sendTeamInvitationEmail(validInput)

      const callArgs = mockSendEmail.mock.calls[0][0]
      expect(callArgs.tags).toContainEqual({ name: "type", value: "team_invitation" })
    })

    it("adds hackathon tag", async () => {
      await sendTeamInvitationEmail(validInput)

      const callArgs = mockSendEmail.mock.calls[0][0]
      const hackathonTag = callArgs.tags.find((t: { name: string }) => t.name === "hackathon")
      expect(hackathonTag).toBeDefined()
      expect(hackathonTag.value).toContain("AI_Hackathon_2026")
    })

    it("sanitizes hackathon name for tag", async () => {
      await sendTeamInvitationEmail({
        ...validInput,
        hackathonName: "Special <Characters> & More!",
      })

      const callArgs = mockSendEmail.mock.calls[0][0]
      const hackathonTag = callArgs.tags.find((t: { name: string }) => t.name === "hackathon")
      expect(hackathonTag.value).not.toContain("<")
      expect(hackathonTag.value).not.toContain(">")
      expect(hackathonTag.value).not.toContain("&")
      expect(hackathonTag.value).not.toContain("!")
    })

    it("returns success false when sendEmail returns null", async () => {
      mockSendEmail.mockResolvedValue(null)

      const result = await sendTeamInvitationEmail(validInput)

      expect(result.success).toBe(false)
    })

    it("truncates long hackathon names in tag", async () => {
      const longName = "A".repeat(150) + " Hackathon"
      await sendTeamInvitationEmail({
        ...validInput,
        hackathonName: longName,
      })

      const callArgs = mockSendEmail.mock.calls[0][0]
      const hackathonTag = callArgs.tags.find((t: { name: string }) => t.name === "hackathon")
      expect(hackathonTag.value.length).toBeLessThanOrEqual(100)
    })

    it("handles consecutive special characters in hackathon name", async () => {
      await sendTeamInvitationEmail({
        ...validInput,
        hackathonName: "Test!!!Hackathon",
      })

      const callArgs = mockSendEmail.mock.calls[0][0]
      const hackathonTag = callArgs.tags.find((t: { name: string }) => t.name === "hackathon")
      expect(hackathonTag.value).not.toContain("__")
    })
  })
})
