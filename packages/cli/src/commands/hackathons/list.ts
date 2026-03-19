import type { OatmealClient } from "../../client.js"
import { formatJson, formatTable } from "../../output.js"
import type { Hackathon } from "../../types.js"

export async function runHackathonsList(
  client: OatmealClient,
  options: { json?: boolean }
): Promise<void> {
  const data = await client.get<{ hackathons: Hackathon[] }>("/api/dashboard/hackathons")

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
