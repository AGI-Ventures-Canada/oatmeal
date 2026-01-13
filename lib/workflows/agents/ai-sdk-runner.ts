import { DurableAgent } from "@workflow/ai/agent"
import { getWritable } from "workflow"
import type { Agent, Skill } from "@/lib/db/agent-types"
import type { Json } from "@/lib/db/types"
import type { SupportedModel } from "@/lib/ai/anthropic"

export interface AISDKRunnerInput {
  runId: string
  agent: Agent
  skills: Skill[]
  prompt: string
  context?: Json
  integrationTokens: Record<string, string>
}

export interface AISDKRunnerResult {
  success: boolean
  output?: string
  steps: Array<{
    type: "tool_call" | "tool_result" | "text"
    name?: string
    input?: Json
    output?: Json
    durationMs?: number
  }>
  error?: string
}

export interface UIMessageChunk {
  type: string
  id?: string
  data?: unknown
}

export async function runAISDKAgent(input: AISDKRunnerInput): Promise<AISDKRunnerResult> {
  const { agent, skills, prompt, context, integrationTokens } = input
  const steps: AISDKRunnerResult["steps"] = []

  try {
    const writable = getWritable<UIMessageChunk>()

    const { anthropic } = await import("@/lib/ai/anthropic")
    const { buildToolsFromSkills } = await import("@/lib/agents/skill-tools")

    const model = anthropic(agent.model as SupportedModel)

    const systemPrompt = buildSystemPrompt(agent, skills, context)
    const tools = buildToolsFromSkills(skills, integrationTokens)

    /* eslint-disable @typescript-eslint/no-explicit-any */
    // DurableAgent types are complex and require any casts for compatibility
    const durableAgent = new DurableAgent({
      model: model as any,
      system: systemPrompt,
      tools: tools as any,
      stopWhen: {
        maxSteps: (agent.config as { maxSteps?: number })?.maxSteps ?? 50,
      },
    } as any)
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const onStepStart = (stepInfo: { toolName?: string; toolInput?: unknown }) => {
      if (stepInfo.toolName) {
        steps.push({
          type: "tool_call",
          name: stepInfo.toolName,
          input: stepInfo.toolInput as Json,
        })
      }
    }

    const onStepFinish = (stepInfo: { toolName?: string; toolResult?: unknown; durationMs?: number }) => {
      if (stepInfo.toolName && steps.length > 0) {
        const lastStep = steps[steps.length - 1]
        if (lastStep.type === "tool_call" && lastStep.name === stepInfo.toolName) {
          steps.push({
            type: "tool_result",
            name: stepInfo.toolName,
            output: stepInfo.toolResult as Json,
            durationMs: stepInfo.durationMs,
          })
        }
      }
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const result = await durableAgent.stream({
      messages: [{ role: "user", content: prompt }],
      writable,
      onStepStart,
      onStepFinish,
    } as any)

    const finalText = await collectStreamText(result as any)
    /* eslint-enable @typescript-eslint/no-explicit-any */

    steps.push({
      type: "text",
      output: finalText as Json,
    })

    return {
      success: true,
      output: finalText,
      steps,
    }
  } catch (err) {
    return {
      success: false,
      steps,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

function buildSystemPrompt(agent: Agent, skills: Skill[], context?: Json): string {
  let systemPrompt = agent.instructions ?? ""

  if (skills.length > 0) {
    systemPrompt += "\n\n## Available Skills\n\n"
    for (const skill of skills) {
      systemPrompt += `### ${skill.name}\n${skill.description ?? ""}\n\n`
    }
  }

  if (context) {
    systemPrompt += `\n\n## Context\n\n${JSON.stringify(context, null, 2)}`
  }

  return systemPrompt
}

async function collectStreamText(result: { textStream: AsyncIterable<string> }): Promise<string> {
  let text = ""
  for await (const chunk of result.textStream) {
    text += chunk
  }
  return text
}
