import { Elysia, t } from "elysia"
import { resolvePrincipal, requirePrincipal, AuthError } from "@/lib/auth/principal"
import { createJob, getJobById, cancelJob, startJobWorkflow } from "@/lib/services/jobs"
import { logAudit } from "@/lib/services/audit"
import { checkRateLimit, getRateLimitHeaders, defaultRateLimits } from "@/lib/services/rate-limit"
import type { Json } from "@/lib/db/types"

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
