import * as p from "@clack/prompts"
import type { OatmealClient } from "../../client.js"
import { formatSuccess } from "../../output.js"

export async function runPrizesDelete(
  client: OatmealClient,
  hackathonId: string,
  prizeId: string,
  options: { yes?: boolean }
): Promise<void> {
  if (!prizeId) {
    console.error("Usage: hackathon prizes delete <hackathon-id> <prize-id>")
    process.exit(1)
  }

  if (!options.yes) {
    const confirm = await p.confirm({ message: `Delete prize ${prizeId}?` })
    if (p.isCancel(confirm) || !confirm) {
      p.log.info("Cancelled.")
      return
    }
  }

  await client.delete(`/api/dashboard/hackathons/${hackathonId}/prizes/${prizeId}`)
  console.log(formatSuccess(`Deleted prize ${prizeId}`))
}
