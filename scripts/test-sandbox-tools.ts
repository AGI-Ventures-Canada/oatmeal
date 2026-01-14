#!/usr/bin/env bun
/**
 * Test sandbox tools (bash, text editor) with Daytona sandbox
 *
 * Creates a sandbox with nested directories containing secret files,
 * then asks the agent to find the secrets using only bash and text editor tools.
 *
 * Uses Haiku model by default for cheaper testing.
 * Set USE_SONNET=1 to use Sonnet instead.
 */

const API_URL = process.env.API_URL || "http://localhost:3000"
const API_KEY = process.env.TEST_API_KEY || "sk_live_PmAECb-UFh8o1vQp7zl_q4r4LIFPISwH"
const USE_SONNET = process.env.USE_SONNET === "1"

const MODEL = USE_SONNET ? "claude-sonnet-4-5-20250929" : "claude-haiku-4-5-20251001"

const TEST_FILES = [
  {
    path: "/workspace/README.md",
    content: "Welcome to the workspace!\n\nThere are some important files hidden in subdirectories. Explore around to find them.",
  },
  {
    path: "/workspace/docs/getting-started.md",
    content: "# Getting Started\n\nThis is the documentation folder. Check other directories for more information.",
  },
  {
    path: "/workspace/level1/info.md",
    content: "# Level 1\n\nYou're getting warmer! Keep exploring deeper directories.",
  },
  {
    path: "/workspace/level1/level2/hints.md",
    content: "# Hints\n\nThe secret is very close now. Look around in this directory.",
  },
  {
    path: "/workspace/level1/level2/secret.md",
    content: "# The Secret\n\nCongratulations! You found it!\n\nThe secret code is: TREASURE123\n\nRemember this code.",
  },
  {
    path: "/workspace/level1/level2/decoy.md",
    content: "# Decoy\n\nThis is not the file you're looking for. Keep searching!",
  },
]

const PROMPT = `You have access to bash and text editor tools to explore the filesystem.

There is a secret hidden somewhere in the /workspace directory. Find it and tell me what the secret code is.

Hint: Use 'ls' and 'cd' commands, or the text editor's view command, to explore directories and read files.`

async function main() {
  console.log("=== Testing Sandbox Tools (Bash & Text Editor) ===\n")
  console.log("API URL:", API_URL)
  console.log("Model:", MODEL, USE_SONNET ? "" : "(set USE_SONNET=1 for Sonnet)")
  console.log()

  console.log("1. Listing agents...")
  const agentsRes = await fetch(`${API_URL}/api/v1/agents`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  })

  if (!agentsRes.ok) {
    console.error("Failed to list agents:", agentsRes.status, await agentsRes.text())
    return
  }

  const agentsData = await agentsRes.json()
  console.log("   Found", agentsData.agents?.length || 0, "agents")

  const agentName = `Sandbox Tools Test (${USE_SONNET ? "Sonnet" : "Haiku"})`
  let agent = agentsData.agents?.find(
    (a: { type: string; name: string; model: string }) =>
      a.type === "ai_sdk" && a.name === agentName && a.model === MODEL
  )

  if (!agent) {
    console.log(`\n   Creating new agent: ${agentName}`)

    const createRes = await fetch(`${API_URL}/api/v1/agents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: agentName,
        type: "ai_sdk",
        model: MODEL,
        instructions: "You are a helpful assistant that can explore filesystems using bash and text editor tools. Be thorough in your exploration.",
        config: {
          enableSandboxTools: true,
          initialFiles: TEST_FILES,
          maxSteps: 30,
        },
      }),
    })

    if (!createRes.ok) {
      console.error("Failed to create agent:", createRes.status, await createRes.text())
      return
    }

    agent = await createRes.json()
    console.log("   Created agent:", agent.id)
  } else {
    console.log(`\n   Updating agent with test files`)

    const updateRes = await fetch(`${API_URL}/api/v1/agents/${agent.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        config: {
          enableSandboxTools: true,
          initialFiles: TEST_FILES,
          maxSteps: 30,
        },
      }),
    })

    if (!updateRes.ok) {
      console.error("Failed to update agent:", updateRes.status, await updateRes.text())
      return
    }

    agent = await updateRes.json()
  }

  console.log("   Using agent:", agent.id, "-", agent.name, `(${agent.type})`)

  console.log("\n2. Triggering agent run...")
  console.log("   Prompt:", PROMPT.substring(0, 100) + "...")

  const runRes = await fetch(`${API_URL}/api/v1/agents/${agent.id}/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: PROMPT,
    }),
  })

  if (!runRes.ok) {
    console.error("Failed to trigger run:", runRes.status, await runRes.text())
    return
  }

  const runData = await runRes.json()
  console.log("   Run ID:", runData.runId)
  console.log("   Status:", runData.status)

  console.log("\n3. Polling for completion (max 3 minutes)...")
  const maxWait = 180000
  const pollInterval = 3000
  let elapsed = 0

  while (elapsed < maxWait) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval))
    elapsed += pollInterval

    const statusRes = await fetch(`${API_URL}/api/v1/runs/${runData.runId}`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    })

    if (!statusRes.ok) {
      console.log(`   ${elapsed / 1000}s - Error fetching status:`, statusRes.status)
      continue
    }

    const status = await statusRes.json()
    console.log(`   ${elapsed / 1000}s - Status: ${status.status}`)

    if (status.status === "succeeded" || status.status === "failed") {
      const resultRes = await fetch(`${API_URL}/api/v1/runs/${runData.runId}/result`, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      })

      if (resultRes.ok) {
        const result = await resultRes.json()

        // Output can be at result.output (direct) or result.result.output (nested)
        const output = result.result?.output || result.output || ""

        console.log("\n=== Result ===")
        console.log("Output:", output.substring(0, 500) || "(no output)")

        console.log("\n=== Tool Calls ===")
        const toolCalls = result.steps?.filter((s: { type: string }) => s.type === "tool_call") || []
        for (const call of toolCalls.slice(0, 20)) {
          console.log(`  - ${call.name}:`, call.input ? JSON.stringify(call.input).substring(0, 100) : "(no input)")
        }
        if (toolCalls.length > 20) {
          console.log(`  ... and ${toolCalls.length - 20} more tool calls`)
        }

        if (output.includes("TREASURE123")) {
          console.log("\n✅ SUCCESS: Agent found the secret code TREASURE123!")
        } else {
          console.log("\n❌ FAILED: Agent did not find the secret code")
          console.log("   Expected output to contain: TREASURE123")
        }
      }

      if (status.status === "succeeded") {
        console.log("\n✓ Agent run completed successfully")
      } else {
        console.log("\n✗ Agent run failed")
        console.log("   Error:", status.error)
      }
      return
    }
  }

  console.log("\n   Timeout reached - agent may still be running")
}

main().catch(console.error)
