import type { OatmealClient } from "../../client.js"
import { formatJson, formatTable } from "../../output.js"
import type { Job } from "../../types.js"

export async function runJobsList(
  client: OatmealClient,
  args: string[],
  options: { json?: boolean }
): Promise<void> {
  let limit: number | undefined
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit") limit = parseInt(args[++i], 10)
  }

  const data = await client.get<{ jobs: Job[] }>("/api/dashboard/jobs", {
    params: { limit },
  })

  if (options.json) {
    console.log(formatJson(data))
    return
  }

  if (!data.jobs?.length) {
    console.log("No jobs found.")
    return
  }

  console.log(
    formatTable(data.jobs, [
      { key: "id", label: "ID" },
      { key: "type", label: "Type" },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Created" },
    ])
  )
}
