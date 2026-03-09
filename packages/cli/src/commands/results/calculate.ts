import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"

export async function runResultsCalculate(
  client: OatmealClient,
  hackathonId: string,
  options: { json?: boolean }
): Promise<void> {
  if (!hackathonId) {
    console.error("Usage: hackathon results calculate <hackathon-id>")
    process.exit(1)
  }

  const result = await client.post<{ message: string }>(
    `/api/dashboard/hackathons/${hackathonId}/results/calculate`
  )

  if (options.json) {
    console.log(formatJson(result))
    return
  }

  console.log(formatSuccess(result.message ?? "Results calculated"))
}
