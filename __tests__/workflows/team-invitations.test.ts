import { describe, it, expect, beforeEach, mock } from "bun:test"

const mockSendTeamInvitationEmail = mock(() => Promise.resolve({ success: true }))

mock.module("@/lib/email/team-invitations", () => ({
  sendTeamInvitationEmail: mockSendTeamInvitationEmail,
}))

const { sendTeamInvitationEmailStep } = await import(
  "@/lib/workflows/team-invitations/steps"
)
const { sendTeamInvitationWorkflow } = await import(
  "@/lib/workflows/team-invitations/workflow"
)

const baseInput = {
  to: "invitee@example.com",
  teamName: "Team Alpha",
  hackathonName: "Test Hackathon",
  inviterName: "Captain",
  inviteToken: "token123",
  expiresAt: "2026-04-10T00:00:00Z",
}

describe("sendTeamInvitationEmailStep", () => {
  beforeEach(() => {
    mockSendTeamInvitationEmail.mockClear()
    mockSendTeamInvitationEmail.mockResolvedValue({ success: true })
  })

  it("calls sendTeamInvitationEmail with the full input", async () => {
    await sendTeamInvitationEmailStep(baseInput)

    expect(mockSendTeamInvitationEmail).toHaveBeenCalledWith(baseInput)
  })

  it("resolves without error on success", async () => {
    await expect(sendTeamInvitationEmailStep(baseInput)).resolves.toBeUndefined()
  })

  it("throws when email send returns success: false", async () => {
    mockSendTeamInvitationEmail.mockResolvedValueOnce({ success: false })

    await expect(sendTeamInvitationEmailStep(baseInput)).rejects.toThrow(
      "Failed to send team invitation email to invitee@example.com"
    )
  })
})

describe("sendTeamInvitationWorkflow", () => {
  beforeEach(() => {
    mockSendTeamInvitationEmail.mockClear()
    mockSendTeamInvitationEmail.mockResolvedValue({ success: true })
  })

  it("calls the email step with the workflow input", async () => {
    await sendTeamInvitationWorkflow(baseInput)

    expect(mockSendTeamInvitationEmail).toHaveBeenCalledWith(baseInput)
  })

  it("propagates step errors", async () => {
    mockSendTeamInvitationEmail.mockResolvedValueOnce({ success: false })

    await expect(sendTeamInvitationWorkflow(baseInput)).rejects.toThrow(
      "Failed to send team invitation email to invitee@example.com"
    )
  })
})
