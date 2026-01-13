import { Elysia, t } from "elysia"
import { resolvePrincipal, requirePrincipal, AuthError } from "@/lib/auth/principal"
import { createJob, getJobById, cancelJob, startJobWorkflow } from "@/lib/services/jobs"
import { logAudit } from "@/lib/services/audit"
import { checkRateLimit, getRateLimitHeaders, defaultRateLimits } from "@/lib/services/rate-limit"
import type { Json } from "@/lib/db/types"
import type { AgentType } from "@/lib/db/agent-types"

class RateLimitError extends Error {
  constructor(
    public resetAt: number,
    public remaining: number
  ) {
    super("Rate limit exceeded")
    this.name = "RateLimitError"
  }
}

export const v1Routes = new Elysia({ prefix: "/v1", tags: ["v1"] })
  .onError(({ error }) => {
    if (error instanceof AuthError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.statusCode,
        headers: { "Content-Type": "application/json" },
      })
    }
    if (error instanceof RateLimitError) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...getRateLimitHeaders({ allowed: false, remaining: error.remaining, resetAt: error.resetAt }),
        },
      })
    }
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  })
  .derive(async ({ request }) => {
    const principal = await resolvePrincipal(request)
    return { principal }
  })
  .get("/whoami", async ({ principal }) => {
    requirePrincipal(principal, ["api_key"])

    const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
    if (!rateLimit.allowed) {
      throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
    }

    return {
      tenantId: principal.tenantId,
      keyId: principal.keyId,
      scopes: principal.scopes,
    }
  }, {
    detail: {
      summary: "Get current API key info",
      description: "Returns information about the authenticated API key including tenant, key ID, and scopes.",
      externalDocs: {
        description: "Code samples",
        url: "#whoami-samples",
      },
    },
  })
  .post(
    "/jobs",
    async ({ principal, body, request }) => {
      requirePrincipal(principal, ["api_key"], ["jobs:create"])

      const rateLimit = checkRateLimit(
        `api_key:${principal.keyId}:jobs:create`,
        defaultRateLimits["api_key:jobs:create"]
      )
      if (!rateLimit.allowed) {
        throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
      }

      const idempotencyKey = request.headers.get("idempotency-key") ?? body.idempotencyKey

      const job = await createJob({
        tenantId: principal.tenantId,
        type: body.type,
        input: body.input as Json | undefined,
        createdByKeyId: principal.keyId,
        idempotencyKey: idempotencyKey ?? undefined,
      })

      if (!job) {
        throw new Error("Failed to create job")
      }

      await startJobWorkflow(job)

      await logAudit({
        principal,
        action: "job.created",
        resourceType: "job",
        resourceId: job.id,
        metadata: { type: body.type },
      })

      return {
        id: job.id,
        type: job.type,
        status: job.status_cache,
        createdAt: job.created_at,
      }
    },
    {
      body: t.Object({
        type: t.String({ minLength: 1, description: "Job type identifier" }),
        input: t.Optional(t.Any({ description: "Job input payload (JSON)" })),
        idempotencyKey: t.Optional(t.String({ description: "Unique key for idempotent requests" })),
      }),
      detail: {
        summary: "Create a new job",
        description: "Creates a new job and starts its workflow execution. Supports idempotency via header or body.",
      },
    }
  )
  .get("/jobs/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["api_key"], ["jobs:read"])

    const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
    if (!rateLimit.allowed) {
      throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
    }

    const job = await getJobById(params.id, principal.tenantId)
    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    return {
      id: job.id,
      type: job.type,
      status: job.status_cache,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      completedAt: job.completed_at,
    }
  }, {
    detail: {
      summary: "Get job status",
      description: "Returns the current status and metadata of a job.",
    },
  })
  .get("/jobs/:id/result", async ({ principal, params }) => {
    requirePrincipal(principal, ["api_key"], ["jobs:read"])

    const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
    if (!rateLimit.allowed) {
      throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
    }

    const job = await getJobById(params.id, principal.tenantId)
    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (job.status_cache === "queued" || job.status_cache === "running") {
      return new Response(
        JSON.stringify({
          error: "Job not completed",
          status: job.status_cache,
        }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    return {
      id: job.id,
      status: job.status_cache,
      result: job.result,
      error: job.error,
      completedAt: job.completed_at,
    }
  }, {
    detail: {
      summary: "Get job result",
      description: "Returns the result of a completed job. Returns 202 if job is still running.",
    },
  })
  .post("/jobs/:id/cancel", async ({ principal, params }) => {
    requirePrincipal(principal, ["api_key"], ["jobs:cancel"])

    const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
    if (!rateLimit.allowed) {
      throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
    }

    const success = await cancelJob(params.id, principal.tenantId)
    if (!success) {
      return new Response(
        JSON.stringify({ error: "Cannot cancel job (not found or already completed)" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    await logAudit({
      principal,
      action: "job.canceled",
      resourceType: "job",
      resourceId: params.id,
    })

    return { success: true }
  }, {
    detail: {
      summary: "Cancel a job",
      description: "Cancels a queued or running job. Cannot cancel completed jobs.",
    },
  })
  // ============================================================================
  // Agents CRUD
  // ============================================================================
  .get("/agents", async ({ principal, query }) => {
    requirePrincipal(principal, ["api_key"], ["agents:read"])

    const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
    if (!rateLimit.allowed) {
      throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
    }

    const { listAgents } = await import("@/lib/services/agents")
    const agents = await listAgents(principal.tenantId, {
      limit: query.limit ? parseInt(query.limit) : undefined,
    })

    return {
      agents: agents.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        type: a.type,
        model: a.model,
        isActive: a.is_active,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      })),
    }
  }, {
    detail: {
      summary: "List agents",
      description: "Returns all agents for the authenticated tenant.",
    },
  })
  .post(
    "/agents",
    async ({ principal, body }) => {
      requirePrincipal(principal, ["api_key"], ["agents:manage"])

      const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
      if (!rateLimit.allowed) {
        throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
      }

      const { createAgent } = await import("@/lib/services/agents")
      const agent = await createAgent({
        tenantId: principal.tenantId,
        name: body.name,
        description: body.description,
        instructions: body.instructions,
        type: (body.type as AgentType) ?? "ai_sdk",
        model: body.model ?? "claude-sonnet-4-5-20250929",
        skillIds: body.skillIds,
        config: body.config,
      })

      if (!agent) {
        throw new Error("Failed to create agent")
      }

      await logAudit({
        principal,
        action: "agent.created",
        resourceType: "agent",
        resourceId: agent.id,
        metadata: { name: body.name },
      })

      return {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        instructions: agent.instructions,
        type: agent.type,
        model: agent.model,
        isActive: agent.is_active,
        createdAt: agent.created_at,
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, description: "Agent name" }),
        description: t.Optional(t.String({ description: "Agent description" })),
        instructions: t.String({ minLength: 1, description: "System instructions for the agent" }),
        type: t.Optional(t.String({ description: "Agent type (default: ai_sdk)" })),
        model: t.Optional(t.String({ description: "Model to use (default: claude-sonnet-4-5-20250929)" })),
        skillIds: t.Optional(t.Array(t.String(), { description: "Skill IDs to attach" })),
        config: t.Optional(t.Any({ description: "Additional configuration (JSON)" })),
      }),
      detail: {
        summary: "Create agent",
        description: "Creates a new agent with the specified configuration.",
      },
    }
  )
  .get("/agents/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["api_key"], ["agents:read"])

    const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
    if (!rateLimit.allowed) {
      throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
    }

    const { getAgentById } = await import("@/lib/services/agents")
    const agent = await getAgentById(params.id, principal.tenantId)

    if (!agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    return {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      instructions: agent.instructions,
      type: agent.type,
      model: agent.model,
      isActive: agent.is_active,
      skillIds: agent.skill_ids,
      config: agent.config,
      createdAt: agent.created_at,
      updatedAt: agent.updated_at,
    }
  }, {
    detail: {
      summary: "Get agent",
      description: "Returns details of a specific agent.",
    },
  })
  .patch(
    "/agents/:id",
    async ({ principal, params, body }) => {
      requirePrincipal(principal, ["api_key"], ["agents:manage"])

      const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
      if (!rateLimit.allowed) {
        throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
      }

      const { updateAgent } = await import("@/lib/services/agents")
      const agent = await updateAgent(params.id, principal.tenantId, {
        name: body.name,
        description: body.description,
        instructions: body.instructions,
        model: body.model,
        skillIds: body.skillIds,
        config: body.config,
        isActive: body.isActive,
      })

      if (!agent) {
        return new Response(JSON.stringify({ error: "Agent not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }

      await logAudit({
        principal,
        action: "agent.updated",
        resourceType: "agent",
        resourceId: params.id,
      })

      return {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        instructions: agent.instructions,
        type: agent.type,
        model: agent.model,
        isActive: agent.is_active,
        skillIds: agent.skill_ids,
        config: agent.config,
        updatedAt: agent.updated_at,
      }
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        description: t.Optional(t.String()),
        instructions: t.Optional(t.String({ minLength: 1 })),
        model: t.Optional(t.String()),
        skillIds: t.Optional(t.Array(t.String())),
        config: t.Optional(t.Any()),
        isActive: t.Optional(t.Boolean()),
      }),
      detail: {
        summary: "Update agent",
        description: "Updates an existing agent.",
      },
    }
  )
  .delete("/agents/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["api_key"], ["agents:manage"])

    const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
    if (!rateLimit.allowed) {
      throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
    }

    const { deleteAgent } = await import("@/lib/services/agents")
    const success = await deleteAgent(params.id, principal.tenantId)

    if (!success) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    await logAudit({
      principal,
      action: "agent.deleted",
      resourceType: "agent",
      resourceId: params.id,
    })

    return { success: true }
  }, {
    detail: {
      summary: "Delete agent",
      description: "Deletes an agent.",
    },
  })
  // ============================================================================
  // Agent Runs
  // ============================================================================
  .post(
    "/agents/:id/run",
    async ({ principal, body, params, request }) => {
      requirePrincipal(principal, ["api_key"], ["agents:run"])

      const rateLimit = checkRateLimit(
        `api_key:${principal.keyId}:agents:run`,
        defaultRateLimits["api_key:jobs:create"]
      )
      if (!rateLimit.allowed) {
        throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
      }

      const { getAgentById } = await import("@/lib/services/agents")
      const agent = await getAgentById(params.id, principal.tenantId)

      if (!agent) {
        return new Response(JSON.stringify({ error: "Agent not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }

      const { createAgentRun } = await import("@/lib/services/agent-runs")
      const idempotencyKey = request.headers.get("idempotency-key") ?? body.idempotencyKey

      const run = await createAgentRun({
        tenantId: principal.tenantId,
        agentId: params.id,
        triggerType: "manual",
        input: {
          trigger: "manual",
          prompt: body.prompt,
          context: body.context,
        },
        idempotencyKey,
      })

      if (!run) {
        throw new Error("Failed to create agent run")
      }

      const { start } = await import("workflow/api")
      const { runAgentWorkflow } = await import("@/lib/workflows/agents")

      await start(runAgentWorkflow, [{
        runId: run.id,
        agentId: params.id,
        tenantId: principal.tenantId,
        triggerInput: {
          trigger: "manual",
          prompt: body.prompt,
          context: body.context,
        },
      }])

      await logAudit({
        principal,
        action: "agent_run.created",
        resourceType: "agent_run",
        resourceId: run.id,
        metadata: { agentId: params.id },
      })

      return {
        runId: run.id,
        agentId: params.id,
        status: run.status,
        createdAt: run.created_at,
      }
    },
    {
      body: t.Object({
        prompt: t.String({ minLength: 1, description: "The prompt/task for the agent" }),
        context: t.Optional(t.Any({ description: "Additional context (JSON)" })),
        idempotencyKey: t.Optional(t.String({ description: "Unique key for idempotent requests" })),
      }),
      detail: {
        summary: "Trigger agent run",
        description: "Creates a new agent run and starts execution. Returns immediately with run ID.",
      },
    }
  )
  .get("/runs/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["api_key"], ["agents:read"])

    const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
    if (!rateLimit.allowed) {
      throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
    }

    const { getAgentRunById } = await import("@/lib/services/agent-runs")
    const run = await getAgentRunById(params.id, principal.tenantId)

    if (!run) {
      return new Response(JSON.stringify({ error: "Run not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    return {
      id: run.id,
      agentId: run.agent_id,
      status: run.status,
      triggerType: run.trigger_type,
      startedAt: run.started_at,
      completedAt: run.completed_at,
      totalTokens: run.total_tokens,
      totalCostCents: run.total_cost_cents,
    }
  }, {
    detail: {
      summary: "Get agent run status",
      description: "Returns the current status of an agent run.",
    },
  })
  .get("/runs/:id/result", async ({ principal, params }) => {
    requirePrincipal(principal, ["api_key"], ["agents:read"])

    const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
    if (!rateLimit.allowed) {
      throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
    }

    const { getAgentRunById, listAgentRunSteps } = await import("@/lib/services/agent-runs")
    const run = await getAgentRunById(params.id, principal.tenantId)

    if (!run) {
      return new Response(JSON.stringify({ error: "Run not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (run.status === "queued" || run.status === "initializing" || run.status === "running") {
      return new Response(
        JSON.stringify({
          error: "Run not completed",
          status: run.status,
        }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const steps = await listAgentRunSteps(params.id, principal.tenantId)

    return {
      id: run.id,
      agentId: run.agent_id,
      status: run.status,
      result: run.result,
      error: run.error,
      completedAt: run.completed_at,
      totalTokens: run.total_tokens,
      totalCostCents: run.total_cost_cents,
      steps: steps.map((s) => ({
        stepNumber: s.step_number,
        type: s.type,
        name: s.name,
        output: s.output,
        durationMs: s.duration_ms,
      })),
    }
  }, {
    detail: {
      summary: "Get agent run result",
      description: "Returns the result of a completed agent run. Returns 202 if still running.",
    },
  })
  .get("/runs/:id/stream", async ({ principal, params }) => {
    requirePrincipal(principal, ["api_key"], ["agents:read"])

    const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
    if (!rateLimit.allowed) {
      throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
    }

    const { getAgentRunById, listAgentRunSteps } = await import("@/lib/services/agent-runs")
    const run = await getAgentRunById(params.id, principal.tenantId)

    if (!run) {
      return new Response(JSON.stringify({ error: "Run not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    const encoder = new TextEncoder()
    let intervalId: ReturnType<typeof setInterval> | null = null

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        sendEvent("status", { status: run.status, startedAt: run.started_at })

        if (run.status === "succeeded" || run.status === "failed" || run.status === "canceled") {
          const steps = await listAgentRunSteps(params.id, principal.tenantId)
          for (const step of steps) {
            sendEvent("step", {
              stepNumber: step.step_number,
              type: step.type,
              name: step.name,
              output: step.output,
            })
          }
          sendEvent("done", {
            status: run.status,
            result: run.result,
            error: run.error,
            completedAt: run.completed_at,
          })
          controller.close()
          return
        }

        let lastStepCount = 0

        intervalId = setInterval(async () => {
          try {
            const currentRun = await getAgentRunById(params.id, principal.tenantId)
            if (!currentRun) {
              controller.close()
              if (intervalId) clearInterval(intervalId)
              return
            }

            const steps = await listAgentRunSteps(params.id, principal.tenantId)
            for (let i = lastStepCount; i < steps.length; i++) {
              sendEvent("step", {
                stepNumber: steps[i].step_number,
                type: steps[i].type,
                name: steps[i].name,
                output: steps[i].output,
              })
            }
            lastStepCount = steps.length

            if (
              currentRun.status === "succeeded" ||
              currentRun.status === "failed" ||
              currentRun.status === "canceled"
            ) {
              sendEvent("done", {
                status: currentRun.status,
                result: currentRun.result,
                error: currentRun.error,
                completedAt: currentRun.completed_at,
              })
              controller.close()
              if (intervalId) clearInterval(intervalId)
            }
          } catch {
            controller.close()
            if (intervalId) clearInterval(intervalId)
          }
        }, 1000)
      },
      cancel() {
        if (intervalId) clearInterval(intervalId)
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  }, {
    detail: {
      summary: "Stream agent run updates",
      description: "SSE stream of agent run status and step updates.",
    },
  })
  .post(
    "/runs/:id/input",
    async ({ principal, params, body }) => {
      requirePrincipal(principal, ["api_key"], ["agents:run"])

      const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
      if (!rateLimit.allowed) {
        throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
      }

      const { getAgentRunById, provideHumanInput } = await import("@/lib/services/agent-runs")
      const run = await getAgentRunById(params.id, principal.tenantId)

      if (!run) {
        return new Response(JSON.stringify({ error: "Run not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }

      if (run.status !== "awaiting_input") {
        return new Response(
          JSON.stringify({
            error: "Run is not awaiting input",
            status: run.status,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        )
      }

      const success = await provideHumanInput(params.id, principal.tenantId, body.input as Json)

      if (!success) {
        throw new Error("Failed to provide input")
      }

      await logAudit({
        principal,
        action: "agent_run.input_provided",
        resourceType: "agent_run",
        resourceId: params.id,
      })

      return { success: true }
    },
    {
      body: t.Object({
        input: t.Any({ description: "Human input to provide to the waiting agent" }),
      }),
      detail: {
        summary: "Provide human input",
        description: "Provides human-in-the-loop input to an agent run that is awaiting input.",
      },
    }
  )
  .post("/runs/:id/cancel", async ({ principal, params }) => {
    requirePrincipal(principal, ["api_key"], ["agents:run"])

    const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
    if (!rateLimit.allowed) {
      throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
    }

    const { cancelAgentRun } = await import("@/lib/services/agent-runs")
    const success = await cancelAgentRun(params.id, principal.tenantId)

    if (!success) {
      return new Response(
        JSON.stringify({ error: "Cannot cancel run (not found or already completed)" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    await logAudit({
      principal,
      action: "agent_run.canceled",
      resourceType: "agent_run",
      resourceId: params.id,
    })

    return { success: true }
  }, {
    detail: {
      summary: "Cancel agent run",
      description: "Cancels a running agent run.",
    },
  })
  // ============================================================================
  // Webhooks
  // ============================================================================
  .get("/webhooks", async ({ principal }) => {
    requirePrincipal(principal, ["api_key"], ["webhooks:read"])

    const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
    if (!rateLimit.allowed) {
      throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
    }

    const { listWebhooks } = await import("@/lib/services/webhooks")
    const webhooks = await listWebhooks(principal.tenantId)

    return {
      webhooks: webhooks.map((w) => ({
        id: w.id,
        url: w.url,
        events: w.events,
        isActive: w.is_active,
        failureCount: w.failure_count,
        lastTriggeredAt: w.last_triggered_at,
        createdAt: w.created_at,
      })),
    }
  }, {
    detail: {
      summary: "List webhooks",
      description: "Returns all webhooks for the authenticated tenant.",
    },
  })
  .post(
    "/webhooks",
    async ({ principal, body }) => {
      requirePrincipal(principal, ["api_key"], ["webhooks:write"])

      const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
      if (!rateLimit.allowed) {
        throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
      }

      const { createWebhook } = await import("@/lib/services/webhooks")
      const result = await createWebhook({
        tenantId: principal.tenantId,
        url: body.url,
        events: body.events as import("@/lib/db/agent-types").WebhookEvent[],
      })

      if (!result) {
        throw new Error("Failed to create webhook")
      }

      await logAudit({
        principal,
        action: "webhook.created",
        resourceType: "webhook",
        resourceId: result.webhook.id,
      })

      return {
        id: result.webhook.id,
        url: result.webhook.url,
        events: result.webhook.events,
        secret: result.secret,
        createdAt: result.webhook.created_at,
      }
    },
    {
      body: t.Object({
        url: t.String({ format: "uri", description: "Webhook endpoint URL" }),
        events: t.Array(t.String(), { description: "Events to subscribe to" }),
      }),
      detail: {
        summary: "Create webhook",
        description: "Creates a new webhook. Returns the webhook secret ONCE.",
      },
    }
  )
  .delete("/webhooks/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["api_key"], ["webhooks:write"])

    const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
    if (!rateLimit.allowed) {
      throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
    }

    const { deleteWebhook } = await import("@/lib/services/webhooks")
    const success = await deleteWebhook(params.id, principal.tenantId)

    if (!success) {
      return new Response(JSON.stringify({ error: "Webhook not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    await logAudit({
      principal,
      action: "webhook.deleted",
      resourceType: "webhook",
      resourceId: params.id,
    })

    return { success: true }
  }, {
    detail: {
      summary: "Delete webhook",
      description: "Deletes a webhook.",
    },
  })
  // ============================================================================
  // Skills
  // ============================================================================
  .get("/skills", async ({ principal, query }) => {
    requirePrincipal(principal, ["api_key"], ["skills:read"])

    const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
    if (!rateLimit.allowed) {
      throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
    }

    const { listSkills } = await import("@/lib/services/skills")
    const skills = await listSkills(principal.tenantId, {
      limit: query.limit ? parseInt(query.limit) : undefined,
    })

    return {
      skills: skills.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        description: s.description,
        version: s.version,
        isBuiltin: s.is_builtin,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })),
    }
  }, {
    detail: {
      summary: "List skills",
      description: "Returns all skills for the authenticated tenant.",
    },
  })
  .post(
    "/skills",
    async ({ principal, body }) => {
      requirePrincipal(principal, ["api_key"], ["skills:write"])

      const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
      if (!rateLimit.allowed) {
        throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
      }

      const { createSkill } = await import("@/lib/services/skills")
      const skill = await createSkill({
        tenantId: principal.tenantId,
        name: body.name,
        slug: body.slug,
        description: body.description,
        content: body.content,
        referencesContent: body.referencesContent as Json | undefined,
        scriptsContent: body.scriptsContent as Json | undefined,
      })

      if (!skill) {
        throw new Error("Failed to create skill")
      }

      await logAudit({
        principal,
        action: "skill.created",
        resourceType: "skill",
        resourceId: skill.id,
        metadata: { name: body.name },
      })

      return {
        id: skill.id,
        name: skill.name,
        slug: skill.slug,
        createdAt: skill.created_at,
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, description: "Skill name" }),
        slug: t.String({ minLength: 1, description: "Unique slug identifier" }),
        description: t.Optional(t.String({ description: "Skill description" })),
        content: t.String({ minLength: 1, description: "Skill content (markdown)" }),
        referencesContent: t.Optional(t.Any({ description: "References content (JSON)" })),
        scriptsContent: t.Optional(t.Any({ description: "Scripts content (JSON)" })),
      }),
      detail: {
        summary: "Create skill",
        description: "Creates a new skill.",
      },
    }
  )
  .get("/skills/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["api_key"], ["skills:read"])

    const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
    if (!rateLimit.allowed) {
      throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
    }

    const { getSkillById } = await import("@/lib/services/skills")
    const skill = await getSkillById(params.id, principal.tenantId)

    if (!skill) {
      return new Response(JSON.stringify({ error: "Skill not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    return {
      id: skill.id,
      name: skill.name,
      slug: skill.slug,
      description: skill.description,
      content: skill.content,
      referencesContent: skill.references_content,
      scriptsContent: skill.scripts_content,
      version: skill.version,
      isBuiltin: skill.is_builtin,
      createdAt: skill.created_at,
      updatedAt: skill.updated_at,
    }
  }, {
    detail: {
      summary: "Get skill",
      description: "Returns details of a specific skill.",
    },
  })
  .patch(
    "/skills/:id",
    async ({ principal, params, body }) => {
      requirePrincipal(principal, ["api_key"], ["skills:write"])

      const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
      if (!rateLimit.allowed) {
        throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
      }

      const { updateSkill } = await import("@/lib/services/skills")
      const skill = await updateSkill(params.id, principal.tenantId, {
        name: body.name,
        slug: body.slug,
        description: body.description,
        content: body.content,
        referencesContent: body.referencesContent as Json | undefined,
        scriptsContent: body.scriptsContent as Json | undefined,
      })

      if (!skill) {
        return new Response(JSON.stringify({ error: "Skill not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }

      await logAudit({
        principal,
        action: "skill.updated",
        resourceType: "skill",
        resourceId: params.id,
      })

      return {
        id: skill.id,
        version: skill.version,
        updatedAt: skill.updated_at,
      }
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        slug: t.Optional(t.String({ minLength: 1 })),
        description: t.Optional(t.String()),
        content: t.Optional(t.String({ minLength: 1 })),
        referencesContent: t.Optional(t.Any()),
        scriptsContent: t.Optional(t.Any()),
      }),
      detail: {
        summary: "Update skill",
        description: "Updates an existing skill.",
      },
    }
  )
  .delete("/skills/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["api_key"], ["skills:write"])

    const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
    if (!rateLimit.allowed) {
      throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
    }

    const { deleteSkill } = await import("@/lib/services/skills")
    const success = await deleteSkill(params.id, principal.tenantId)

    if (!success) {
      return new Response(JSON.stringify({ error: "Skill not found or is builtin" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    await logAudit({
      principal,
      action: "skill.deleted",
      resourceType: "skill",
      resourceId: params.id,
    })

    return { success: true }
  }, {
    detail: {
      summary: "Delete skill",
      description: "Deletes a skill. Cannot delete builtin skills.",
    },
  })
  // ============================================================================
  // Schedules
  // ============================================================================
  .get("/schedules", async ({ principal, query }) => {
    requirePrincipal(principal, ["api_key"], ["schedules:read"])

    const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
    if (!rateLimit.allowed) {
      throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
    }

    const { listSchedules } = await import("@/lib/services/schedules")
    const schedules = await listSchedules(principal.tenantId, {
      limit: query.limit ? parseInt(query.limit) : undefined,
      activeOnly: query.activeOnly === "true",
    })

    return {
      schedules: schedules.map((s) => ({
        id: s.id,
        name: s.name,
        frequency: s.frequency,
        cronExpression: s.cron_expression,
        timezone: s.timezone,
        agentId: s.agent_id,
        jobType: s.job_type,
        isActive: s.is_active,
        nextRunAt: s.next_run_at,
        lastRunAt: s.last_run_at,
        runCount: s.run_count,
        createdAt: s.created_at,
      })),
    }
  }, {
    detail: {
      summary: "List schedules",
      description: "Returns all schedules for the authenticated tenant.",
    },
  })
  .post(
    "/schedules",
    async ({ principal, body }) => {
      requirePrincipal(principal, ["api_key"], ["schedules:write"])

      const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
      if (!rateLimit.allowed) {
        throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
      }

      const { createSchedule } = await import("@/lib/services/schedules")
      const schedule = await createSchedule({
        tenantId: principal.tenantId,
        name: body.name,
        frequency: body.frequency,
        cronExpression: body.cronExpression,
        timezone: body.timezone,
        agentId: body.agentId,
        jobType: body.jobType,
        input: body.input as Json | undefined,
      })

      if (!schedule) {
        throw new Error("Failed to create schedule")
      }

      await logAudit({
        principal,
        action: "schedule.created",
        resourceType: "schedule",
        resourceId: schedule.id,
        metadata: { name: body.name },
      })

      return {
        id: schedule.id,
        name: schedule.name,
        nextRunAt: schedule.next_run_at,
        createdAt: schedule.created_at,
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, description: "Schedule name" }),
        frequency: t.Union([
          t.Literal("once"),
          t.Literal("hourly"),
          t.Literal("daily"),
          t.Literal("weekly"),
          t.Literal("monthly"),
          t.Literal("cron"),
        ], { description: "Schedule frequency" }),
        cronExpression: t.Optional(t.String({ description: "Cron expression (if frequency is cron)" })),
        timezone: t.Optional(t.String({ description: "Timezone (default: UTC)" })),
        agentId: t.Optional(t.String({ description: "Agent to trigger" })),
        jobType: t.Optional(t.String({ description: "Job type to create" })),
        input: t.Optional(t.Any({ description: "Input payload for the job/agent" })),
      }),
      detail: {
        summary: "Create schedule",
        description: "Creates a new schedule. Must specify either agentId or jobType.",
      },
    }
  )
  .get("/schedules/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["api_key"], ["schedules:read"])

    const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
    if (!rateLimit.allowed) {
      throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
    }

    const { getScheduleById } = await import("@/lib/services/schedules")
    const schedule = await getScheduleById(params.id, principal.tenantId)

    if (!schedule) {
      return new Response(JSON.stringify({ error: "Schedule not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    return {
      id: schedule.id,
      name: schedule.name,
      frequency: schedule.frequency,
      cronExpression: schedule.cron_expression,
      timezone: schedule.timezone,
      agentId: schedule.agent_id,
      jobType: schedule.job_type,
      input: schedule.input,
      isActive: schedule.is_active,
      nextRunAt: schedule.next_run_at,
      lastRunAt: schedule.last_run_at,
      runCount: schedule.run_count,
      createdAt: schedule.created_at,
      updatedAt: schedule.updated_at,
    }
  }, {
    detail: {
      summary: "Get schedule",
      description: "Returns details of a specific schedule.",
    },
  })
  .patch(
    "/schedules/:id",
    async ({ principal, params, body }) => {
      requirePrincipal(principal, ["api_key"], ["schedules:write"])

      const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
      if (!rateLimit.allowed) {
        throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
      }

      const { updateSchedule } = await import("@/lib/services/schedules")
      const schedule = await updateSchedule(params.id, principal.tenantId, {
        name: body.name,
        frequency: body.frequency,
        cronExpression: body.cronExpression,
        timezone: body.timezone,
        input: body.input as Json | undefined,
        isActive: body.isActive,
      })

      if (!schedule) {
        return new Response(JSON.stringify({ error: "Schedule not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }

      await logAudit({
        principal,
        action: "schedule.updated",
        resourceType: "schedule",
        resourceId: params.id,
      })

      return {
        id: schedule.id,
        nextRunAt: schedule.next_run_at,
        updatedAt: schedule.updated_at,
      }
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        frequency: t.Optional(
          t.Union([
            t.Literal("once"),
            t.Literal("hourly"),
            t.Literal("daily"),
            t.Literal("weekly"),
            t.Literal("monthly"),
            t.Literal("cron"),
          ])
        ),
        cronExpression: t.Optional(t.String()),
        timezone: t.Optional(t.String()),
        input: t.Optional(t.Any()),
        isActive: t.Optional(t.Boolean()),
      }),
      detail: {
        summary: "Update schedule",
        description: "Updates an existing schedule.",
      },
    }
  )
  .delete("/schedules/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["api_key"], ["schedules:write"])

    const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
    if (!rateLimit.allowed) {
      throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
    }

    const { deleteSchedule } = await import("@/lib/services/schedules")
    const success = await deleteSchedule(params.id, principal.tenantId)

    if (!success) {
      return new Response(JSON.stringify({ error: "Schedule not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    await logAudit({
      principal,
      action: "schedule.deleted",
      resourceType: "schedule",
      resourceId: params.id,
    })

    return { success: true }
  }, {
    detail: {
      summary: "Delete schedule",
      description: "Deletes a schedule.",
    },
  })
