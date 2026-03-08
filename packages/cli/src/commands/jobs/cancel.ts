import * as p from "@clack/prompts"
import type { OatmealClient } from "../../client.js"
import { formatSuccess } from "../../output.js"

export async function runJobsCancel(
  client: OatmealClient,
  jobId: string,
  options: { yes?: boolean }
): Promise<void> {
  if (!jobId) {
    console.error("Usage: oatmeal jobs cancel <job-id>")
    process.exit(1)
  }

  if (!options.yes) {
    const confirm = await p.confirm({ message: `Cancel job ${jobId}?` })
    if (p.isCancel(confirm) || !confirm) {
      p.log.info("Cancelled.")
      return
    }
  }

  await client.post(`/api/v1/jobs/${jobId}/cancel`)
  console.log(formatSuccess(`Cancelled job ${jobId}`))
}
