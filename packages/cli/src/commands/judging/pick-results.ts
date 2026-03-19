import type { OatmealClient } from "../../client.js"
import { formatJson, formatTable } from "../../output.js"

interface PickResultEntry {
  submissionId: string
  firstPicks: number
  averageRank: number
  totalPicks: number
}

type PickResultsResponse = {
  results: Record<string, PickResultEntry[]>
}

export async function runPickResults(
  client: OatmealClient,
  hackathonId: string,
  options: { json?: boolean }
): Promise<void> {
  const data = await client.get<PickResultsResponse>(
    `/api/dashboard/hackathons/${hackathonId}/judging/pick-results`
  )

  if (options.json) {
    console.log(formatJson(data))
    return
  }

  const entries = Object.entries(data.results)
  if (!entries.length) {
    console.log("No pick results available.")
    return
  }

  for (const [prizeId, picks] of entries) {
    console.log(`\nPrize: ${prizeId}`)
    console.log(
      formatTable(picks, [
        { key: "submissionId", label: "Submission" },
        { key: "firstPicks", label: "1st Picks" },
        { key: "averageRank", label: "Avg Rank" },
        { key: "totalPicks", label: "Total Picks" },
      ])
    )
  }
}
