import type { OatmealClient } from "../../client.js"
import { formatJson, formatTable } from "../../output.js"
import type { Prize } from "../../types.js"

export async function runPrizesList(
  client: OatmealClient,
  hackathonId: string,
  options: { json?: boolean }
): Promise<void> {
  const data = await client.get<{ prizes: Prize[] }>(
    `/api/dashboard/hackathons/${hackathonId}/prizes`
  )

  if (options.json) {
    console.log(formatJson(data))
    return
  }

  if (!data.prizes?.length) {
    console.log("No prizes found.")
    return
  }

  console.log(
    formatTable(data.prizes, [
      { key: "name", label: "Name" },
      { key: "type", label: "Type" },
      { key: "value", label: "Value" },
      { key: "assigned_submission_name", label: "Assigned To" },
    ])
  )
}
