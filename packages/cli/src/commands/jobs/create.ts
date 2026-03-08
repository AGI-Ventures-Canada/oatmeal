import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"
import type { Job } from "../../types.js"

interface JobCreateOptions {
  type?: string
  input?: string
  idempotencyKey?: string
  json?: boolean
}

export function parseJobCreateOptions(args: string[]): JobCreateOptions {
  const options: JobCreateOptions = {}
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--type":
        options.type = args[++i]
        break
      case "--input":
        options.input = args[++i]
        break
      case "--idempotency-key":
        options.idempotencyKey = args[++i]
        break
      case "--json":
        options.json = true
        break
    }
  }
  return options
}

export async function runJobsCreate(
  client: OatmealClient,
  args: string[]
): Promise<void> {
  const options = parseJobCreateOptions(args)

  if (!options.type) {
    console.error("Error: --type is required")
    process.exit(1)
  }

  let input: Record<string, unknown> | undefined
  if (options.input) {
    try {
      input = JSON.parse(options.input)
    } catch {
      console.error("Error: --input must be valid JSON")
      process.exit(1)
    }
  }

  const body: Record<string, unknown> = { type: options.type }
  if (input) body.input = input
  if (options.idempotencyKey) body.idempotency_key = options.idempotencyKey

  const job = await client.post<Job>("/api/v1/jobs", body)

  if (options.json) {
    console.log(formatJson(job))
    return
  }

  console.log(formatSuccess(`Created job ${job.id} (status: ${job.status})`))
}
