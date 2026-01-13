import { DurableAgent } from "@workflow/ai/agent"
import { getWritable } from "workflow"
import type { Agent, Skill } from "@/lib/db/agent-types"
import type { Json } from "@/lib/db/types"

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
  "use step"

  const { agent, skills, prompt, context, integrationTokens } = input
  const steps: AISDKRunnerResult["steps"] = []

  try {
    const writable = getWritable<UIMessageChunk>()
    const { buildToolsFromSkills } = await import("@/lib/agents/skill-tools")
    const { createAnthropic } = await import("@ai-sdk/anthropic")

    const modelFactory = () => {
      const anthropicProvider = createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      })
      return anthropicProvider(agent.model)
    }
    const systemPrompt = buildSystemPrompt(agent, skills, context)
    const tools = buildToolsFromSkills(skills, integrationTokens)

    /* eslint-disable @typescript-eslint/no-explicit-any */
    // DurableAgent types are complex and require any casts for compatibility
    const durableAgent = new DurableAgent({
      model: modelFactory as any,
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

    // DurableAgent.stream() returns the final response which contains the text
    // The response structure may vary, so we handle multiple cases
    let finalText = ""
    if (result) {
      if (typeof result === "string") {
        finalText = result
      } else if (typeof result === "object") {
        // Try common result properties
        finalText = (result as any).text ??
                    (result as any).content ??
                    (result as any).output ??
                    (result as any).response ??
                    JSON.stringify(result)
      }
    }
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

