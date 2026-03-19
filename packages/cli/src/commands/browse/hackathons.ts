import type { OatmealClient } from "../../client.js"
import { formatJson, formatTable } from "../../output.js"
import type { Hackathon } from "../../types.js"

interface BrowseHackathonsOptions {
  search?: string
  page?: number
  limit?: number
  json?: boolean
}

export function parseBrowseHackathonsOptions(args: string[]): BrowseHackathonsOptions {
  const options: BrowseHackathonsOptions = {}
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--search":
      case "-s":
        options.search = args[++i]
        break
      case "--page":
        options.page = parseInt(args[++i], 10)
        break
      case "--limit":
        options.limit = parseInt(args[++i], 10)
        break
      case "--json":
        options.json = true
        break
    }
  }
  return options
}

export async function runBrowseHackathons(
  client: OatmealClient,
  args: string[]
): Promise<void> {
  const options = parseBrowseHackathonsOptions(args)

  const params: Record<string, string | number | undefined> = {
    q: options.search,
    page: options.page,
    limit: options.limit,
  }

  const data = await client.get<{ hackathons: Hackathon[] }>("/api/public/hackathons", {
    params,
  })

  if (options.json) {
    console.log(formatJson(data))
    return
  }

  if (!data.hackathons?.length) {
    console.log("No hackathons found.")
    return
  }

  console.log(
    formatTable(data.hackathons, [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "status", label: "Status" },
      { key: "startsAt", label: "Starts" },
      { key: "endsAt", label: "Ends" },
    ])
  )
}
