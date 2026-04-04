import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"

export async function runTracksActivateRound(
  client: OatmealClient,
  hackathonId: string,
  trackId: string,
  roundId: string,
  options: { json?: boolean }
): Promise<void> {
  if (!trackId || !roundId) {
    console.error("Usage: hackathon tracks activate-round <hackathon-id> <track-id> <round-id>")
    process.exit(1)
  }

  const result = await client.post<{ success: boolean }>(
    `/api/dashboard/hackathons/${hackathonId}/prize-tracks/${trackId}/rounds/${roundId}/activate`,
    {}
  )

  if (options.json) {
    console.log(formatJson(result))
    return
  }

  console.log(formatSuccess("Round activated"))
}
