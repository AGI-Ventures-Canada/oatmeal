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
    activeStr: s.isActive ? "Enabled" : "Disabled",
  }))

  console.log(
    formatTable(rows, [
      { key: "name", label: "Name" },
      { key: "cronExpression", label: "Cron" },
      { key: "activeStr", label: "Status" },
      { key: "nextRunAt", label: "Next Run" },
    ])
  )
}
