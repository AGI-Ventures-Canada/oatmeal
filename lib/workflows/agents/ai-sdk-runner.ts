import { DurableAgent } from "@workflow/ai/agent"
import { getWritable } from "workflow"
import { stepCountIs } from "ai"
import type { Agent, Skill } from "@/lib/db/agent-types"
import type { Json } from "@/lib/db/types"
import {
  createSandbox,
  terminateSandbox,
  writeSandboxFiles,
  type SandboxFile,
} from "@/lib/sandbox/daytona"
import {
  createSandboxTools,
  createSandboxToolsContext,
  type SandboxToolsContext,
} from "@/lib/agents/sandbox-tools"
import { buildToolsFromSkills } from "@/lib/agents/skill-tools"

export interface AgentConfig {
  maxSteps?: number
  enableSandboxTools?: boolean
  initialFiles?: SandboxFile[]
}

export interface AISDKRunnerInput {
  runId: string
  tenantId: string
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
    error?: string
  }>
  error?: string
  fullResult?: unknown
}

export interface UIMessageChunk {
  type: string
  id?: string
  data?: unknown
}

export async function runAISDKAgent(input: AISDKRunnerInput): Promise<AISDKRunnerResult> {
  "use step"

  const { runId, tenantId, agent, skills, prompt, context, integrationTokens } = input
  const config = (agent.config ?? {}) as AgentConfig
  const steps: AISDKRunnerResult["steps"] = []
  let sandboxId: string | null = null
  let sandboxToolsContext: SandboxToolsContext | null = null

  try {
    const writable = getWritable<UIMessageChunk>()
    const { createAnthropic } = await import("@ai-sdk/anthropic")

    if (config.enableSandboxTools) {
      console.log(`[AI SDK Runner] Creating sandbox for bash/text editor tools`)
      const sandbox = await createSandbox({
        tenantId,
        agentRunId: runId,
        envVars: {},
        skills: skills as Parameters<typeof createSandbox>[0]["skills"],
      })

      if (!sandbox) {
        throw new Error("Failed to create sandbox for tools")
      }

      sandboxId = sandbox.daytona_sandbox_id
      sandboxToolsContext = createSandboxToolsContext(sandboxId)
      console.log(`[AI SDK Runner] Sandbox created: ${sandboxId}`)

      if (config.initialFiles && config.initialFiles.length > 0) {
        console.log(`[AI SDK Runner] Seeding ${config.initialFiles.length} initial files`)
        await writeSandboxFiles(sandboxId, config.initialFiles)
      }

      steps.push({
        type: "tool_call",
        name: "sandbox_created",
        input: { sandboxId } as Json,
      })
    }

    const modelFactory = () => {
      const anthropicProvider = createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      })
      return anthropicProvider(agent.model)
    }
    const systemPrompt = buildSystemPrompt(agent, skills, context)
    const tools = buildAllTools(skills, integrationTokens, sandboxToolsContext)

    /* eslint-disable @typescript-eslint/no-explicit-any */
    // DurableAgent types are complex and require any casts for compatibility
    const durableAgent = new DurableAgent({
      model: modelFactory as any,
      system: systemPrompt,
      tools: tools as any,
      stopWhen: stepCountIs(agent.max_steps ?? 5),
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
        const r = result as unknown as Record<string, unknown>

        // Check for steps array with text content
        if (Array.isArray(r.steps)) {
          const textSteps = (r.steps as Array<{ text?: string }>).filter(s => s.text)
          if (textSteps.length > 0) {
            finalText = textSteps.map(s => s.text).join("\n")
          }
        }

        // Check for messages array with assistant responses
        if (!finalText && Array.isArray(r.messages)) {
          const assistantMsgs = (r.messages as Array<{ role?: string; content?: unknown }>)
            .filter(m => m.role === "assistant")
          const lastAssistant = assistantMsgs[assistantMsgs.length - 1]
          if (lastAssistant?.content) {
            if (typeof lastAssistant.content === "string") {
              finalText = lastAssistant.content
            } else if (Array.isArray(lastAssistant.content)) {
              const textParts = (lastAssistant.content as Array<{ type?: string; text?: string }>)
                .filter(p => p.type === "text" && p.text)
              finalText = textParts.map(p => p.text).join("\n")
            }
          }
        }

        // Fall back to common properties
        if (!finalText) {
          finalText = (r.text as string) ??
                      (r.content as string) ??
                      (r.output as string) ??
                      (r.response as string) ??
                      JSON.stringify(result)
        }
      }
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // Extract tool calls from messages array since callbacks may not fire correctly
    if (result && typeof result === "object") {
      const r = result as unknown as Record<string, unknown>
      if (Array.isArray(r.messages)) {
        type MessageContent = { type?: string; toolName?: string; toolCallId?: string; args?: unknown; output?: unknown; text?: string }
        type Message = { role?: string; content?: unknown }

        for (const msg of r.messages as Message[]) {
          if (msg.role === "assistant" && Array.isArray(msg.content)) {
            for (const part of msg.content as MessageContent[]) {
              if (part.type === "tool-call") {
                steps.push({
                  type: "tool_call",
                  name: part.toolName,
                  input: part.args as Json,
                })
              }
            }
          }
          if (msg.role === "tool" && Array.isArray(msg.content)) {
            for (const part of msg.content as MessageContent[]) {
              if (part.type === "tool-result") {
                steps.push({
                  type: "tool_result",
                  name: part.toolName,
                  output: part.output as Json,
                })
              }
            }
          }
        }
      }
    }

    steps.push({
      type: "text",
      output: finalText as Json,
    })

    return {
      success: true,
      output: finalText,
      steps,
      fullResult: result,
    }
  } catch (err) {
    return {
      success: false,
      steps,
      error: err instanceof Error ? err.message : "Unknown error",
      fullResult: undefined,
    }
  } finally {
    if (sandboxId) {
      console.log(`[AI SDK Runner] Terminating sandbox: ${sandboxId}`)
      await terminateSandbox(sandboxId)
      steps.push({
        type: "tool_result",
        name: "sandbox_terminated",
        output: { sandboxId } as Json,
      })
    }
  }
}

function buildAllTools(
  skills: Skill[],
  integrationTokens: Record<string, string>,
  sandboxToolsContext: SandboxToolsContext | null
): Record<string, unknown> {
  const tools = buildToolsFromSkills(skills, integrationTokens) as Record<string, unknown>

  if (sandboxToolsContext) {
    const sandboxTools = createSandboxTools(sandboxToolsContext)
    tools.bash = sandboxTools.bash
    tools.str_replace_editor = sandboxTools.str_replace_editor
    console.log(`[AI SDK Runner] Added sandbox tools: bash, str_replace_editor`)
  }

  return tools
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

