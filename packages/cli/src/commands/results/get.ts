import type { OatmealClient } from "../../client.js"
import { formatJson, formatTable } from "../../output.js"
import type { ResultsData } from "../../types.js"

export async function runResultsGet(
  client: OatmealClient,
  hackathonId: string,
  options: { json?: boolean }
): Promise<void> {
  if (!hackathonId) {
    console.error("Usage: oatmeal results get <hackathon-id>")
    process.exit(1)
  }

  const data = await client.get<ResultsData>(
    `/api/dashboard/hackathons/${hackathonId}/results`
  )

  if (options.json) {
    console.log(formatJson(data))
    return
  }

  if (!data.rankings?.length) {
    console.log("No results available. Run 'oatmeal results calculate <id>' first.")
    return
  }

  console.log(
    formatTable(data.rankings, [
      { key: "rank", label: "#" },
      { key: "submission_name", label: "Submission" },
      { key: "team_name", label: "Team" },
      { key: "total_score", label: "Score" },
    ])
  )
}
