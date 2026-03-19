import type { OatmealClient } from "../../client.js"
import { formatJson, formatTable } from "../../output.js"
import type { ResultsData } from "../../types.js"

export async function runBrowseResults(
  client: OatmealClient,
  slug: string,
  options: { json?: boolean }
): Promise<void> {
  if (!slug) {
    console.error("Usage: hackathon browse results <slug>")
    process.exit(1)
  }

  const data = await client.get<ResultsData>(
    `/api/public/hackathons/${encodeURIComponent(slug)}/results`
  )

  if (options.json) {
    console.log(formatJson(data))
    return
  }

  if (!data.isPublished) {
    console.log("Results have not been published yet.")
    return
  }

  if (!data.results?.length) {
    console.log("No rankings available.")
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
