import type { OatmealClient } from "../../client.js"
import { formatDetail, formatJson } from "../../output.js"
import type { OrgProfile } from "../../types.js"

export async function runBrowseOrg(
  client: OatmealClient,
  slug: string,
  options: { json?: boolean }
): Promise<void> {
  if (!slug) {
    console.error("Usage: hackathon browse org <slug>")
    process.exit(1)
  }

  const data = await client.get<OrgProfile>(
    `/api/public/orgs/${encodeURIComponent(slug)}`
  )

  if (options.json) {
    console.log(formatJson(data))
    return
  }

  console.log(
    formatDetail([
      { label: "Name", value: data.name },
      { label: "Slug", value: data.slug },
      { label: "Description", value: data.description },
      { label: "Hackathons", value: String(data.organizedHackathons?.length ?? 0) },
    ])
  )
}
