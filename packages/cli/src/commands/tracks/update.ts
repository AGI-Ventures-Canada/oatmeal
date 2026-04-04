import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"

interface TrackUpdateOptions {
  name?: string
  description?: string
  intent?: string
  displayOrder?: number
  json?: boolean
}

function parseOptions(args: string[]): TrackUpdateOptions {
  const options: TrackUpdateOptions = {}
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--name":
        options.name = args[++i]
        break
      case "--description":
        options.description = args[++i]
        break
      case "--intent":
        options.intent = args[++i]
        break
      case "--display-order":
        options.displayOrder = Number(args[++i])
        break
      case "--json":
        options.json = true
        break
    }
  }
  return options
}

export async function runTracksUpdate(
  client: OatmealClient,
  hackathonId: string,
  trackId: string,
  args: string[]
): Promise<void> {
  if (!trackId) {
    console.error("Usage: hackathon tracks update <hackathon-id> <track-id> [--name ...]")
    process.exit(1)
  }

  const options = parseOptions(args)
  const body: Record<string, unknown> = {}
  if (options.name) body.name = options.name
  if (options.description) body.description = options.description
  if (options.intent) body.intent = options.intent
  if (options.displayOrder !== undefined) body.displayOrder = options.displayOrder

  if (Object.keys(body).length === 0) {
    console.error("Error: provide at least one field to update")
    process.exit(1)
  }

  const result = await client.patch<{ id: string; updatedAt: string }>(
    `/api/dashboard/hackathons/${hackathonId}/prize-tracks/${trackId}`,
    body
  )

  if (options.json) {
    console.log(formatJson(result))
    return
  }

  console.log(formatSuccess(`Updated track ${result.id}`))
}
