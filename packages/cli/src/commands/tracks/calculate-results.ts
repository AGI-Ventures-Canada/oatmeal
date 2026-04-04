import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"

export async function runTracksCalculateResults(
  client: OatmealClient,
  hackathonId: string,
  trackId: string,
  roundId: string,
  options: { json?: boolean }
): Promise<void> {
  if (!trackId || !roundId) {
    console.error("Usage: hackathon tracks calculate-results <hackathon-id> <track-id> <round-id>")
    process.exit(1)
  }

  const result = await client.post<{ success: boolean; resultsCount: number }>(
    `/api/dashboard/hackathons/${hackathonId}/prize-tracks/${trackId}/rounds/${roundId}/calculate-results`,
    {}
  )

  if (options.json) {
    console.log(formatJson(result))
    return
  }

  console.log(formatSuccess(`Calculated results for ${result.resultsCount} submissions`))
}
