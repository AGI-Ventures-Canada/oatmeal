"use step"

import type { Json } from "@/lib/db/types"

export async function markJobRunning(jobId: string): Promise<void> {
  const { updateJobStatus } = await import("@/lib/services/jobs")
  await updateJobStatus(jobId, "running")
}

export async function markJobCompleted(
  jobId: string,
  status: "succeeded" | "failed",
  result?: Json
): Promise<void> {
  const { updateJobStatus } = await import("@/lib/services/jobs")
  await updateJobStatus(jobId, status, { result })
}

export async function markJobFailed(
  jobId: string,
  error: { message: string; code?: string }
): Promise<void> {
  const { updateJobStatus } = await import("@/lib/services/jobs")
  await updateJobStatus(jobId, "failed", { error })
}

export type ExecuteJobInput = {
  type: string
  input: Json
}

export async function executeJob(input: ExecuteJobInput): Promise<Json> {
  const handlers = await import("./handlers")

  const handler = handlers.jobHandlers[input.type]
  if (!handler) {
    throw new Error(`Unknown job type: ${input.type}`)
  }

  return await handler(input.input)
}
