import type { OatmealClient } from "../../client.js"
import { formatDetail, formatJson } from "../../output.js"
import type { Schedule } from "../../types.js"

export async function runSchedulesGet(
  client: OatmealClient,
  scheduleId: string,
  options: { json?: boolean }
): Promise<void> {
  if (!scheduleId) {
    console.error("Usage: hackathon schedules get <schedule-id>")
    process.exit(1)
  }

  const schedule = await client.get<Schedule>(`/api/dashboard/schedules/${scheduleId}`)

  if (options.json) {
    console.log(formatJson(schedule))
    return
  }

  console.log(
    formatDetail([
      { label: "ID", value: schedule.id },
      { label: "Name", value: schedule.name },
      { label: "Cron", value: schedule.cronExpression },
      { label: "Enabled", value: String(schedule.isActive) },
      { label: "Last Run", value: schedule.lastRunAt },
      { label: "Next Run", value: schedule.nextRunAt },
      { label: "Created", value: schedule.createdAt },
    ])
  )
}
