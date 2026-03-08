import * as p from "@clack/prompts"
import type { OatmealClient } from "../../client.js"
import { formatSuccess } from "../../output.js"

export async function runPrizesUnassign(
  client: OatmealClient,
  hackathonId: string,
  prizeId: string,
  submissionId: string,
  options: { yes?: boolean }
): Promise<void> {
  if (!prizeId || !submissionId) {
    console.error("Usage: oatmeal prizes unassign <hackathon-id> <prize-id> <submission-id>")
    process.exit(1)
  }

  if (!options.yes) {
    const confirm = await p.confirm({ message: `Unassign prize ${prizeId} from submission ${submissionId}?` })
    if (p.isCancel(confirm) || !confirm) {
      p.log.info("Cancelled.")
      return
    }
  }

  await client.delete(
    `/api/dashboard/hackathons/${hackathonId}/prizes/${prizeId}/assign/${submissionId}`
  )
  console.log(formatSuccess(`Unassigned prize ${prizeId}`))
}
