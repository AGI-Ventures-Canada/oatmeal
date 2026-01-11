import { Elysia, t } from "elysia"
import { resolvePrincipal, requirePrincipal, AuthError } from "@/lib/auth/principal"
import { createApiKey, listApiKeys, revokeApiKey, getApiKeyById } from "@/lib/services/api-keys"
import { listJobs, getJobById } from "@/lib/services/jobs"
import { logAudit } from "@/lib/services/audit"
import type { Scope } from "@/lib/auth/types"

export const dashboardRoutes = new Elysia({ prefix: "/dashboard" })
  .onError(({ error }) => {
    if (error instanceof AuthError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.statusCode,
        headers: { "Content-Type": "application/json" },
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
  .get("/me", async ({ principal }) => {
    requirePrincipal(principal, ["user"])
    if (principal.kind !== "user") throw new AuthError("Unauthorized")

    return {
      tenantId: principal.tenantId,
      userId: principal.userId,
      orgId: principal.orgId,
      orgRole: principal.orgRole,
      scopes: principal.scopes,
    }
  })
  .get("/keys", async ({ principal }) => {
    requirePrincipal(principal, ["user"], ["keys:read"])
    if (principal.kind !== "user") throw new AuthError("Unauthorized")

    const keys = await listApiKeys(principal.tenantId)
    return {
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        scopes: k.scopes,
        createdAt: k.created_at,
        lastUsedAt: k.last_used_at,
        revokedAt: k.revoked_at,
      })),
    }
  })
  .post(
    "/keys",
    async ({ principal, body }) => {
      requirePrincipal(principal, ["user"], ["keys:write"])
      if (principal.kind !== "user") throw new AuthError("Unauthorized")

      const result = await createApiKey({
        tenantId: principal.tenantId,
        name: body.name,
        scopes: body.scopes as Scope[] | undefined,
      })

      if (!result) {
        throw new Error("Failed to create API key")
      }

      await logAudit({
        principal,
        action: "api_key.created",
        resourceType: "api_key",
        resourceId: result.apiKey.id,
        metadata: { name: body.name },
      })

      return {
        id: result.apiKey.id,
        name: result.apiKey.name,
        prefix: result.apiKey.prefix,
        scopes: result.apiKey.scopes,
        createdAt: result.apiKey.created_at,
        key: result.rawKey,
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        scopes: t.Optional(t.Array(t.String())),
      }),
    }
  )
  .post("/keys/:id/revoke", async ({ principal, params }) => {
    requirePrincipal(principal, ["user"], ["keys:write"])
    if (principal.kind !== "user") throw new AuthError("Unauthorized")

    const key = await getApiKeyById(params.id, principal.tenantId)
    if (!key) {
      return new Response(JSON.stringify({ error: "API key not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    const success = await revokeApiKey(params.id, principal.tenantId)
    if (!success) {
      throw new Error("Failed to revoke API key")
    }

    await logAudit({
      principal,
      action: "api_key.revoked",
      resourceType: "api_key",
      resourceId: params.id,
    })

    return { success: true }
  })
  .get("/jobs", async ({ principal, query }) => {
    requirePrincipal(principal, ["user"], ["jobs:read"])
    if (principal.kind !== "user") throw new AuthError("Unauthorized")

    const jobs = await listJobs(principal.tenantId, {
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    })

    return {
      jobs: jobs.map((j) => ({
        id: j.id,
        type: j.type,
        status: j.status_cache,
        createdAt: j.created_at,
        updatedAt: j.updated_at,
        completedAt: j.completed_at,
      })),
    }
  })
  .get("/jobs/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["user"], ["jobs:read"])
    if (principal.kind !== "user") throw new AuthError("Unauthorized")

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
      input: job.input,
      result: job.result,
      error: job.error,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      completedAt: job.completed_at,
    }
  })
