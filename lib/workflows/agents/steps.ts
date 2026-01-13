"use step"

import type { AgentRun, Agent, Skill, AgentStep } from "@/lib/db/agent-types"
import type { Json } from "@/lib/db/types"

export async function getAgentWithSkills(
  agentId: string,
  tenantId: string
): Promise<{ agent: Agent; skills: Skill[] } | null> {
  "use step"

  const { getAgentById } = await import("@/lib/services/agents")
  const { getSkillsByIds } = await import("@/lib/services/skills")

  const agent = await getAgentById(agentId, tenantId)
  if (!agent) return null

  const skillIds = (agent.skill_ids as string[]) ?? []
  const skills = skillIds.length > 0 ? await getSkillsByIds(skillIds, tenantId) : []

  return { agent, skills }
}

export async function markRunStarted(runId: string): Promise<AgentRun | null> {
  "use step"

  const { markRunRunning } = await import("@/lib/services/agent-runs")
  return markRunRunning(runId)
}

export async function appendStep(
  runId: string,
  step: {
    type: "tool_call" | "tool_result" | "text" | "error"
    name?: string
    input?: Json
    output?: Json
    error?: string
    durationMs?: number
  },
  stepNumber: number
): Promise<boolean> {
  "use step"

  const { appendAgentRunStep } = await import("@/lib/services/agent-runs")
  const now = new Date().toISOString()
  const fullStep: AgentStep = {
    id: `step-${runId}-${stepNumber}`,
    step_number: stepNumber,
    type: step.type,
    name: step.name,
    input: step.input,
    output: step.output,
    error: step.error,
    duration_ms: step.durationMs,
    timestamp: now,
    created_at: now,
  }
  return appendAgentRunStep(runId, fullStep)
}

export async function completeRun(
  runId: string,
  result?: Json
): Promise<AgentRun | null> {
  "use step"

  const { markRunCompleted } = await import("@/lib/services/agent-runs")
  return markRunCompleted(runId, result as Json ?? {})
}

export async function failRun(
  runId: string,
  error: { message: string; code?: string }
): Promise<AgentRun | null> {
  "use step"

  const { markRunFailed } = await import("@/lib/services/agent-runs")
  return markRunFailed(runId, error)
}

export async function markRunAwaitingInput(runId: string): Promise<AgentRun | null> {
  "use step"

  const { updateAgentRunStatus } = await import("@/lib/services/agent-runs")
  return updateAgentRunStatus(runId, "awaiting_input")
}

export async function triggerRunWebhooks(
  tenantId: string,
  event: "agent_run.started" | "agent_run.completed" | "agent_run.failed",
  payload: Json
): Promise<void> {
  "use step"

  const { triggerWebhooks } = await import("@/lib/services/webhooks")
  await triggerWebhooks(tenantId, event, payload)
}

export async function getIntegrationTokens(
  tenantId: string,
  providers: string[]
): Promise<Record<string, string>> {
  "use step"

  const { getIntegrationTokensForSandbox } = await import("@/lib/integrations/oauth")
  return getIntegrationTokensForSandbox(
    tenantId,
    providers as ("gmail" | "google_calendar" | "notion" | "luma")[]
  )
}

export async function sendNotificationEmail(
  email: string,
  agentName: string,
  runId: string,
  type: "started" | "completed" | "failed",
  details?: { output?: string; error?: string }
): Promise<void> {
  "use step"

  const { sendAgentNotification } = await import("@/lib/email/resend")
  await sendAgentNotification(email, agentName, runId, type, details)
}
