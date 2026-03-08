import * as p from "@clack/prompts"
import type { OatmealClient } from "../../client.js"
import { formatSuccess } from "../../output.js"

export async function runSchedulesDelete(
  client: OatmealClient,
  scheduleId: string,
  options: { yes?: boolean }
): Promise<void> {
  if (!scheduleId) {
    console.error("Usage: oatmeal schedules delete <schedule-id>")
    process.exit(1)
  }

  if (!options.yes) {
    const confirm = await p.confirm({ message: `Delete schedule ${scheduleId}?` })
    if (p.isCancel(confirm) || !confirm) {
      p.log.info("Cancelled.")
      return
    }
  }

  await client.delete(`/api/dashboard/schedules/${scheduleId}`)
  console.log(formatSuccess(`Deleted schedule ${scheduleId}`))
}
