import type { OatmealClient } from "../../client.js"
import { formatJson, formatTable } from "../../output.js"
import type { JudgeInvitation } from "../../types.js"

export async function runInvitationsList(
  client: OatmealClient,
  hackathonId: string,
  options: { json?: boolean }
): Promise<void> {
  const data = await client.get<{ invitations: JudgeInvitation[] }>(
    `/api/dashboard/hackathons/${hackathonId}/judging/invitations`
  )

  if (options.json) {
    console.log(formatJson(data))
    return
  }

  if (!data.invitations?.length) {
    console.log("No pending invitations.")
    return
  }

  console.log(
    formatTable(data.invitations, [
      { key: "email", label: "Email" },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Sent" },
    ])
  )
}
