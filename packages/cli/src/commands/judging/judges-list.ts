import type { OatmealClient } from "../../client.js"
import { formatJson, formatTable } from "../../output.js"
import type { Judge } from "../../types.js"

export async function runJudgesList(
  client: OatmealClient,
  hackathonId: string,
  options: { json?: boolean }
): Promise<void> {
  const data = await client.get<{ judges: Judge[] }>(
    `/api/dashboard/hackathons/${hackathonId}/judging/judges`
  )

  if (options.json) {
    console.log(formatJson(data))
    return
  }

  if (!data.judges?.length) {
    console.log("No judges found.")
    return
  }

  const rows = data.judges.map((j) => ({
    ...j,
    progress: `${j.completed_count ?? 0}/${j.total_count ?? 0}`,
  }))

  console.log(
    formatTable(rows, [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "progress", label: "Progress" },
    ])
  )
}
