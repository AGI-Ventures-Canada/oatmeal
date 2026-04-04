import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"

interface RoundUpdateOptions {
  name?: string
  style?: string
  status?: string
  advancement?: string
  json?: boolean
}

function parseOptions(args: string[]): RoundUpdateOptions {
  const options: RoundUpdateOptions = {}
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--name":
        options.name = args[++i]
        break
      case "--style":
        options.style = args[++i]
        break
      case "--status":
        options.status = args[++i]
        break
      case "--advancement":
        options.advancement = args[++i]
        break
      case "--json":
        options.json = true
        break
    }
  }
  return options
}

export async function runTracksUpdateRound(
  client: OatmealClient,
  hackathonId: string,
  trackId: string,
  roundId: string,
  args: string[]
): Promise<void> {
  if (!trackId || !roundId) {
    console.error("Usage: hackathon tracks update-round <hackathon-id> <track-id> <round-id> [--style ...]")
    process.exit(1)
  }

  const options = parseOptions(args)
  const body: Record<string, unknown> = {}
  if (options.name) body.name = options.name
  if (options.style) body.style = options.style
  if (options.status) body.status = options.status
  if (options.advancement) body.advancement = options.advancement

  if (Object.keys(body).length === 0) {
    console.error("Error: provide at least one field to update")
    process.exit(1)
  }

  const result = await client.patch<{ id: string; status: string; style: string }>(
    `/api/dashboard/hackathons/${hackathonId}/prize-tracks/${trackId}/rounds/${roundId}`,
    body
  )

  if (options.json) {
    console.log(formatJson(result))
    return
  }

  console.log(formatSuccess(`Updated round ${result.id} [${result.style}, ${result.status}]`))
}
