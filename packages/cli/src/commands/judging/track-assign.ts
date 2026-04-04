import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"

interface TrackAssignOptions {
  judgeParticipantId?: string
  trackId?: string
  json?: boolean
}

function parseOptions(args: string[]): TrackAssignOptions {
  const options: TrackAssignOptions = {}
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--judge":
        options.judgeParticipantId = args[++i]
        break
      case "--track":
        options.trackId = args[++i]
        break
      case "--json":
        options.json = true
        break
    }
  }
  return options
}

export async function runTrackAssign(
  client: OatmealClient,
  hackathonId: string,
  args: string[]
): Promise<void> {
  const options = parseOptions(args)

  if (!options.judgeParticipantId || !options.trackId) {
    console.error("Usage: hackathon judging track-assign <hackathon-id> --judge <participant-id> --track <track-id>")
    process.exit(1)
  }

  const result = await client.post<{ assignedCount: number }>(
    `/api/dashboard/hackathons/${hackathonId}/judging/track-assign`,
    {
      judgeParticipantId: options.judgeParticipantId,
      trackId: options.trackId,
    }
  )

  if (options.json) {
    console.log(formatJson(result))
    return
  }

  console.log(formatSuccess(`Assigned judge to track (${result.assignedCount} submissions)`))
}
