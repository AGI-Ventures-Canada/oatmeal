import type { OatmealClient } from "../../client.js"
import { formatJson, formatTable } from "../../output.js"
import type { PickResults } from "../../types.js"

export async function runPickResults(
  client: OatmealClient,
  hackathonId: string,
  options: { json?: boolean }
): Promise<void> {
  const data = await client.get<PickResults>(
    `/api/dashboard/hackathons/${hackathonId}/judging/pick-results`
  )

  if (options.json) {
    console.log(formatJson(data))
    return
  }

  if (!data.picks?.length) {
    console.log("No pick results available.")
    return
  }

  const rows = data.picks.map((pick) => ({
    ...pick,
    judges_list: pick.judges.join(", "),
  }))

  console.log(
    formatTable(rows, [
      { key: "submission_name", label: "Submission" },
      { key: "pick_count", label: "Picks" },
      { key: "judges_list", label: "Judges" },
    ])
  )
}
