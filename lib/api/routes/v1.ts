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

export const v1Routes = new Elysia({ prefix: "/v1" })
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
    if (principal.kind !== "api_key") throw new AuthError("Unauthorized")

    const rateLimit = checkRateLimit(`api_key:${principal.keyId}:default`)
    if (!rateLimit.allowed) {
      throw new RateLimitError(rateLimit.resetAt, rateLimit.remaining)
    }

    return {
      tenantId: principal.tenantId,
      keyId: principal.keyId,
      scopes: principal.scopes,
    }
  })
  .post(
    "/jobs",
    async ({ principal, body, request }) => {
      requirePrincipal(principal, ["api_key"], ["jobs:create"])
      if (principal.kind !== "api_key") throw new AuthError("Unauthorized")

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
        type: t.String({ minLength: 1 }),
        input: t.Optional(t.Any()),
        idempotencyKey: t.Optional(t.String()),
      }),
    }
  )
  .get("/jobs/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["api_key"], ["jobs:read"])
    if (principal.kind !== "api_key") throw new AuthError("Unauthorized")

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
  })
  .get("/jobs/:id/result", async ({ principal, params }) => {
    requirePrincipal(principal, ["api_key"], ["jobs:read"])
    if (principal.kind !== "api_key") throw new AuthError("Unauthorized")

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
  })
  .post("/jobs/:id/cancel", async ({ principal, params }) => {
    requirePrincipal(principal, ["api_key"], ["jobs:cancel"])
    if (principal.kind !== "api_key") throw new AuthError("Unauthorized")

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
  })
