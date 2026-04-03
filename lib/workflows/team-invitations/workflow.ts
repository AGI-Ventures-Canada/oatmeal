"use workflow"

import type { SendTeamInvitationInput } from "@/lib/email/team-invitations"

export async function sendTeamInvitationWorkflow(input: SendTeamInvitationInput): Promise<void> {
  const { sendTeamInvitationEmailStep } = await import("./steps")
  await sendTeamInvitationEmailStep(input)
}
