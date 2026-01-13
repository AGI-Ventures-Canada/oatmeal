#!/usr/bin/env bun
/**
 * SDK Integration Test Script
 *
 * Tests the SDK against a running local server.
 * Creates agents, runs them, and verifies results.
 *
 * Prerequisites:
 * 1. Start the dev server: `bun dev`
 * 2. Create an API key with all scopes in the dashboard
 *
 * Usage:
 *   bun test:sdk <api-key> [options]
 *
 * Options:
 *   --keep-agent    Don't delete test agent after tests
 *   --skip-agent    Skip agent execution tests (faster)
 *
 * Example:
 *   bun test:sdk sk_live_abc123...
 *   bun test:sdk sk_live_abc123... --keep-agent
 */

import { createClient } from "../packages/sdk/src/index"

// Parse CLI args
const args = process.argv.slice(2)
const flags = args.filter((a) => a.startsWith("--"))
const positional = args.filter((a) => !a.startsWith("--"))

const API_KEY = positional[0]
const KEEP_ALL = flags.includes("--keep-all")
const KEEP_AGENT = flags.includes("--keep-agent") || KEEP_ALL
const SKIP_AGENT = flags.includes("--skip-agent")
const BASE_URL = process.env.BASE_URL || "http://localhost:3000"

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
}

