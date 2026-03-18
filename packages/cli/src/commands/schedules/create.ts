import * as p from "@clack/prompts"
import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"
import type { Schedule } from "../../types.js"

interface ScheduleCreateOptions {
  name?: string
  cron?: string
  json?: boolean
}

export function parseScheduleCreateOptions(args: string[]): ScheduleCreateOptions {
  const options: ScheduleCreateOptions = {}
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--name":
        options.name = args[++i]
        break
      case "--cron":
        options.cron = args[++i]
        break
      case "--json":
        options.json = true
        break
    }
  }
  return options
}

export async function runSchedulesCreate(
  client: OatmealClient,
  args: string[]
): Promise<void> {
  const options = parseScheduleCreateOptions(args)

  let name = options.name
  let cron = options.cron

  if (!name && process.stdout.isTTY) {
    const result = await p.text({ message: "Schedule name:", validate: (v: string) => (v ? undefined : "Required") })
    if (p.isCancel(result)) return
    name = result
  }

  if (!name) {
    console.error("Error: --name is required")
    process.exit(1)
  }

  if (!cron && process.stdout.isTTY) {
    const result = await p.text({ message: "Cron expression:", validate: (v: string) => (v ? undefined : "Required") })
    if (p.isCancel(result)) return
    cron = result
  }

  if (!cron) {
    console.error("Error: --cron is required")
    process.exit(1)
  }

  const schedule = await client.post<Schedule>("/api/dashboard/schedules", {
    name,
    cron_expression: cron,
  })

  if (options.json) {
    console.log(formatJson(schedule))
    return
  }

  console.log(formatSuccess(`Created schedule "${schedule.name}" (${schedule.id})`))
}
