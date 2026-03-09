import * as p from "@clack/prompts"
import type { OatmealClient } from "../../client.js"
import { formatSuccess } from "../../output.js"

export async function runResultsUnpublish(
  client: OatmealClient,
  hackathonId: string,
  options: { yes?: boolean }
): Promise<void> {
  if (!hackathonId) {
    console.error("Usage: hackathon results unpublish <hackathon-id>")
    process.exit(1)
  }

  if (!options.yes) {
    const confirm = await p.confirm({ message: "Unpublish results?" })
    if (p.isCancel(confirm) || !confirm) {
      p.log.info("Cancelled.")
      return
    }
  }

  await client.post(`/api/dashboard/hackathons/${hackathonId}/results/unpublish`)
  console.log(formatSuccess("Results unpublished"))
}
