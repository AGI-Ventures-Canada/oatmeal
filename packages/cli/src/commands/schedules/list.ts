import type { OatmealClient } from "../../client.js"
import { formatJson, formatTable } from "../../output.js"
import type { Schedule } from "../../types.js"

export async function runSchedulesList(
  client: OatmealClient,
  options: { json?: boolean }
): Promise<void> {
  const data = await client.get<{ schedules: Schedule[] }>("/api/dashboard/schedules")

  if (options.json) {
    console.log(formatJson(data))
    return
  }

  if (!data.schedules?.length) {
    console.log("No schedules found.")
    return
  }

  const rows = data.schedules.map((s) => ({
    ...s,
    enabled_str: s.enabled ? "Enabled" : "Disabled",
  }))

  console.log(
    formatTable(rows, [
      { key: "name", label: "Name" },
      { key: "cron_expression", label: "Cron" },
      { key: "enabled_str", label: "Status" },
      { key: "next_run_at", label: "Next Run" },
    ])
  )
}
