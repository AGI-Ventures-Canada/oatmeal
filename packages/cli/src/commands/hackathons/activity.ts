import type { OatmealClient } from "../../client.js"
import { formatJson, formatTable } from "../../output.js"
import { resolveHackathonId } from "./resolve.js"

type ActivityLog = {
  id: string
  action: string
  resourceType: string
  resourceId: string | null
  actorType: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

type ActivityResponse = {
  logs: ActivityLog[]
  total: number
}

function parseArgs(args: string[]): { json?: boolean; limit?: number; offset?: number; action?: string } {
  const options: { json?: boolean; limit?: number; offset?: number; action?: string } = {}
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--json":
        options.json = true
        break
      case "--limit":
        options.limit = parseInt(args[++i])
        break
      case "--offset":
        options.offset = parseInt(args[++i])
        break
      case "--action":
        options.action = args[++i]
        break
    }
  }
  return options
}

export async function runHackathonsActivity(
  client: OatmealClient,
  idOrSlug: string,
  args: string[]
): Promise<void> {
  if (!idOrSlug) {
    console.error("Usage: hackathon events activity <id-or-slug> [--limit N] [--offset N] [--action filter]")
    process.exit(1)
  }

  const options = parseArgs(args)
  const id = await resolveHackathonId(client, idOrSlug)

  const params = new URLSearchParams()
  if (options.limit) params.set("limit", String(options.limit))
  if (options.offset) params.set("offset", String(options.offset))
  if (options.action) params.set("action", options.action)

  const qs = params.toString()
  const data = await client.get<ActivityResponse>(`/api/v1/hackathons/${id}/activity${qs ? `?${qs}` : ""}`)

  if (options.json) {
    console.log(formatJson(data))
    return
  }

  if (!data.logs?.length) {
    console.log("No activity recorded for this event.")
    return
  }

  console.log(`${data.total} total events\n`)
  console.log(
    formatTable(data.logs, [
      { key: "action", label: "Action" },
      { key: "resourceType", label: "Resource" },
      { key: "actorType", label: "Actor" },
      { key: "createdAt", label: "Time" },
    ])
  )
}
