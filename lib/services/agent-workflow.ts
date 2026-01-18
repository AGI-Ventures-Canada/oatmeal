import type { AgentTriggerInput } from "@/lib/services/triggers"
import type { AgentRun } from "@/lib/db/agent-types"

export interface StartAgentWorkflowInput {
  run: AgentRun
  agentId: string
  tenantId: string
  triggerInput: AgentTriggerInput
}

export interface StartAgentWorkflowResult {
  workflowRunId: string
  runId: string
}

export async function startAgentWorkflow(
  input: StartAgentWorkflowInput
): Promise<StartAgentWorkflowResult> {
  const { run, agentId, tenantId, triggerInput } = input

  const { start } = await import("workflow/api")
  const { runAgentWorkflow } = await import("@/lib/workflows/agents")
  const { updateAgentRunStatus } = await import("@/lib/services/agent-runs")

  const workflowRun = await start(runAgentWorkflow, [{
    runId: run.id,
    agentId,
    tenantId,
    triggerInput,
  }])

  await updateAgentRunStatus(run.id, "queued", { workflowRunId: workflowRun.runId })

  return {
    workflowRunId: workflowRun.runId,
    runId: run.id,
  }
}

export async function startAgentWorkflowFromRun(
  run: AgentRun,
  triggerInput: AgentTriggerInput
): Promise<StartAgentWorkflowResult> {
  return startAgentWorkflow({
    run,
    agentId: run.agent_id,
    tenantId: run.tenant_id,
    triggerInput,
  })
}
