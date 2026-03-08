import * as p from "@clack/prompts"
import type { OatmealClient } from "../../client.js"
import { formatSuccess } from "../../output.js"

export async function runAssignmentsDelete(
  client: OatmealClient,
  hackathonId: string,
  assignmentId: string,
  options: { yes?: boolean }
): Promise<void> {
  if (!assignmentId) {
    console.error("Usage: oatmeal judging assignments delete <hackathon-id> <assignment-id>")
    process.exit(1)
  }

  if (!options.yes) {
    const confirm = await p.confirm({ message: `Delete assignment ${assignmentId}?` })
    if (p.isCancel(confirm) || !confirm) {
      p.log.info("Cancelled.")
      return
    }
  }

  await client.delete(
    `/api/dashboard/hackathons/${hackathonId}/judging/assignments/${assignmentId}`
  )
  console.log(formatSuccess(`Deleted assignment ${assignmentId}`))
}
