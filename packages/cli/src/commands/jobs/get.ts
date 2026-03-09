import type { OatmealClient } from "../../client.js"
import { formatDetail, formatJson } from "../../output.js"
import type { Job } from "../../types.js"

export async function runJobsGet(
  client: OatmealClient,
  jobId: string,
  options: { json?: boolean }
): Promise<void> {
  if (!jobId) {
    console.error("Usage: hackathon jobs get <job-id>")
    process.exit(1)
  }

  const job = await client.get<Job>(`/api/dashboard/jobs/${jobId}`)

  if (options.json) {
    console.log(formatJson(job))
    return
  }

  console.log(
    formatDetail([
      { label: "ID", value: job.id },
      { label: "Type", value: job.type },
      { label: "Status", value: job.status },
      { label: "Created", value: job.created_at },
      { label: "Completed", value: job.completed_at },
      { label: "Error", value: job.error },
    ])
  )
}
