import type { OatmealClient } from "../../client.js"
import { formatJson, formatTable } from "../../output.js"

interface PlatformStats {
  tenants: number
  hackathons: number
  participants: number
  submissions: number
}

export async function runAdminStats(
  client: OatmealClient,
  options: { json?: boolean }
): Promise<void> {
  const stats = await client.get<PlatformStats>("/api/admin/stats")

  if (options.json) {
    console.log(formatJson(stats))
    return
  }

  console.log(
    formatTable(
      [
        { metric: "Tenants", value: stats.tenants },
        { metric: "Hackathons", value: stats.hackathons },
        { metric: "Participants", value: stats.participants },
        { metric: "Submissions", value: stats.submissions },
      ],
      [
        { key: "metric", label: "Metric" },
        { key: "value", label: "Count" },
      ]
    )
  )
}
