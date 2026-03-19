import type { OatmealClient } from "../../client.js"
import { formatJson, formatTable } from "../../output.js"
import type { ResultsData } from "../../types.js"

export async function runResultsGet(
  client: OatmealClient,
  hackathonId: string,
  options: { json?: boolean }
): Promise<void> {
  if (!hackathonId) {
    console.error("Usage: hackathon results get <hackathon-id>")
    process.exit(1)
  }

  const data = await client.get<ResultsData>(
    `/api/dashboard/hackathons/${hackathonId}/results`
  )

  if (options.json) {
    console.log(formatJson(data))
    return
  }

  if (!data.results?.length) {
    console.log("No results available. Run 'hackathon results calculate <id>' first.")
    return
  }

  console.log(
    formatTable(data.results, [
      { key: "rank", label: "#" },
      { key: "submissionTitle", label: "Submission" },
      { key: "teamName", label: "Team" },
      { key: "totalScore", label: "Score" },
    ])
  )
}
