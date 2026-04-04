import type { OatmealClient } from "../../client.js"
import { formatJson, formatDetail } from "../../output.js"
import type { TrackDetail } from "../../types.js"

export async function runTracksGet(
  client: OatmealClient,
  hackathonId: string,
  trackId: string,
  options: { json?: boolean }
): Promise<void> {
  if (!trackId) {
    console.error("Usage: hackathon tracks get <hackathon-id> <track-id>")
    process.exit(1)
  }

  const track = await client.get<TrackDetail>(
    `/api/dashboard/hackathons/${hackathonId}/prize-tracks/${trackId}`
  )

  if (options.json) {
    console.log(formatJson(track))
    return
  }

  console.log(
    formatDetail([
      { label: "ID", value: track.id },
      { label: "Name", value: track.name },
      { label: "Description", value: track.description ?? undefined },
      { label: "Intent", value: track.intent },
    ])
  )

  if (track.rounds.length > 0) {
    console.log(`\nRounds (${track.rounds.length}):`)
    for (const round of track.rounds) {
      console.log(`  ${round.name} — ${round.style ?? "no style"} [${round.status}]`)
      if (round.buckets.length > 0) {
        for (const b of round.buckets) {
          console.log(`    ${b.level}. ${b.label}${b.description ? ` — ${b.description}` : ""}`)
        }
      }
    }
  }
}
