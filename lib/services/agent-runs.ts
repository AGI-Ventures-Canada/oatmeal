import { supabase as getSupabase } from "@/lib/db/client"
import type { AgentRun, AgentRunStatus, AgentStep, TriggerType } from "@/lib/db/agent-types"
import type { Json } from "@/lib/db/types"

export type CreateAgentRunInput = {
  tenantId: string
  agentId: string
  triggerType?: TriggerType
  input?: Json
  createdByKeyId?: string
  idempotencyKey?: string
}

export type UpdateAgentRunInput = {
  status?: AgentRunStatus
  workflowRunId?: string
  sandboxId?: string
  output?: Json
  error?: Json
  tokenUsage?: Json
}

export type ListAgentRunsOptions = {
  limit?: number
  offset?: number
  status?: AgentRunStatus
  agentId?: string
}

export async function createAgentRun(
  input: CreateAgentRunInput
): Promise<AgentRun | null> {
  const { data, error } = await getSupabase()
    .from("agent_runs")
    .insert({
      tenant_id: input.tenantId,
      agent_id: input.agentId,
      trigger_type: input.triggerType ?? "manual",
      input: input.input ?? null,
      created_by_key_id: input.createdByKeyId ?? null,
      idempotency_key: input.idempotencyKey ?? null,
      status: "queued",
    })
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to create agent run:", error)
    return null
  }

  return data as AgentRun
}

export async function getAgentRunById(
  runId: string,
  tenantId: string
): Promise<AgentRun | null> {
  const { data } = await getSupabase()
    .from("agent_runs")
    .select("*")
    .eq("id", runId)
    .eq("tenant_id", tenantId)
    .single()

  return data as AgentRun | null
}

export async function listAgentRuns(
  tenantId: string,
  options: ListAgentRunsOptions = {}
): Promise<AgentRun[]> {
  let query = getSupabase()
    .from("agent_runs")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (options.status) {
    query = query.eq("status", options.status)
  }
  if (options.agentId) {
    query = query.eq("agent_id", options.agentId)
  }
  if (options.limit) {
    query = query.limit(options.limit)
  }
  if (options.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit ?? 50) - 1
    )
  }

  const { data } = await query

  return (data as AgentRun[] | null) ?? []
}

export async function updateAgentRunStatus(
  runId: string,
  status: AgentRunStatus,
  updates: UpdateAgentRunInput = {}
): Promise<AgentRun | null> {
  const updateData: Record<string, unknown> = {
    status,
  }

  if (updates.workflowRunId !== undefined) {
    updateData.workflow_run_id = updates.workflowRunId
  }
  if (updates.sandboxId !== undefined) {
    updateData.sandbox_id = updates.sandboxId
  }
  if (updates.output !== undefined) {
    updateData.output = updates.output
  }
  if (updates.error !== undefined) {
    updateData.error = updates.error
  }
  if (updates.tokenUsage !== undefined) {
    updateData.token_usage = updates.tokenUsage
  }

  if (status === "initializing" || status === "running") {
    updateData.started_at = new Date().toISOString()
  }
  if (
    status === "succeeded" ||
    status === "failed" ||
    status === "canceled" ||
    status === "timed_out"
  ) {
    updateData.completed_at = new Date().toISOString()
  }

  const { data, error } = await getSupabase()
    .from("agent_runs")
    .update(updateData)
    .eq("id", runId)
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to update agent run:", error)
    return null
  }

  return data as AgentRun
}

export async function appendAgentRunStep(
  runId: string,
  step: AgentStep
): Promise<boolean> {
  const { data: run } = await getSupabase()
    .from("agent_runs")
    .select("steps")
    .eq("id", runId)
    .single()

  if (!run) {
    console.error("Agent run not found:", runId)
    return false
  }

  const steps = (run.steps as unknown as AgentStep[]) ?? []
  steps.push(step)

  const { error } = await getSupabase()
    .from("agent_runs")
    .update({ steps: steps as unknown as Json[] })
    .eq("id", runId)

  if (error) {
    console.error("Failed to append step:", error)
    return false
  }

  return true
}

export async function markRunInitializing(runId: string): Promise<AgentRun | null> {
  return updateAgentRunStatus(runId, "initializing")
}

export async function markRunRunning(
  runId: string,
  updates?: { workflowRunId?: string; sandboxId?: string }
): Promise<AgentRun | null> {
  return updateAgentRunStatus(runId, "running", updates)
}

export async function markRunAwaitingInput(runId: string): Promise<AgentRun | null> {
  return updateAgentRunStatus(runId, "awaiting_input")
}

export async function markRunCompleted(
  runId: string,
  output: Json,
  tokenUsage?: Json
): Promise<AgentRun | null> {
  return updateAgentRunStatus(runId, "succeeded", { output, tokenUsage })
}

export async function markRunFailed(
  runId: string,
  error: { message: string; code?: string }
): Promise<AgentRun | null> {
  return updateAgentRunStatus(runId, "failed", { error })
}

export async function markRunCanceled(runId: string): Promise<AgentRun | null> {
  return updateAgentRunStatus(runId, "canceled")
}

export async function markRunTimedOut(runId: string): Promise<AgentRun | null> {
  return updateAgentRunStatus(runId, "timed_out")
}

export async function cancelAgentRun(
  runId: string,
  tenantId: string
): Promise<boolean> {
  const run = await getAgentRunById(runId, tenantId)
  if (!run) return false

  if (run.status !== "queued" && run.status !== "running" && run.status !== "awaiting_input") {
    return false
  }

  const updated = await markRunCanceled(runId)
  return updated !== null
}

export async function listAgentRunSteps(
  runId: string,
  tenantId: string
): Promise<AgentStep[]> {
  const run = await getAgentRunById(runId, tenantId)
  if (!run) return []

  return (run.steps as unknown as AgentStep[]) ?? []
}

export async function provideHumanInput(
  runId: string,
  tenantId: string,
  input: Json
): Promise<AgentRun | null> {
  const run = await getAgentRunById(runId, tenantId)
  if (!run) return null

  if (run.status !== "awaiting_input") {
    console.error("Run is not awaiting input:", runId, run.status)
    return null
  }

  const steps = (run.steps as unknown as AgentStep[]) ?? []
  const now = new Date().toISOString()
  steps.push({
    id: `human-input-${Date.now()}`,
    step_number: steps.length + 1,
    type: "text",
    content: JSON.stringify(input),
    timestamp: now,
    created_at: now,
  })

  const { data, error } = await getSupabase()
    .from("agent_runs")
    .update({
      status: "running",
      steps: steps as unknown as Json[],
    })
    .eq("id", runId)
    .eq("tenant_id", tenantId)
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to provide human input:", error)
    return null
  }

  return data as AgentRun
}
