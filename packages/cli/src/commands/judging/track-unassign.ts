import * as p from "@clack/prompts"
import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"

interface TrackUnassignOptions {
  judgeParticipantId?: string
  trackId?: string
  json?: boolean
  yes?: boolean
}

function parseOptions(args: string[]): TrackUnassignOptions {
  const options: TrackUnassignOptions = {}
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
      case "--yes":
      case "-y":
        options.yes = true
        break
    }
  }
  return options
}

export async function runTrackUnassign(
  client: OatmealClient,
  hackathonId: string,
  args: string[]
): Promise<void> {
  const options = parseOptions(args)

  if (!options.judgeParticipantId || !options.trackId) {
    console.error("Usage: hackathon judging track-unassign <hackathon-id> --judge <participant-id> --track <track-id>")
    process.exit(1)
  }

  if (!options.yes) {
    const confirm = await p.confirm({ message: "Remove judge from this track?" })
    if (p.isCancel(confirm) || !confirm) {
      p.log.info("Cancelled.")
      return
    }
  }

  const result = await client.delete<{ removedCount: number }>(
    `/api/dashboard/hackathons/${hackathonId}/judging/track-assign`,
    {
      body: {
        judgeParticipantId: options.judgeParticipantId,
        trackId: options.trackId,
      },
    }
  )

  if (options.json) {
    console.log(formatJson(result))
    return
  }

  console.log(formatSuccess(`Removed judge from track (${result.removedCount} assignments removed)`))
}
