import type { OatmealClient } from "../../client.js"
import { formatJson, formatTable } from "../../output.js"
import type { PrizeTrack } from "../../types.js"

export async function runTracksList(
  client: OatmealClient,
  hackathonId: string,
  options: { json?: boolean }
): Promise<void> {
  const data = await client.get<{ tracks: PrizeTrack[] }>(
    `/api/dashboard/hackathons/${hackathonId}/prize-tracks`
  )

  if (options.json) {
    console.log(formatJson(data))
    return
  }

  if (!data.tracks?.length) {
    console.log("No prize tracks found.")
    return
  }

  console.log(
    formatTable(data.tracks, [
      { key: "trackId", label: "ID" },
      { key: "trackName", label: "Name" },
      { key: "intent", label: "Intent" },
      { key: "style", label: "Style" },
      { key: "totalAssignments", label: "Assignments" },
      { key: "completedAssignments", label: "Completed" },
    ])
  )
}
