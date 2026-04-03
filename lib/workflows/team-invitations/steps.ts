"use step"

import type { SendTeamInvitationInput } from "@/lib/email/team-invitations"

export async function sendTeamInvitationEmailStep(input: SendTeamInvitationInput): Promise<void> {
  const { sendTeamInvitationEmail } = await import("@/lib/email/team-invitations")

  const result = await sendTeamInvitationEmail(input)

  if (!result.success) {
    throw new Error(`Failed to send team invitation email to ${input.to}`)
  }
}