const log = {
  title: (msg: string) => console.log(`\n${colors.bright}${colors.blue}${msg}${colors.reset}`),
  section: (msg: string) => console.log(`\n${colors.bright}${colors.cyan}── ${msg} ──${colors.reset}`),
  step: (num: number, msg: string) => console.log(`\n${colors.cyan}[${num}]${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`    ${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`    ${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`    ${colors.red}✗${colors.reset} ${msg}`),
  info: (msg: string) => console.log(`    ${colors.gray}${msg}${colors.reset}`),
  data: (label: string, value: unknown) =>
    console.log(`    ${colors.dim}${label}:${colors.reset} ${colors.magenta}${value}${colors.reset}`),
  time: (ms: number) => console.log(`    ${colors.gray}(${ms}ms)${colors.reset}`),
}

if (!API_KEY) {
  console.log(`
${colors.bright}SDK Integration Test${colors.reset}

${colors.yellow}Usage:${colors.reset}
  bun test:sdk <api-key> [options]

${colors.yellow}Options:${colors.reset}
  --keep-agent    Don't delete test agent after tests
  --keep-all      Don't delete any test data (agent, webhook, skill, schedule)
  --skip-agent    Skip agent execution tests (faster)

${colors.yellow}Example:${colors.reset}
  bun test:sdk sk_live_abc123...
  bun test:sdk sk_live_abc123... --keep-agent

${colors.yellow}Setup:${colors.reset}
  1. Start dev server: ${colors.cyan}bun dev${colors.reset}
  2. Get API key from: ${colors.cyan}http://localhost:3000/keys${colors.reset}
  3. Make sure the API key has all scopes
`)
  process.exit(1)
}

const client = createClient(API_KEY, { baseUrl: BASE_URL })

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = performance.now()
  const result = await fn()
  return { result, ms: Math.round(performance.now() - start) }
}

let testAgentId: string | null = null
let testWebhookId: string | null = null
let testSkillId: string | null = null
let testScheduleId: string | null = null
let stepNum = 0

function nextStep(msg: string) {
  stepNum++
  log.step(stepNum, msg)
}

async function main() {
  log.title("🧪 SDK Integration Test")
  console.log(`${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
  log.data("Base URL", BASE_URL)
  log.data("API Key", `${API_KEY.slice(0, 12)}...${API_KEY.slice(-4)}`)
  if (KEEP_ALL) log.data("Flags", "--keep-all")
  else if (KEEP_AGENT) log.data("Flags", "--keep-agent")
  if (SKIP_AGENT) log.data("Flags", "--skip-agent")

  // ===========================================================================
  // Authentication
  // ===========================================================================
  log.section("Authentication")

  nextStep("Testing whoami endpoint")
  const { result: whoami, ms: whoamiMs } = await timed(() => client.whoami())
  if (whoami.error) {
    log.error(`Failed: ${whoami.error.error}`)
    log.info(`Status: ${whoami.status}`)
    process.exit(1)
  }
  log.success("Authenticated successfully")
  log.data("Tenant ID", whoami.data?.tenantId)
  log.data("Key ID", whoami.data?.keyId)
  log.data("Scopes", whoami.data?.scopes.join(", "))
  log.time(whoamiMs)

  const hasScope = (scope: string) => whoami.data?.scopes.includes(scope)

  // ===========================================================================
  // Jobs API
  // ===========================================================================
  log.section("Jobs API")

  nextStep("Testing jobs.create")
  const { result: job, ms: jobMs } = await timed(() =>
    client.jobs.create({
      type: "sdk-test",
      input: { message: "Hello from SDK test!", timestamp: new Date().toISOString() },
      idempotencyKey: `sdk-test-${Date.now()}`,
    })
  )
  if (job.error) {
    log.error(`Failed: ${job.error.error}`)
  } else {
    log.success("Job created")
    log.data("Job ID", job.data?.id)
    log.data("Type", job.data?.type)
    log.data("Status", job.data?.status)
  }
  log.time(jobMs)

  if (job.data) {
    const jobId = job.data.id

    nextStep("Testing jobs.get")
    const { result: jobStatus, ms: getMs } = await timed(() => client.jobs.get(jobId))
    if (jobStatus.error) {
      log.error(`Failed: ${jobStatus.error.error}`)
    } else {
      log.success(`Job status: ${jobStatus.data?.status}`)
    }
    log.time(getMs)

    nextStep("Testing jobs.getResult")
    const { result: jobResult, ms: resultMs } = await timed(() => client.jobs.getResult(jobId))
    if (jobResult.status === 202) {
      log.success("Job still running (202 Accepted) - expected")
    } else if (jobResult.error) {
      log.error(`Failed: ${jobResult.error.error}`)
    } else {
      log.success(`Got result: ${jobResult.data?.status}`)
    }
    log.time(resultMs)

    nextStep("Testing jobs.cancel")
    const { result: cancelResult, ms: cancelMs } = await timed(() => client.jobs.cancel(jobId))
    if (cancelResult.error) {
      log.warn(`Could not cancel: ${cancelResult.error.error}`)
    } else {
      log.success("Job canceled")
    }
    log.time(cancelMs)
  }

  // ===========================================================================
  // Agents CRUD
  // ===========================================================================
  log.section("Agents CRUD")

  if (!hasScope("agents:manage")) {
    log.warn("Skipping agent CRUD tests - missing 'agents:manage' scope")
  } else {
    nextStep("Testing agents.list (before)")
    const { result: agentsBefore, ms: listBeforeMs } = await timed(() => client.agents.list())
    if (agentsBefore.error) {
      log.error(`Failed: ${agentsBefore.error.error}`)
    } else {
      log.success(`Found ${agentsBefore.data?.agents.length || 0} existing agents`)
    }
    log.time(listBeforeMs)

    nextStep("Testing agents.create")
    const { result: newAgent, ms: createMs } = await timed(() =>
      client.agents.create({
        name: `SDK Test Agent ${Date.now()}`,
        description: "Created by SDK integration test",
        instructions: "You are a helpful test assistant. When asked, respond briefly and confirm you are working.",
        model: "claude-sonnet-4-5-20250929",
      })
    )
    if (newAgent.error) {
      log.error(`Failed: ${newAgent.error.error}`)
    } else {
      testAgentId = newAgent.data!.id
      log.success("Agent created")
      log.data("Agent ID", newAgent.data?.id)
      log.data("Name", newAgent.data?.name)
      log.data("Model", newAgent.data?.model)
    }
    log.time(createMs)

    if (testAgentId) {
      nextStep("Testing agents.get")
      const { result: agentGet, ms: getAgentMs } = await timed(() => client.agents.get(testAgentId!))
      if (agentGet.error) {
        log.error(`Failed: ${agentGet.error.error}`)
      } else {
        log.success("Agent retrieved")
        log.data("Instructions", `${agentGet.data?.instructions?.slice(0, 50)}...`)
      }
      log.time(getAgentMs)

      nextStep("Testing agents.update")
      const { result: agentUpdate, ms: updateMs } = await timed(() =>
        client.agents.update(testAgentId!, {
          description: "Updated by SDK test",
        })
      )
      if (agentUpdate.error) {
        log.error(`Failed: ${agentUpdate.error.error}`)
      } else {
        log.success("Agent updated")
        log.data("New description", agentUpdate.data?.description)
      }
      log.time(updateMs)

      nextStep("Testing agents.list (after)")
      const { result: agentsAfter, ms: listAfterMs } = await timed(() => client.agents.list())
      if (agentsAfter.error) {
        log.error(`Failed: ${agentsAfter.error.error}`)
      } else {
        const found = agentsAfter.data?.agents.find((a) => a.id === testAgentId)
        if (found) {
          log.success(`Test agent found in list (${agentsAfter.data?.agents.length} total)`)
        } else {
          log.error("Test agent not found in list")
        }
      }
      log.time(listAfterMs)
    }
  }

  // ===========================================================================
  // Agent Execution
  // ===========================================================================
  log.section("Agent Execution")

  if (SKIP_AGENT) {
    log.warn("Skipping agent execution - --skip-agent flag set")
  } else if (!testAgentId) {
    log.warn("Skipping agent execution - no test agent created")
  } else if (!hasScope("agents:run")) {
    log.warn("Skipping agent execution - missing 'agents:run' scope")
  } else {
    nextStep("Testing agents.run")
    const { result: agentRun, ms: runMs } = await timed(() =>
      client.agents.run(testAgentId!, {
        prompt: "Say 'Hello from SDK test!' and confirm you are working. Keep it very brief.",
      })
    )
    if (agentRun.error) {
      log.error(`Failed: ${agentRun.error.error}`)
    } else {
      log.success("Agent run started")
      log.data("Run ID", agentRun.data?.runId)
      log.data("Status", agentRun.data?.status)
    }
    log.time(runMs)

    if (agentRun.data) {
      const runId = agentRun.data.runId

      nextStep("Testing agents.getRun")
      const { result: runStatus, ms: statusMs } = await timed(() => client.agents.getRun(runId))
      if (runStatus.error) {
        log.error(`Failed: ${runStatus.error.error}`)
      } else {
        log.success(`Run status: ${runStatus.data?.status}`)
      }
      log.time(statusMs)

      nextStep("Testing agents.waitForResult")
      log.info("Waiting for agent to complete (60s max)...")
      try {
        const { result: runResult, ms: waitMs } = await timed(() =>
          client.agents.waitForResult(runId, {
            intervalMs: 1000,
            maxAttempts: 60,
          })
        )

        if (runResult.status === "succeeded") {
          log.success("Agent run succeeded!")
          const output = runResult.result ? JSON.stringify(runResult.result, null, 2) : "(no result data)"
          log.info(`Output: ${output.slice(0, 200)}${output.length > 200 ? "..." : ""}`)
          if (runResult.totalTokens) log.data("Total tokens", runResult.totalTokens)
          if (runResult.totalCostCents) log.data("Cost (cents)", runResult.totalCostCents)
          if (runResult.steps) log.data("Steps", runResult.steps.length)
        } else if (runResult.status === "failed") {
          log.error(`Agent run failed: ${JSON.stringify(runResult.error)}`)
        } else {
          log.warn(`Run ended with status: ${runResult.status}`)
        }
        log.time(waitMs)
      } catch (err) {
        log.error(`Timeout or error: ${(err as Error).message}`)
      }
    }
  }

  // ===========================================================================
  // Webhooks API
  // ===========================================================================
  log.section("Webhooks API")

  if (!hasScope("webhooks:read") || !hasScope("webhooks:write")) {
    log.warn("Skipping webhook tests - missing 'webhooks:read' or 'webhooks:write' scope")
  } else {
    nextStep("Testing webhooks.list (before)")
    const { result: webhooksBefore, ms: webhooksListMs } = await timed(() => client.webhooks.list())
    if (webhooksBefore.error) {
      log.error(`Failed: ${webhooksBefore.error.error}`)
    } else {
      log.success(`Found ${webhooksBefore.data?.webhooks.length || 0} existing webhooks`)
    }
    log.time(webhooksListMs)

    nextStep("Testing webhooks.create")
    const { result: newWebhook, ms: webhookCreateMs } = await timed(() =>
      client.webhooks.create({
        url: "https://webhook.site/test-sdk",
        events: ["agent_run.completed", "agent_run.failed"],
      })
    )
    if (newWebhook.error) {
      log.error(`Failed: ${newWebhook.error.error}`)
    } else {
      testWebhookId = newWebhook.data!.id
      log.success("Webhook created")
      log.data("Webhook ID", newWebhook.data?.id)
      log.data("URL", newWebhook.data?.url)
      log.data("Secret", `${newWebhook.data?.secret?.slice(0, 10)}...`)
    }
    log.time(webhookCreateMs)

    nextStep("Testing webhooks.list (after)")
    const { result: webhooksAfter, ms: webhooksListAfterMs } = await timed(() => client.webhooks.list())
    if (webhooksAfter.error) {
      log.error(`Failed: ${webhooksAfter.error.error}`)
    } else {
      const found = webhooksAfter.data?.webhooks.find((w) => w.id === testWebhookId)
      if (found) {
        log.success(`Test webhook found in list (${webhooksAfter.data?.webhooks.length} total)`)
      } else {
        log.error("Test webhook not found in list")
      }
    }
    log.time(webhooksListAfterMs)

    if (testWebhookId && !KEEP_ALL) {
      nextStep("Testing webhooks.delete")
      const { result: webhookDelete, ms: webhookDeleteMs } = await timed(() =>
        client.webhooks.delete(testWebhookId!)
      )
      if (webhookDelete.error) {
        log.error(`Failed: ${webhookDelete.error.error}`)
      } else {
        log.success("Webhook deleted")
        testWebhookId = null
      }
      log.time(webhookDeleteMs)
    } else if (testWebhookId && KEEP_ALL) {
      log.info(`Keeping test webhook: ${testWebhookId}`)
    }
  }

  // ===========================================================================
  // Skills API
  // ===========================================================================
  log.section("Skills API")

  if (!hasScope("skills:read") || !hasScope("skills:write")) {
    log.warn("Skipping skills tests - missing 'skills:read' or 'skills:write' scope")
  } else {
    nextStep("Testing skills.list (before)")
    const { result: skillsBefore, ms: skillsListMs } = await timed(() => client.skills.list())
    if (skillsBefore.error) {
      log.error(`Failed: ${skillsBefore.error.error}`)
    } else {
      log.success(`Found ${skillsBefore.data?.skills.length || 0} existing skills`)
    }
    log.time(skillsListMs)

    nextStep("Testing skills.create")
    const skillSlug = `sdk-test-skill-${Date.now()}`
    const { result: newSkill, ms: skillCreateMs } = await timed(() =>
      client.skills.create({
        name: "SDK Test Skill",
        slug: skillSlug,
        description: "Created by SDK integration test",
        content: "# Test Skill\n\nThis is a test skill created by the SDK.",
      })
    )
    if (newSkill.error) {
      log.error(`Failed: ${newSkill.error.error}`)
    } else {
      testSkillId = newSkill.data!.id
      log.success("Skill created")
      log.data("Skill ID", newSkill.data?.id)
      log.data("Slug", newSkill.data?.slug)
    }
    log.time(skillCreateMs)

    if (testSkillId) {
      nextStep("Testing skills.get")
      const { result: skillGet, ms: skillGetMs } = await timed(() => client.skills.get(testSkillId!))
      if (skillGet.error) {
        log.error(`Failed: ${skillGet.error.error}`)
      } else {
        log.success("Skill retrieved")
        log.data("Name", skillGet.data?.name)
        log.data("Content", `${skillGet.data?.content?.slice(0, 50)}...`)
      }
      log.time(skillGetMs)

      nextStep("Testing skills.update")
      const { result: skillUpdate, ms: skillUpdateMs } = await timed(() =>
        client.skills.update(testSkillId!, {
          description: "Updated by SDK test",
        })
      )
      if (skillUpdate.error) {
        log.error(`Failed: ${skillUpdate.error.error}`)
      } else {
        log.success("Skill updated")
        log.data("Version", skillUpdate.data?.version)
      }
      log.time(skillUpdateMs)

      if (!KEEP_ALL) {
        nextStep("Testing skills.delete")
        const { result: skillDelete, ms: skillDeleteMs } = await timed(() =>
          client.skills.delete(testSkillId!)
        )
        if (skillDelete.error) {
          log.error(`Failed: ${skillDelete.error.error}`)
        } else {
          log.success("Skill deleted")
          testSkillId = null
        }
        log.time(skillDeleteMs)
      } else {
        log.info(`Keeping test skill: ${testSkillId}`)
      }
    }
  }

  // ===========================================================================
  // Schedules API
  // ===========================================================================
  log.section("Schedules API")

  if (!hasScope("schedules:read") || !hasScope("schedules:write")) {
    log.warn("Skipping schedules tests - missing 'schedules:read' or 'schedules:write' scope")
  } else {
    nextStep("Testing schedules.list (before)")
    const { result: schedulesBefore, ms: schedulesListMs } = await timed(() => client.schedules.list())
    if (schedulesBefore.error) {
      log.error(`Failed: ${schedulesBefore.error.error}`)
    } else {
      log.success(`Found ${schedulesBefore.data?.schedules.length || 0} existing schedules`)
    }
    log.time(schedulesListMs)

    nextStep("Testing schedules.create")
    const { result: newSchedule, ms: scheduleCreateMs } = await timed(() =>
      client.schedules.create({
        name: `SDK Test Schedule ${Date.now()}`,
        frequency: "daily",
        timezone: "UTC",
        jobType: "sdk-test",
        input: { source: "sdk-test" },
      })
    )
    if (newSchedule.error) {
      log.error(`Failed: ${newSchedule.error.error}`)
    } else {
      testScheduleId = newSchedule.data!.id
      log.success("Schedule created")
      log.data("Schedule ID", newSchedule.data?.id)
      log.data("Name", newSchedule.data?.name)
      log.data("Next run", newSchedule.data?.nextRunAt)
    }
    log.time(scheduleCreateMs)

    if (testScheduleId) {
      nextStep("Testing schedules.get")
      const { result: scheduleGet, ms: scheduleGetMs } = await timed(() =>
        client.schedules.get(testScheduleId!)
      )
      if (scheduleGet.error) {
        log.error(`Failed: ${scheduleGet.error.error}`)
      } else {
        log.success("Schedule retrieved")
        log.data("Frequency", scheduleGet.data?.frequency)
        log.data("Timezone", scheduleGet.data?.timezone)
        log.data("Is Active", scheduleGet.data?.isActive)
      }
      log.time(scheduleGetMs)

      nextStep("Testing schedules.update")
      const { result: scheduleUpdate, ms: scheduleUpdateMs } = await timed(() =>
        client.schedules.update(testScheduleId!, {
          isActive: false,
        })
      )
      if (scheduleUpdate.error) {
        log.error(`Failed: ${scheduleUpdate.error.error}`)
      } else {
        log.success("Schedule updated (deactivated)")
      }
      log.time(scheduleUpdateMs)

      if (!KEEP_ALL) {
        nextStep("Testing schedules.delete")
        const { result: scheduleDelete, ms: scheduleDeleteMs } = await timed(() =>
          client.schedules.delete(testScheduleId!)
        )
        if (scheduleDelete.error) {
          log.error(`Failed: ${scheduleDelete.error.error}`)
        } else {
          log.success("Schedule deleted")
          testScheduleId = null
        }
        log.time(scheduleDeleteMs)
      } else {
        log.info(`Keeping test schedule: ${testScheduleId}`)
      }
    }
  }

  // ===========================================================================
  // Error Handling
  // ===========================================================================
  log.section("Error Handling")

  nextStep("Testing 404 for non-existent agent")
  const { result: notFound, ms: notFoundMs } = await timed(() =>
    client.agents.get("non-existent-agent-id")
  )
  if (notFound.status === 404) {
    log.success("Correctly returns 404")
  } else {
    log.warn(`Unexpected status: ${notFound.status}`)
  }
  log.time(notFoundMs)

  nextStep("Testing 404 for non-existent run")
  const { result: runNotFound, ms: runNotFoundMs } = await timed(() =>
    client.agents.getRun("non-existent-run-id")
  )
  if (runNotFound.status === 404) {
    log.success("Correctly returns 404")
  } else {
    log.warn(`Unexpected status: ${runNotFound.status}`)
  }
  log.time(runNotFoundMs)

  // ===========================================================================
  // Cleanup (optional)
  // ===========================================================================
  log.section("Cleanup")

  if (testAgentId && hasScope("agents:manage")) {
    if (KEEP_AGENT) {
      log.info(`Keeping test agent: ${testAgentId}`)
      log.info(`View at: ${BASE_URL}/agents/${testAgentId}`)
    } else {
      nextStep("Testing agents.delete")
      const { result: deleteResult, ms: deleteMs } = await timed(() =>
        client.agents.delete(testAgentId!)
      )
      if (deleteResult.error) {
        log.error(`Failed: ${deleteResult.error.error}`)
      } else {
        log.success("Test agent deleted")
        testAgentId = null
      }
      log.time(deleteMs)
    }
  }

  // ===========================================================================
  // Summary
  // ===========================================================================
  console.log(`\n${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
  log.title("✅ SDK Integration Test Complete!")
  console.log(`
${colors.gray}Check your dashboard to see:${colors.reset}
  • Jobs page: ${colors.cyan}${BASE_URL}/jobs${colors.reset}
  • Agents page: ${colors.cyan}${BASE_URL}/agents${colors.reset}
  • Agent runs: ${colors.cyan}${BASE_URL}/agents/<id>${colors.reset}
`)

  if (testAgentId && KEEP_AGENT) {
    console.log(`${colors.yellow}Test agent kept:${colors.reset} ${testAgentId}`)
  }
}

main()
  .catch(async (err) => {
    log.error(`Fatal error: ${err.message}`)
    process.exit(1)
  })
