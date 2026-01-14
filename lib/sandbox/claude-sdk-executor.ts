import { createSandbox, writeSandboxFiles, terminateSandbox, getDaytonaClient } from "./daytona"
import type { Sandbox } from "@daytonaio/sdk"
import { buildSkillFilesForSandbox } from "@/lib/services/skills"

interface ClaudeSDKExecutorInput {
  runId: string
  tenantId: string
  agent: { id: string; name: string; model: string; instructions?: string | null; config?: unknown }
  skills: Array<{ id: string; name: string; description?: string | null; content?: string | null; config?: unknown }>
  prompt: string
  context?: unknown
  integrationTokens: Record<string, string>
}

interface ClaudeSDKExecutorResult {
  success: boolean
  output?: string
  sandboxId?: string
  steps: Array<{ type: string; output?: unknown; error?: string; durationMs?: number }>
  usage?: { inputTokens: number; outputTokens: number; totalCostUsd: number }
  error?: string
}

export async function runClaudeSDKAgentImpl(input: ClaudeSDKExecutorInput): Promise<ClaudeSDKExecutorResult> {
  const { runId, tenantId, agent, skills, prompt, context, integrationTokens } = input
  const steps: ClaudeSDKExecutorResult["steps"] = []
  let sandboxId: string | null = null

  const envVars: Record<string, string> = {
    ...integrationTokens,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
  }

  try {
    console.log(`[Claude SDK Executor] Creating sandbox for run ${runId}`)
    const startTime = Date.now()

    const sandbox = await createSandbox({
      tenantId,
      agentRunId: runId,
      envVars,
      skills: skills as Parameters<typeof createSandbox>[0]["skills"],
    })

    if (!sandbox) {
      return { success: false, steps, error: "Failed to create sandbox" }
    }

    sandboxId = sandbox.daytona_sandbox_id
    steps.push({
      type: "sandbox_created",
      output: { sandboxId } as unknown,
      durationMs: Date.now() - startTime,
    })
    console.log(`[Claude SDK Executor] Sandbox created: ${sandboxId}`)

    // Get the Daytona sandbox object for PTY access
    const client = await getDaytonaClient()
    const daytonaSandbox = await client.findOne(sandboxId)

    if (!daytonaSandbox) {
      throw new Error("Failed to find sandbox")
    }

    // Create non-root user for SDK execution (SDK refuses to run as root with bypassPermissions)
    console.log(`[Claude SDK Executor] Creating non-root user`)
    const userSetupStart = Date.now()
    await daytonaSandbox.process.executeCommand(`
      useradd -m -s /bin/bash agent 2>/dev/null || true
      mkdir -p /home/agent/sdk-runner
      chown -R agent:agent /home/agent
    `)
    steps.push({
      type: "user_created",
      durationMs: Date.now() - userSetupStart,
    })

    // Write skill files to .claude/skills/ for Claude to use
    const skillFiles = buildSkillFilesForSandbox(skills as Parameters<typeof buildSkillFilesForSandbox>[0])
    if (skillFiles.length > 0) {
      const writeStart = Date.now()
      await writeSandboxFiles(sandboxId, skillFiles)
      steps.push({
        type: "skills_written",
        output: { fileCount: skillFiles.length } as unknown,
        durationMs: Date.now() - writeStart,
      })
    }

    // Build system prompt with skills and context
    const systemPrompt = buildSystemPrompt(agent, skills, context)

    // Build the SDK runner script
    const sdkRunnerScript = buildSDKRunnerScript(agent.model, systemPrompt, prompt, agent.config)

    const packageJson = JSON.stringify({
      name: "sdk-runner",
      dependencies: {
        "@anthropic-ai/claude-agent-sdk": "latest",
      },
    }, null, 2)

    // Write files to agent user's home
    console.log(`[Claude SDK Executor] Writing SDK runner files`)
    const writeStart = Date.now()

    // Write env file with all environment variables
    const envFileContent = Object.entries(envVars)
      .map(([key, value]) => `export ${key}="${value.replace(/"/g, '\\"')}"`)
      .join("\n")

    await daytonaSandbox.fs.uploadFile(Buffer.from(sdkRunnerScript), "/home/agent/sdk-runner/index.js")
    await daytonaSandbox.fs.uploadFile(Buffer.from(packageJson), "/home/agent/sdk-runner/package.json")
    await daytonaSandbox.fs.uploadFile(Buffer.from(envFileContent), "/home/agent/.env")
    await daytonaSandbox.process.executeCommand("chown -R agent:agent /home/agent")

    steps.push({
      type: "files_written",
      output: { fileCount: 3 } as unknown,
      durationMs: Date.now() - writeStart,
    })

    // Install Claude Agent SDK as non-root user
    console.log(`[Claude SDK Executor] Installing Claude Agent SDK`)
    const installStart = Date.now()
    const installResult = await daytonaSandbox.process.executeCommand(
      "su - agent -c 'cd /home/agent/sdk-runner && npm install 2>&1'"
    )

    if (installResult.exitCode !== 0) {
      console.error(`[Claude SDK Executor] npm install failed: ${installResult.result}`)
      throw new Error(`npm install failed: ${installResult.result || "No output"}`)
    }

    steps.push({
      type: "deps_installed",
      durationMs: Date.now() - installStart,
    })
    console.log(`[Claude SDK Executor] Claude Agent SDK installed`)

    // Execute SDK as agent user using polling (avoids API gateway timeout)
    console.log(`[Claude SDK Executor] Executing SDK agent via polling`)
    const execStart = Date.now()

    const { output, exitCode } = await executeSdkWithPolling(
      daytonaSandbox,
      "/home/agent/sdk-runner",
      envVars,
      120000 // 120 second timeout
    )

    steps.push({
      type: "agent_completed",
      output: {
        stdout: output?.substring(0, 1000),
        exitCode,
      } as unknown,
      durationMs: Date.now() - execStart,
    })
    console.log(`[Claude SDK Executor] Agent completed with exit code ${exitCode}`)

    // Parse output for result and usage
    const parsed = parseSDKOutput(output)

    // Cleanup
    console.log(`[Claude SDK Executor] Terminating sandbox`)
    const cleanupStart = Date.now()
    await terminateSandbox(sandboxId)
    steps.push({
      type: "sandbox_terminated",
      durationMs: Date.now() - cleanupStart,
    })
    const termSandboxId = sandboxId
    sandboxId = null
    console.log(`[Claude SDK Executor] Sandbox terminated`)

    if (parsed.error) {
      return {
        success: false,
        output: parsed.result,
        sandboxId: termSandboxId,
        steps,
        usage: parsed.usage,
        error: parsed.error,
      }
    }

    return {
      success: true,
      output: parsed.result,
      sandboxId: termSandboxId,
      steps,
      usage: parsed.usage,
    }
  } catch (err) {
    console.error(`[Claude SDK Executor] Error:`, err)

    if (sandboxId) {
      try {
        await terminateSandbox(sandboxId)
        steps.push({ type: "sandbox_terminated" })
      } catch {
        // Ignore cleanup errors
      }
    }

    return {
      success: false,
      sandboxId: sandboxId ?? undefined,
      steps,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

async function executeSdkWithPolling(
  sandbox: Sandbox,
  cwd: string,
  envVars: Record<string, string>,
  timeoutMs: number
): Promise<{ output: string; exitCode: number }> {
  const outputFile = "/tmp/sdk-output.txt"
  const statusFile = "/tmp/sdk-status.txt"

  // Write a wrapper script that runs the SDK and captures output
  const wrapperScript = `#!/bin/bash
source /home/agent/.env
cd ${cwd}
node index.js > ${outputFile} 2>&1
echo $? > ${statusFile}
`
  await sandbox.fs.uploadFile(Buffer.from(wrapperScript), "/tmp/run-sdk.sh")
  await sandbox.process.executeCommand("chmod +x /tmp/run-sdk.sh")

  // Start the SDK in background as agent user
  await sandbox.process.executeCommand(
    `su - agent -c 'nohup /tmp/run-sdk.sh > /dev/null 2>&1 &'`
  )

  // Poll for completion
  const pollInterval = 2000
  let elapsed = 0

  while (elapsed < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, pollInterval))
    elapsed += pollInterval

    try {
      // Check if status file exists (indicates completion)
      const statusCheck = await sandbox.process.executeCommand(`cat ${statusFile} 2>/dev/null || echo "running"`)
      const status = statusCheck.result?.trim()

      if (status && status !== "running") {
        // SDK completed, read output
        const outputResult = await sandbox.process.executeCommand(`cat ${outputFile} 2>/dev/null`)
        const exitCode = parseInt(status, 10) || 0
        return {
          output: outputResult.result || "",
          exitCode,
        }
      }
    } catch {
      // Continue polling
    }
  }

  // Timeout - try to get partial output
  try {
    const outputResult = await sandbox.process.executeCommand(`cat ${outputFile} 2>/dev/null`)
    return {
      output: outputResult.result || "SDK execution timeout",
      exitCode: 1,
    }
  } catch {
    return { output: "SDK execution timeout", exitCode: 1 }
  }
}

/**
 * Builds the SDK runner script that executes inside the Daytona sandbox.
 * See sdk-runner-template.ts for the TypeScript version with full intellisense.
 *
 * The script uses hooks to stream intermediate results:
 * - PreToolUse: Logs when a tool starts executing
 * - PostToolUse: Logs the tool result after execution
 */
function buildSDKRunnerScript(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  config?: unknown
): string {
  const maxTurns = (config as { maxTurns?: number })?.maxTurns ?? 50
  const allowedTools = (config as { allowedTools?: string[] })?.allowedTools ?? [
    "Read", "Write", "Edit", "Bash", "Glob", "Grep"
  ]

  const escapeJs = (str: string) => str
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$")

  return `
const { unstable_v2_prompt } = require("@anthropic-ai/claude-agent-sdk");

const systemPrompt = \`${escapeJs(systemPrompt)}\`;
const userPrompt = \`${escapeJs(userPrompt)}\`;

// PreToolUse hook - logs tool calls before execution
const preToolUseHook = async (input, toolUseId, { signal }) => {
  console.log(JSON.stringify({
    type: "tool_start",
    tool: input.tool_name,
    toolUseId,
    timestamp: Date.now(),
  }));
  return {};
};

// PostToolUse hook - logs tool results after execution
const postToolUseHook = async (input, toolUseId, { signal }) => {
  const response = input.tool_response;
  const truncatedResponse = typeof response === "string"
    ? response.substring(0, 500)
    : JSON.stringify(response).substring(0, 500);

  console.log(JSON.stringify({
    type: "tool_end",
    tool: input.tool_name,
    toolUseId,
    response: truncatedResponse,
    timestamp: Date.now(),
  }));
  return {};
};

async function main() {
  try {
    console.log(JSON.stringify({
      type: "sdk_start",
      model: "${model}",
      timestamp: Date.now(),
    }));

    const result = await unstable_v2_prompt(userPrompt, {
      model: "${model}",
      systemPrompt,
      allowedTools: ${JSON.stringify(allowedTools)},
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      maxTurns: ${maxTurns},
      cwd: "/home/agent",
      hooks: {
        PreToolUse: [{ hooks: [preToolUseHook] }],
        PostToolUse: [{ hooks: [postToolUseHook] }],
      },
    });

    if (result.subtype === "success") {
      const output = {
        result: result.result || "",
        usage: {
          inputTokens: result.usage?.input_tokens || 0,
          outputTokens: result.usage?.output_tokens || 0,
          totalCostUsd: result.total_cost_usd || 0,
        },
      };
      console.log("__SDK_OUTPUT__" + JSON.stringify(output) + "__SDK_OUTPUT_END__");
    } else {
      const output = {
        error: result.errors?.join(", ") || "Agent execution failed",
      };
      console.log("__SDK_OUTPUT__" + JSON.stringify(output) + "__SDK_OUTPUT_END__");
      console.log("__SDK_ERROR__");
      process.exit(1);
    }
  } catch (err) {
    const output = { error: err.message || "Unknown error" };
    console.log("__SDK_OUTPUT__" + JSON.stringify(output) + "__SDK_OUTPUT_END__");
    console.log("__SDK_ERROR__");
    process.exit(1);
  }
}

main();
`.trim()
}

function parseSDKOutput(output: string): {
  result?: string
  usage?: { inputTokens: number; outputTokens: number; totalCostUsd: number }
  error?: string
} {
  const match = output.match(/__SDK_OUTPUT__(.+?)__SDK_OUTPUT_END__/)
  if (match) {
    try {
      return JSON.parse(match[1])
    } catch {
      // Fall through to raw output
    }
  }

  // If no structured output, treat raw output as result
  return { result: output }
}

function buildSystemPrompt(
  agent: { instructions?: string | null },
  skills: Array<{ name: string; description?: string | null; content?: string | null }>,
  context?: unknown
): string {
  let systemPrompt = agent.instructions ?? ""

  if (skills.length > 0) {
    systemPrompt += "\n\n## Available Skills\n\n"
    for (const skill of skills) {
      systemPrompt += `### ${skill.name}\n${skill.description ?? ""}\n\n`
      if (skill.content) {
        systemPrompt += `${skill.content}\n\n`
      }
    }
  }

  if (context) {
    systemPrompt += `\n\n## Context\n\n${JSON.stringify(context, null, 2)}`
  }

  return systemPrompt
}
