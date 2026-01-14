#!/usr/bin/env bun
/**
 * Test Claude SDK executor via the API server
 *
 * Uses Haiku model by default for cheaper testing.
 * Set USE_SONNET=1 to use Sonnet instead.
 */

const API_URL = process.env.API_URL || "http://localhost:3000"
const API_KEY = process.env.TEST_API_KEY || "sk_live_PmAECb-UFh8o1vQp7zl_q4r4LIFPISwH"
const USE_SONNET = process.env.USE_SONNET === "1"
const CLEANUP = process.argv.includes("--cleanup")

// Use Haiku for cheaper testing (about 5x cheaper than Sonnet)
const MODEL = USE_SONNET ? "claude-sonnet-4-5-20250929" : "claude-haiku-4-5-20251001"

async function main() {
  console.log("=== Testing Claude SDK via API ===\n")
  console.log("API URL:", API_URL)
  console.log("Model:", MODEL, USE_SONNET ? "" : "(set USE_SONNET=1 for Sonnet)")

  // Create a new test agent with unique name
  const testId = Date.now().toString(36)
  const agentName = `SDK Test ${testId} (${USE_SONNET ? "Sonnet" : "Haiku"})`

  console.log("\n1. Creating test agent...")
  const createRes = await fetch(`${API_URL}/api/v1/agents`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: agentName,
      type: "claude_sdk",
      model: MODEL,
      instructions: "You are a helpful test assistant. Respond briefly and confirm you are working.",
    }),
  })

  if (!createRes.ok) {
    console.error("Failed to create agent:", createRes.status, await createRes.text())
    return
  }

  const agent = await createRes.json()
  console.log("   Created agent:", agent.id, "-", agent.name)

  try {
    // Trigger a run
    console.log("\n2. Triggering agent run...")
    const runRes = await fetch(`${API_URL}/api/v1/agents/${agent.id}/run`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: "Say 'Hello from SDK API test!' and confirm you are working.",
      }),
    })

    if (!runRes.ok) {
      console.error("Failed to trigger run:", runRes.status, await runRes.text())
      return
    }

    const runData = await runRes.json()
    console.log("   Run ID:", runData.runId)
    console.log("   Status:", runData.status)

    // Poll for completion
    console.log("\n3. Polling for completion...")
    const maxWait = 120000
    const pollInterval = 3000
    let elapsed = 0

    while (elapsed < maxWait) {
      await new Promise(resolve => setTimeout(resolve, pollInterval))
      elapsed += pollInterval

      const statusRes = await fetch(`${API_URL}/api/v1/runs/${runData.runId}`, {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
        },
      })

      if (!statusRes.ok) {
        console.log(`   ${elapsed}ms - Error fetching status:`, statusRes.status)
        continue
      }

      const status = await statusRes.json()
      console.log(`   ${elapsed}ms - Status: ${status.status}`)

      if (status.status === "succeeded" || status.status === "failed") {
        // Get full result
        const resultRes = await fetch(`${API_URL}/api/v1/runs/${runData.runId}/result`, {
          headers: {
            "Authorization": `Bearer ${API_KEY}`,
          },
        })

        if (resultRes.ok) {
          const result = await resultRes.json()
          console.log("\n=== Result ===")
          console.log(JSON.stringify(result, null, 2))
        }

        if (status.status === "succeeded") {
          console.log("\n✓ Agent run succeeded!")
        } else {
          console.log("\n✗ Agent run failed")
        }
        return
      }
    }

    console.log("\n   Timeout reached")
  } finally {
    if (CLEANUP) {
      console.log("\n4. Cleaning up test agent...")
      const deleteRes = await fetch(`${API_URL}/api/v1/agents/${agent.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
        },
      })

      if (deleteRes.ok) {
        console.log("   Deleted agent:", agent.id)
      } else {
        console.log("   Failed to delete agent:", deleteRes.status)
      }
    }
  }
}

main().catch(console.error)
