import * as p from "@clack/prompts"
import type { OatmealClient } from "../../client.js"
import { formatSuccess } from "../../output.js"

export async function runJudgesRemove(
  client: OatmealClient,
  hackathonId: string,
  participantId: string,
  options: { yes?: boolean }
): Promise<void> {
  if (!participantId) {
    console.error("Usage: hackathon judging judges remove <hackathon-id> <participant-id>")
    process.exit(1)
  }

  if (!options.yes) {
    const confirm = await p.confirm({ message: `Remove judge ${participantId}?` })
    if (p.isCancel(confirm) || !confirm) {
      p.log.info("Cancelled.")
      return
    }
  }

  await client.delete(
    `/api/dashboard/hackathons/${hackathonId}/judging/judges/${participantId}`
  )
  console.log(formatSuccess(`Removed judge ${participantId}`))
}
