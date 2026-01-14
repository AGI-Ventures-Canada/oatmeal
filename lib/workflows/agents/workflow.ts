"use workflow"

import type { Json } from "@/lib/db/types"
import type { AgentTriggerInput } from "@/lib/services/triggers"

export type AgentWorkflowInput = {
  runId: string
  agentId: string
  tenantId: string
  triggerInput: AgentTriggerInput
}

export type AgentWorkflowResult = {
  status: "succeeded" | "failed"
  output?: string
  error?: { message: string; code?: string }
}

export async function runAgentWorkflow(
  input: AgentWorkflowInput
): Promise<AgentWorkflowResult> {
  const { runId, agentId, tenantId, triggerInput } = input

  const {
    getAgentWithSkills,
    markRunStarted,
    completeRun,
    failRun,
    triggerRunWebhooks,
    getIntegrationTokens,
    appendStep,
  } = await import("./steps")

  try {
    const agentData = await getAgentWithSkills(agentId, tenantId)
    if (!agentData) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    const { agent, skills } = agentData

    await markRunStarted(runId)
    await triggerRunWebhooks(tenantId, "agent_run.started", {
      runId,
      agentId,
      agentName: agent.name,
      trigger: triggerInput.trigger,
    })

    // Get required integrations from agent config
    const requiredIntegrations = ((agent.config as { requiredIntegrations?: string[] })?.requiredIntegrations) ?? []
    const integrationTokens = requiredIntegrations.length > 0
      ? await getIntegrationTokens(tenantId, requiredIntegrations)
      : {}

    const prompt = buildPromptFromTrigger(triggerInput)
    const context = buildContextFromTrigger(triggerInput)

    let result: { success: boolean; output?: string; error?: string; steps?: Array<unknown>; fullResult?: unknown }

    if (agent.type === "ai_sdk") {
      const { runAISDKAgent } = await import("./ai-sdk-runner")
      result = await runAISDKAgent({
        runId,
        tenantId,
        agent,
        skills,
        prompt,
        context,
        integrationTokens,
      })
    } else {
      const { executeClaudeSDKInSandbox } = await import("./steps")
      result = await executeClaudeSDKInSandbox({
        runId,
        tenantId,
        agent,
        skills,
        prompt,
        context,
        integrationTokens,
      })
    }

    if (result.steps) {
      let stepNumber = 1
      for (const step of result.steps) {
        const s = step as {
          type: string
          name?: string
          input?: Json
          output?: Json
          error?: string
          durationMs?: number
        }
        await appendStep(runId, {
          type: s.type as "tool_call" | "tool_result" | "text" | "error",
          name: s.name,
          input: s.input,
          output: s.output,
          error: s.error,
          durationMs: s.durationMs,
        }, stepNumber++)
      }
    }

    if (!result.success) {
      throw new Error(result.error ?? "Agent execution failed")
    }

    await completeRun(runId, {
      output: result.output,
      messages: (result.fullResult as Record<string, unknown>)?.messages,
      steps: result.steps,
    } as Json)
    await triggerRunWebhooks(tenantId, "agent_run.completed", {
      runId,
      agentId,
      agentName: agent.name,
      output: result.output,
    })

    return {
      status: "succeeded",
      output: result.output,
    }
  } catch (err) {
    const error = {
      message: err instanceof Error ? err.message : "Unknown error",
      code: "EXECUTION_ERROR",
    }

    await failRun(runId, error)
    await triggerRunWebhooks(tenantId, "agent_run.failed", {
      runId,
      agentId,
      error,
    })

    return {
      status: "failed",
      error,
    }
  }
}

function buildPromptFromTrigger(trigger: AgentTriggerInput): string {
  switch (trigger.trigger) {
    case "manual":
      return trigger.prompt

    case "scheduled":
      return `Scheduled task: ${trigger.scheduleName}\n\n${
        trigger.input ? JSON.stringify(trigger.input, null, 2) : ""
      }`

    case "email":
      return `New email received:\n\nFrom: ${trigger.from}\nSubject: ${trigger.subject}\n\nBody:\n${trigger.body}`

    case "luma_webhook":
      return `Luma event received: ${trigger.eventType}\n\nData:\n${JSON.stringify(
        trigger.data,
        null,
        2
      )}`

    default:
      return ""
  }
}

function buildContextFromTrigger(trigger: AgentTriggerInput): Json {
  switch (trigger.trigger) {
    case "manual":
      return trigger.context ?? null

    case "scheduled":
      return {
        scheduleId: trigger.scheduleId,
        scheduleName: trigger.scheduleName,
        input: trigger.input,
      }

    case "email":
      return {
        emailAddressId: trigger.emailAddressId,
        inboundEmailId: trigger.inboundEmailId,
        from: trigger.from,
        subject: trigger.subject,
        attachments: trigger.attachments,
      }

    case "luma_webhook":
      return {
        configId: trigger.configId,
        eventType: trigger.eventType,
        data: trigger.data,
      }

    default:
      return null
  }
}
