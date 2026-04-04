import * as p from "@clack/prompts"
import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"

interface TrackCreateOptions {
  name?: string
  description?: string
  intent?: string
  style?: string
  json?: boolean
}

function parseOptions(args: string[]): TrackCreateOptions {
  const options: TrackCreateOptions = {}
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
      case "--style":
        options.style = args[++i]
        break
      case "--json":
        options.json = true
        break
    }
  }
  return options
}

export async function runTracksCreate(
  client: OatmealClient,
  hackathonId: string,
  args: string[]
): Promise<void> {
  const options = parseOptions(args)

  let name = options.name

  if (!name && process.stdout.isTTY) {
    const result = await p.text({ message: "Track name:", validate: (v: string) => (v ? undefined : "Required") })
    if (p.isCancel(result)) return
    name = result
  }

  if (!name) {
    console.error("Error: --name is required")
    process.exit(1)
  }

  const body: Record<string, unknown> = { name }
  if (options.description) body.description = options.description
  if (options.intent) body.intent = options.intent
  if (options.style) body.style = options.style

  const track = await client.post<{ id: string; name: string; intent: string }>(
    `/api/dashboard/hackathons/${hackathonId}/prize-tracks`,
    body
  )

  if (options.json) {
    console.log(formatJson(track))
    return
  }

  console.log(formatSuccess(`Created track "${track.name}" (${track.id})`))
}
