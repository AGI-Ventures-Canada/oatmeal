import type { OatmealClient } from "../../client.js"
import { formatJson, formatTable } from "../../output.js"

interface AdminHackathon {
  id: string
  name: string
  slug: string
  status: string
  tenant_id: string
  starts_at: string | null
  ends_at: string | null
}

export async function runAdminHackathonsList(
  client: OatmealClient,
  args: string[],
  options: { json?: boolean }
): Promise<void> {
  const params = new URLSearchParams()

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--status":
        params.set("status", args[++i])
        break
      case "--search":
        params.set("search", args[++i])
        break
      case "--tenant-id":
        params.set("tenant_id", args[++i])
        break
      case "--limit":
        params.set("limit", args[++i])
        break
      case "--offset":
        params.set("offset", args[++i])
        break
    }
  }

  const query = params.toString()
  const url = `/api/admin/hackathons${query ? `?${query}` : ""}`
  const data = await client.get<{ hackathons: AdminHackathon[]; total: number }>(url)

  if (options.json) {
    console.log(formatJson(data))
    return
  }

  if (!data.hackathons?.length) {
    console.log("No hackathons found.")
    return
  }

  console.log(`Total: ${data.total}`)
  console.log(
    formatTable(data.hackathons, [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "status", label: "Status" },
      { key: "tenant_id", label: "Tenant ID" },
      { key: "starts_at", label: "Starts" },
      { key: "ends_at", label: "Ends" },
    ])
  )
}
