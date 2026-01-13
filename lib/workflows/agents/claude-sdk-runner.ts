import type { Agent, Skill, SandboxSession } from "@/lib/db/agent-types"
import type { Json } from "@/lib/db/types"

export interface ClaudeSDKRunnerInput {
  runId: string
  tenantId: string
  agent: Agent
  skills: Skill[]
  prompt: string
  context?: Json
  integrationTokens: Record<string, string>
}

export interface ClaudeSDKRunnerResult {
  success: boolean
  output?: string
  sandboxId?: string
  steps: Array<{
    type: "sandbox_created" | "files_written" | "command_executed" | "sandbox_terminated" | "error"
    output?: Json
    error?: string
    durationMs?: number
  }>
  error?: string
}

export async function runClaudeSDKAgent(
  input: ClaudeSDKRunnerInput
): Promise<ClaudeSDKRunnerResult> {
  const { runId, tenantId, agent, skills, prompt, context, integrationTokens } = input
  const steps: ClaudeSDKRunnerResult["steps"] = []

  let sandbox: SandboxSession | null = null

  try {
    const { createSandbox, writeSandboxFiles, executeInSandbox, terminateSandbox } =
      await import("@/lib/sandbox/daytona")
    const { buildSkillFilesForSandbox } = await import("@/lib/services/skills")

    const envVars: Record<string, string> = {
      ...integrationTokens,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
      AGENT_INSTRUCTIONS: agent.instructions ?? "",
      AGENT_PROMPT: prompt,
      AGENT_CONTEXT: context ? JSON.stringify(context) : "",
    }

    const startTime = Date.now()
    sandbox = await createSandbox({
      tenantId,
      agentRunId: runId,
      envVars,
      skills,
    })

    if (!sandbox) {
      throw new Error("Failed to create sandbox")
    }

    steps.push({
      type: "sandbox_created",
      output: { sandboxId: sandbox.daytona_sandbox_id } as Json,
      durationMs: Date.now() - startTime,
    })

    const skillFiles = buildSkillFilesForSandbox(skills)
    if (skillFiles.length > 0) {
      const writeStart = Date.now()
      await writeSandboxFiles(sandbox.daytona_sandbox_id, skillFiles)
      steps.push({
        type: "files_written",
        output: { fileCount: skillFiles.length } as Json,
        durationMs: Date.now() - writeStart,
      })
    }

    const runnerScript = buildRunnerScript(agent, prompt, context)
    const runnerScriptPath = "/tmp/run_agent.py"

    await writeSandboxFiles(sandbox.daytona_sandbox_id, [
      { path: runnerScriptPath, content: runnerScript },
    ])

    const execStart = Date.now()
    const result = await executeInSandbox(
      sandbox.daytona_sandbox_id,
      `python ${runnerScriptPath}`
    )

    steps.push({
      type: "command_executed",
      output: {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      } as Json,
      durationMs: Date.now() - execStart,
    })

    const terminateStart = Date.now()
    await terminateSandbox(sandbox.daytona_sandbox_id)
    steps.push({
      type: "sandbox_terminated",
      durationMs: Date.now() - terminateStart,
    })

    if (result.exitCode !== 0) {
      throw new Error(result.stderr || `Exit code: ${result.exitCode}`)
    }

    return {
      success: true,
      output: result.stdout,
      sandboxId: sandbox.daytona_sandbox_id,
      steps,
    }
  } catch (err) {
    if (sandbox) {
      try {
        const { terminateSandbox } = await import("@/lib/sandbox/daytona")
        await terminateSandbox(sandbox.daytona_sandbox_id)
        steps.push({ type: "sandbox_terminated" })
      } catch {
        // Ignore cleanup errors
      }
    }

    return {
      success: false,
      sandboxId: sandbox?.daytona_sandbox_id,
      steps,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

function buildRunnerScript(agent: Agent, prompt: string, context?: Json): string {
  const skillsDir = ".claude/skills"
  const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\n/g, "\\n")
  const escapedInstructions = (agent.instructions ?? "").replace(/"/g, '\\"').replace(/\n/g, "\\n")
  const contextStr = context ? JSON.stringify(context).replace(/"/g, '\\"') : ""

  return `#!/usr/bin/env python3
import os
import json
from anthropic import Anthropic

client = Anthropic()

SYSTEM_PROMPT = """${escapedInstructions}

## Skills Directory
Skills are located in: ${skillsDir}

## Context
${contextStr}
"""

def run_agent():
    prompt = """${escapedPrompt}"""

    messages = [{"role": "user", "content": prompt}]

    response = client.messages.create(
        model="${agent.model}",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=messages,
    )

    print(response.content[0].text)

if __name__ == "__main__":
    run_agent()
`
}
