import { Elysia, t } from "elysia"
import { resolvePrincipal, requirePrincipal, AuthError } from "@/lib/auth/principal"
import { createApiKey, listApiKeys, revokeApiKey, getApiKeyById } from "@/lib/services/api-keys"
import { listJobs, getJobById } from "@/lib/services/jobs"
import { logAudit } from "@/lib/services/audit"
import type { Scope } from "@/lib/auth/types"
import type { WebhookEvent } from "@/lib/db/hackathon-types"

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
    requirePrincipal(principal, ["user"])

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
    requirePrincipal(principal, ["user"])

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
  .get("/webhooks", async ({ principal }) => {
    requirePrincipal(principal, ["user"], ["webhooks:read"])

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
  })
  .post(
    "/webhooks",
    async ({ principal, body }) => {
      requirePrincipal(principal, ["user"], ["webhooks:write"])

      const { createWebhook } = await import("@/lib/services/webhooks")
      const result = await createWebhook({
        tenantId: principal.tenantId,
        url: body.url,
        events: body.events as WebhookEvent[],
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
      }
    },
    {
      body: t.Object({
        url: t.String({ format: "uri" }),
        events: t.Array(t.String()),
      }),
    }
  )
  .delete("/webhooks/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["user"], ["webhooks:write"])

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
  })
  .get("/schedules", async ({ principal, query }) => {
    requirePrincipal(principal, ["user"])

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
        jobType: s.job_type,
        isActive: s.is_active,
        nextRunAt: s.next_run_at,
        lastRunAt: s.last_run_at,
        runCount: s.run_count,
        createdAt: s.created_at,
      })),
    }
  })
  .post(
    "/schedules",
    async ({ principal, body }) => {
      requirePrincipal(principal, ["user"])

      const { createSchedule } = await import("@/lib/services/schedules")
      const schedule = await createSchedule({
        tenantId: principal.tenantId,
        name: body.name,
        frequency: body.frequency,
        cronExpression: body.cronExpression,
        timezone: body.timezone,
        jobType: body.jobType,
        input: body.input,
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
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        frequency: t.Union([
          t.Literal("once"),
          t.Literal("hourly"),
          t.Literal("daily"),
          t.Literal("weekly"),
          t.Literal("monthly"),
          t.Literal("cron"),
        ]),
        cronExpression: t.Optional(t.String()),
        timezone: t.Optional(t.String()),
        runTime: t.Optional(t.String()),
        jobType: t.Optional(t.String()),
        input: t.Optional(t.Record(t.String(), t.Unknown())),
      }),
    }
  )
  .get("/schedules/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["user"])

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
      jobType: schedule.job_type,
      input: schedule.input,
      isActive: schedule.is_active,
      nextRunAt: schedule.next_run_at,
      lastRunAt: schedule.last_run_at,
      runCount: schedule.run_count,
      createdAt: schedule.created_at,
      updatedAt: schedule.updated_at,
    }
  })
  .patch(
    "/schedules/:id",
    async ({ principal, params, body }) => {
      requirePrincipal(principal, ["user"])

      const { updateSchedule } = await import("@/lib/services/schedules")
      const schedule = await updateSchedule(params.id, principal.tenantId, {
        name: body.name,
        frequency: body.frequency,
        cronExpression: body.cronExpression,
        timezone: body.timezone,
        runTime: body.runTime,
        input: body.input,
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

      return { id: schedule.id, nextRunAt: schedule.next_run_at, updatedAt: schedule.updated_at }
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
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
        runTime: t.Optional(t.String()),
        input: t.Optional(t.Record(t.String(), t.Unknown())),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )
  .delete("/schedules/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["user"])

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
  })
  .get("/integrations", async ({ principal }) => {
    requirePrincipal(principal, ["user"])

    const { listIntegrations } = await import("@/lib/integrations/oauth")
    const integrations = await listIntegrations(principal.tenantId)

    return {
      integrations: integrations.map((i) => ({
        id: i.id,
        provider: i.provider,
        accountEmail: i.account_email,
        isActive: i.is_active,
        scopes: i.scopes,
        tokenExpiresAt: i.token_expires_at,
        createdAt: i.created_at,
      })),
    }
  })
  .get("/integrations/:provider/auth-url", async ({ principal, params }) => {
    requirePrincipal(principal, ["user"])

    const { buildAuthUrl } = await import("@/lib/integrations/oauth")
    const state = Buffer.from(
      JSON.stringify({ tenantId: principal.tenantId, userId: principal.userId })
    ).toString("base64url")

    const authUrl = buildAuthUrl(params.provider as "gmail" | "google_calendar" | "notion" | "luma", state)

    if (!authUrl) {
      return new Response(JSON.stringify({ error: "Provider not configured" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    return { authUrl }
  })
  .delete("/integrations/:provider", async ({ principal, params }) => {
    requirePrincipal(principal, ["user"])

    const { deleteIntegration } = await import("@/lib/integrations/oauth")
    const success = await deleteIntegration(
      principal.tenantId,
      params.provider as "gmail" | "google_calendar" | "notion" | "luma"
    )

    if (!success) {
      return new Response(JSON.stringify({ error: "Integration not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    await logAudit({
      principal,
      action: "integration.deleted",
      resourceType: "integration",
      resourceId: params.provider,
    })

    return { success: true }
  })
  .get("/credentials", async ({ principal }) => {
    requirePrincipal(principal, ["user"])

    const { listCredentials } = await import("@/lib/services/org-credentials")
    const credentials = await listCredentials(principal.tenantId)

    return {
      credentials: credentials.map((c) => ({
        id: c.id,
        provider: c.provider,
        label: c.label,
        accountIdentifier: c.account_identifier,
        isActive: c.is_active,
        lastUsedAt: c.last_used_at,
        createdAt: c.created_at,
      })),
    }
  })
  .post(
    "/credentials",
    async ({ principal, body }) => {
      requirePrincipal(principal, ["user"])

      const { saveCredential } = await import("@/lib/services/org-credentials")
      const credential = await saveCredential({
        tenantId: principal.tenantId,
        provider: body.provider as "luma",
        apiKey: body.apiKey,
        label: body.label,
        accountIdentifier: body.accountIdentifier,
      })

      if (!credential) {
        return new Response(JSON.stringify({ error: "Failed to save credential" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      }

      await logAudit({
        principal,
        action: "credential.saved",
        resourceType: "credential",
        resourceId: credential.id,
        metadata: { provider: body.provider },
      })

      return {
        id: credential.id,
        provider: credential.provider,
        label: credential.label,
        createdAt: credential.created_at,
      }
    },
    {
      body: t.Object({
        provider: t.String(),
        apiKey: t.String({ minLength: 1 }),
        label: t.Optional(t.String()),
        accountIdentifier: t.Optional(t.String()),
      }),
    }
  )
  .patch(
    "/credentials/:provider",
    async ({ principal, params, body }) => {
      requirePrincipal(principal, ["user"])

      const { updateCredential } = await import("@/lib/services/org-credentials")
      const credential = await updateCredential(
        principal.tenantId,
        params.provider as "luma",
        {
          apiKey: body.apiKey,
          label: body.label,
          accountIdentifier: body.accountIdentifier,
          isActive: body.isActive,
        }
      )

      if (!credential) {
        return new Response(JSON.stringify({ error: "Credential not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }

      await logAudit({
        principal,
        action: "credential.updated",
        resourceType: "credential",
        resourceId: credential.id,
        metadata: { provider: params.provider },
      })

      return {
        id: credential.id,
        provider: credential.provider,
        updatedAt: credential.updated_at,
      }
    },
    {
      body: t.Object({
        apiKey: t.Optional(t.String({ minLength: 1 })),
        label: t.Optional(t.String()),
        accountIdentifier: t.Optional(t.String()),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )
  .delete("/credentials/:provider", async ({ principal, params }) => {
    requirePrincipal(principal, ["user"])

    const { deleteCredential } = await import("@/lib/services/org-credentials")
    const success = await deleteCredential(principal.tenantId, params.provider as "luma")

    if (!success) {
      return new Response(JSON.stringify({ error: "Credential not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    await logAudit({
      principal,
      action: "credential.deleted",
      resourceType: "credential",
      metadata: { provider: params.provider },
    })

    return { success: true }
  })
