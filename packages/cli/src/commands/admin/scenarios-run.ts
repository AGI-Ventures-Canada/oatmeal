import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"

interface ScenarioResult {
  hackathonId: string
  tenantId: string
  scenario: string
}

export async function runAdminScenariosRun(
  client: OatmealClient,
  name: string,
  args: string[],
  options: { json?: boolean }
): Promise<void> {
  if (!name) {
    console.error("Usage: hackathon admin scenarios run <name> [--tenant-id <id>]")
    process.exit(1)
  }

  let tenantId: string | undefined

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tenant-id") {
      tenantId = args[++i]
    }
  }

  const body = tenantId ? { tenant_id: tenantId } : {}
  const result = await client.post<ScenarioResult>(`/api/admin/scenarios/${name}`, body)

  if (options.json) {
    console.log(formatJson(result))
    return
  }

  console.log(formatSuccess(`Ran scenario "${name}"`))
  console.log(`  Hackathon ID: ${result.hackathonId}`)
  console.log(`  Tenant ID:    ${result.tenantId}`)
}
