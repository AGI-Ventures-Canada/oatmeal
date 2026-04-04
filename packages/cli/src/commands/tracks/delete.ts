import * as p from "@clack/prompts"
import type { OatmealClient } from "../../client.js"
import { formatSuccess } from "../../output.js"

export async function runTracksDelete(
  client: OatmealClient,
  hackathonId: string,
  trackId: string,
  options: { yes?: boolean }
): Promise<void> {
  if (!trackId) {
    console.error("Usage: hackathon tracks delete <hackathon-id> <track-id>")
    process.exit(1)
  }

  if (!options.yes) {
    const confirm = await p.confirm({ message: `Delete track ${trackId}? This removes all rounds, buckets, and responses.` })
    if (p.isCancel(confirm) || !confirm) {
      p.log.info("Cancelled.")
      return
    }
  }

  await client.delete(`/api/dashboard/hackathons/${hackathonId}/prize-tracks/${trackId}`)
  console.log(formatSuccess(`Deleted track ${trackId}`))
}
