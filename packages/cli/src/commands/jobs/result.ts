import type { OatmealClient } from "../../client.js"
import { formatJson } from "../../output.js"
import { POLL_INTERVAL_MS } from "../../constants.js"

interface JobResultOptions {
  poll?: boolean
  json?: boolean
}

export function parseJobResultOptions(args: string[]): JobResultOptions {
  const options: JobResultOptions = {}
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--poll":
        options.poll = true
        break
      case "--json":
        options.json = true
        break
    }
  }
  return options
}

export async function runJobsResult(
  client: OatmealClient,
  jobId: string,
  args: string[]
): Promise<void> {
  if (!jobId) {
    console.error("Usage: hackathon jobs result <job-id>")
    process.exit(1)
  }

  const options = parseJobResultOptions(args)

  if (options.poll) {
    let attempts = 0
    const maxAttempts = 60
    while (attempts < maxAttempts) {
      const result = await client.get<{ status: string; result?: unknown }>(
        `/api/v1/jobs/${jobId}/result`
      )
      if (result.status === "completed" || result.result) {
        console.log(formatJson(result))
        return
      }
      console.error(`Job still running (attempt ${++attempts}/${maxAttempts})...`)
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    }
    console.error("Timed out waiting for job result.")
    process.exit(1)
  }

  const result = await client.get<{ status: string; result?: unknown }>(
    `/api/v1/jobs/${jobId}/result`
  )

  if (result.status !== "completed" && !result.result) {
    console.log(`Job is still ${result.status}. Use --poll to wait for completion.`)
    return
  }

  console.log(formatJson(result))
}
