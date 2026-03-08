import type { OatmealClient } from "../../client.js"
import { formatJson, formatTable } from "../../output.js"
import type { Submission } from "../../types.js"

export async function runBrowseSubmissions(
  client: OatmealClient,
  slug: string,
  options: { json?: boolean }
): Promise<void> {
  if (!slug) {
    console.error("Usage: oatmeal browse submissions <slug>")
    process.exit(1)
  }

  const data = await client.get<{ submissions: Submission[] }>(
    `/api/public/hackathons/${encodeURIComponent(slug)}/submissions`
  )

  if (options.json) {
    console.log(formatJson(data))
    return
  }

  if (!data.submissions?.length) {
    console.log("No submissions found.")
    return
  }

  console.log(
    formatTable(data.submissions, [
      { key: "name", label: "Name" },
      { key: "team_name", label: "Team" },
      { key: "submitted_at", label: "Submitted" },
    ])
  )
}
