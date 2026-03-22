import type { OatmealClient } from "../../client.js"
import { formatJson, formatTable } from "../../output.js"

interface Scenario {
  name: string
  description: string
}

export async function runAdminScenariosList(
  client: OatmealClient,
  options: { json?: boolean }
): Promise<void> {
  const data = await client.get<{ scenarios: Scenario[] }>("/api/admin/scenarios")

  if (options.json) {
    console.log(formatJson(data))
    return
  }

  if (!data.scenarios?.length) {
    console.log("No scenarios available.")
    return
  }

  console.log(
    formatTable(data.scenarios, [
      { key: "name", label: "Name" },
      { key: "description", label: "Description" },
    ])
  )
}
