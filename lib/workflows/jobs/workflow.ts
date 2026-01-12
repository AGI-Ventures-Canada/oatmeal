"use workflow"

import type { Json } from "@/lib/db/types"

export type JobWorkflowInput = {
  jobId: string
  tenantId: string
  type: string
  input: Json
}

export type JobWorkflowResult = {
  status: "succeeded" | "failed"
  result?: Json
  error?: { message: string; code?: string }
}

export async function runJobWorkflow(input: JobWorkflowInput): Promise<JobWorkflowResult> {
  const { markJobRunning } = await import("./steps")
  const { executeJob } = await import("./steps")
  const { markJobCompleted } = await import("./steps")

  try {
    await markJobRunning(input.jobId)

    const result = await executeJob({
      type: input.type,
      input: input.input,
    })

    await markJobCompleted(input.jobId, "succeeded", result)

    return {
      status: "succeeded",
      result,
    }
  } catch (err) {
    const error = {
      message: err instanceof Error ? err.message : "Unknown error",
      code: "EXECUTION_ERROR",
    }

    const { markJobFailed } = await import("./steps")
    await markJobFailed(input.jobId, error)

    return {
      status: "failed",
      error,
    }
  }
}
