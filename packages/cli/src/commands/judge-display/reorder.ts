import type { OatmealClient } from "../../client.js"
import { formatSuccess } from "../../output.js"

export async function runJudgeDisplayReorder(
  client: OatmealClient,
  hackathonId: string,
  args: string[]
): Promise<void> {
  let ids: string[] = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--ids") {
      ids = args[++i]?.split(",").map((s) => s.trim()) ?? []
    }
  }

  if (!ids.length) {
    console.error("Error: --ids is required (comma-separated profile IDs in desired order)")
    process.exit(1)
  }

  await client.post(
    `/api/dashboard/hackathons/${hackathonId}/judges/display/reorder`,
    { orderedIds: ids }
  )
  console.log(formatSuccess(`Reordered ${ids.length} judge display profiles`))
}
