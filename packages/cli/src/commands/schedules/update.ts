import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"
import type { Schedule } from "../../types.js"

interface ScheduleUpdateOptions {
  name?: string
  cron?: string
  enabled?: boolean
  json?: boolean
}

export function parseScheduleUpdateOptions(args: string[]): ScheduleUpdateOptions {
  const options: ScheduleUpdateOptions = {}
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--name":
        options.name = args[++i]
        break
      case "--cron":
        options.cron = args[++i]
        break
      case "--enable":
        options.enabled = true
        break
      case "--disable":
        options.enabled = false
        break
      case "--json":
        options.json = true
        break
    }
  }
  return options
}

export async function runSchedulesUpdate(
  client: OatmealClient,
  scheduleId: string,
  args: string[]
): Promise<void> {
  if (!scheduleId) {
    console.error("Usage: oatmeal schedules update <schedule-id> [--name ...] [--cron ...]")
    process.exit(1)
  }

  const options = parseScheduleUpdateOptions(args)
  const body: Record<string, unknown> = {}
  if (options.name) body.name = options.name
  if (options.cron) body.cron_expression = options.cron
  if (options.enabled !== undefined) body.enabled = options.enabled

  if (Object.keys(body).length === 0) {
    console.error("Error: provide at least one field to update")
    process.exit(1)
  }

  const schedule = await client.patch<Schedule>(
    `/api/dashboard/schedules/${scheduleId}`,
    body
  )

  if (options.json) {
    console.log(formatJson(schedule))
    return
  }

  console.log(formatSuccess(`Updated schedule "${schedule.name}"`))
}
