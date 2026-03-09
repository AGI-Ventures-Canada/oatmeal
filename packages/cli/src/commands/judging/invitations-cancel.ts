import * as p from "@clack/prompts"
import type { OatmealClient } from "../../client.js"
import { formatSuccess } from "../../output.js"

export async function runInvitationsCancel(
  client: OatmealClient,
  hackathonId: string,
  invitationId: string,
  options: { yes?: boolean }
): Promise<void> {
  if (!invitationId) {
    console.error("Usage: hackathon judging invitations cancel <hackathon-id> <invitation-id>")
    process.exit(1)
  }

  if (!options.yes) {
    const confirm = await p.confirm({ message: `Cancel invitation ${invitationId}?` })
    if (p.isCancel(confirm) || !confirm) {
      p.log.info("Cancelled.")
      return
    }
  }

  await client.delete(
    `/api/dashboard/hackathons/${hackathonId}/judging/invitations/${invitationId}`
  )
  console.log(formatSuccess(`Cancelled invitation ${invitationId}`))
}
