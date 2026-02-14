import { Elysia, t } from "elysia"
import { resolvePrincipal, requirePrincipal, AuthError } from "@/lib/auth/principal"
import { createApiKey, listApiKeys, revokeApiKey, getApiKeyById } from "@/lib/services/api-keys"
import { listJobs, getJobById } from "@/lib/services/jobs"
import { logAudit } from "@/lib/services/audit"
import { checkRateLimit, getRateLimitHeaders, RateLimitError } from "@/lib/services/rate-limit"
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

    if (principal.kind === "api_key") {
      const result = checkRateLimit(`api_key:${principal.keyId}:dashboard`)
      if (!result.allowed) {
        throw new RateLimitError(result.resetAt, result.remaining)
      }
    }

    return { principal }
  })
  .get("/me", async ({ principal }) => {
    requirePrincipal(principal, ["user", "api_key"])

    if (principal.kind === "api_key") {
      return {
        tenantId: principal.tenantId,
        keyId: principal.keyId,
        scopes: principal.scopes,
      }
    }

    return {
      tenantId: principal.tenantId,
      userId: principal.userId,
      orgId: principal.orgId,
      orgRole: principal.orgRole,
      scopes: principal.scopes,
    }
  })
  .get(
    "/organizations/search",
    async ({ principal, query }) => {
      requirePrincipal(principal, ["user"])

      const { searchTenants } = await import("@/lib/services/tenants")
      const results = await searchTenants(query.q, {
        excludeIds: query.exclude?.split(",").filter(Boolean),
        limit: 10,
      })

      return {
        organizations: results.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          logoUrl: t.logo_url,
          websiteUrl: t.website_url,
        })),
      }
    },
    {
      query: t.Object({
        q: t.String({ minLength: 2 }),
        exclude: t.Optional(t.String()),
      }),
    }
  )
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
    requirePrincipal(principal, ["user", "api_key"])

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
    requirePrincipal(principal, ["user", "api_key"])

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
    requirePrincipal(principal, ["user", "api_key"], ["webhooks:read"])

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
      requirePrincipal(principal, ["user", "api_key"], ["webhooks:write"])

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
    requirePrincipal(principal, ["user", "api_key"], ["webhooks:write"])

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
    requirePrincipal(principal, ["user", "api_key"], ["schedules:read"])

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
      requirePrincipal(principal, ["user", "api_key"], ["schedules:write"])

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
    requirePrincipal(principal, ["user", "api_key"], ["schedules:read"])

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
      requirePrincipal(principal, ["user", "api_key"], ["schedules:write"])

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
    requirePrincipal(principal, ["user", "api_key"], ["schedules:write"])

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
  .get("/hackathons", async ({ principal, query }) => {
    requirePrincipal(principal, ["user", "api_key"], ["hackathons:read"])

    const q = (query as Record<string, string | undefined>).q
    const { listOrganizedHackathons } = await import("@/lib/services/hackathons")
    const hackathons = await listOrganizedHackathons(principal.tenantId, q ? { search: q } : undefined)

    const { sortByStatusPriority } = await import("@/lib/utils/sort-hackathons")
    const sorted = sortByStatusPriority(hackathons)

    return {
      hackathons: sorted.map((h) => ({
        id: h.id,
        name: h.name,
        slug: h.slug,
        description: h.description,
        status: h.status,
        startsAt: h.starts_at,
        endsAt: h.ends_at,
        registrationOpensAt: h.registration_opens_at,
        registrationClosesAt: h.registration_closes_at,
        createdAt: h.created_at,
      })),
    }
  })
  .get("/hackathons/participating", async ({ principal, query }) => {
    requirePrincipal(principal, ["user"])

    const q = (query as Record<string, string | undefined>).q
    const { listParticipatingHackathons } = await import("@/lib/services/hackathons")
    const hackathons = await listParticipatingHackathons(principal.userId!, q ? { search: q } : undefined)

    const { sortByStatusPriority } = await import("@/lib/utils/sort-hackathons")
    const sorted = sortByStatusPriority(hackathons)

    return {
      hackathons: sorted.map((h) => ({
        id: h.id,
        name: h.name,
        slug: h.slug,
        description: h.description,
        status: h.status,
        startsAt: h.starts_at,
        endsAt: h.ends_at,
        registrationOpensAt: h.registration_opens_at,
        registrationClosesAt: h.registration_closes_at,
        role: h.role,
      })),
    }
  })
  .get("/hackathons/sponsored", async ({ principal, query }) => {
    requirePrincipal(principal, ["user"])

    const q = (query as Record<string, string | undefined>).q
    const { listSponsoredHackathons } = await import("@/lib/services/hackathons")
    const hackathons = await listSponsoredHackathons(principal.tenantId, q ? { search: q } : undefined)

    const { sortByStatusPriority } = await import("@/lib/utils/sort-hackathons")
    const sorted = sortByStatusPriority(hackathons)

    return {
      hackathons: sorted.map((h) => ({
        id: h.id,
        name: h.name,
        slug: h.slug,
        description: h.description,
        status: h.status,
        startsAt: h.starts_at,
        endsAt: h.ends_at,
        registrationOpensAt: h.registration_opens_at,
        registrationClosesAt: h.registration_closes_at,
      })),
    }
  })
  .post(
    "/hackathons",
    async ({ principal, body }) => {
      requirePrincipal(principal, ["user", "api_key"], ["hackathons:write"])

      const { createHackathon } = await import("@/lib/services/hackathons")
      const hackathon = await createHackathon(principal.tenantId, {
        name: body.name,
        description: body.description,
      })

      if (!hackathon) {
        return new Response(JSON.stringify({ error: "Failed to create hackathon" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      }

      await logAudit({
        principal,
        action: "hackathon.created",
        resourceType: "hackathon",
        resourceId: hackathon.id,
        metadata: { name: hackathon.name },
      })

      return {
        id: hackathon.id,
        name: hackathon.name,
        slug: hackathon.slug,
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        description: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  )
  .get("/hackathons/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["user", "api_key"], ["hackathons:read"])

    const { checkHackathonOrganizer } = await import("@/lib/services/public-hackathons")
    const result = await checkHackathonOrganizer(params.id, principal.tenantId)

    if (result.status === "not_found") {
      return new Response(JSON.stringify({ error: "Hackathon not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }
    if (result.status === "not_authorized") {
      return new Response(JSON.stringify({ error: "Not authorized to manage this hackathon. You may need to switch to the correct organization." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }
    const hackathon = result.hackathon

    return {
      id: hackathon.id,
      name: hackathon.name,
      slug: hackathon.slug,
      description: hackathon.description,
      rules: hackathon.rules,
      bannerUrl: hackathon.banner_url,
      status: hackathon.status,
      startsAt: hackathon.starts_at,
      endsAt: hackathon.ends_at,
      registrationOpensAt: hackathon.registration_opens_at,
      registrationClosesAt: hackathon.registration_closes_at,
      maxParticipants: hackathon.max_participants,
      minTeamSize: hackathon.min_team_size,
      maxTeamSize: hackathon.max_team_size,
      allowSolo: hackathon.allow_solo,
      createdAt: hackathon.created_at,
      updatedAt: hackathon.updated_at,
    }
  })
  .patch(
    "/hackathons/:id/settings",
    async ({ principal, params, body }) => {
      requirePrincipal(principal, ["user", "api_key"], ["hackathons:write"])

      const { updateHackathonSettings } = await import("@/lib/services/public-hackathons")
      const hackathon = await updateHackathonSettings(params.id, principal.tenantId, {
        bannerUrl: body.bannerUrl,
        name: body.name,
        description: body.description,
        rules: body.rules,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        registrationOpensAt: body.registrationOpensAt,
        registrationClosesAt: body.registrationClosesAt,
        status: body.status as "draft" | "published" | "registration_open" | "active" | "judging" | "completed" | "archived" | undefined,
      })

      if (!hackathon) {
        return new Response(JSON.stringify({ error: "Hackathon not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }

      await logAudit({
        principal,
        action: "hackathon.updated",
        resourceType: "hackathon",
        resourceId: params.id,
      })

      return {
        id: hackathon.id,
        updatedAt: hackathon.updated_at,
      }
    },
    {
      body: t.Object({
        bannerUrl: t.Optional(t.Union([t.String(), t.Null()])),
        name: t.Optional(t.String()),
        description: t.Optional(t.Union([t.String(), t.Null()])),
        rules: t.Optional(t.Union([t.String(), t.Null()])),
        startsAt: t.Optional(t.Union([t.String(), t.Null()])),
        endsAt: t.Optional(t.Union([t.String(), t.Null()])),
        registrationOpensAt: t.Optional(t.Union([t.String(), t.Null()])),
        registrationClosesAt: t.Optional(t.Union([t.String(), t.Null()])),
        status: t.Optional(t.Union([
          t.Literal("draft"),
          t.Literal("published"),
          t.Literal("registration_open"),
          t.Literal("active"),
          t.Literal("judging"),
          t.Literal("completed"),
          t.Literal("archived"),
        ])),
      }),
    }
  )
  .post(
    "/hackathons/:id/banner",
    async ({ principal, params, request }) => {
      requirePrincipal(principal, ["user", "api_key"], ["hackathons:write"])

      const { checkHackathonOrganizer } = await import("@/lib/services/public-hackathons")
      const result = await checkHackathonOrganizer(params.id, principal.tenantId)

      if (result.status === "not_found") {
        return new Response(JSON.stringify({ error: "Hackathon not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }
      if (result.status === "not_authorized") {
        return new Response(JSON.stringify({ error: "Not authorized to manage this hackathon. You may need to switch to the correct organization." }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        })
      }

      const formData = await request.formData()
      const file = formData.get("file") as File | null

      if (!file) {
        return new Response(JSON.stringify({ error: "No file provided" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      }

      const allowedTypes = ["image/png", "image/jpeg", "image/webp"]
      if (!allowedTypes.includes(file.type)) {
        return new Response(JSON.stringify({ error: "Invalid file type. Use PNG, JPEG, or WebP" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      }

      if (file.size > 50 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: "File too large (max 50MB)" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      }

      const { uploadBanner } = await import("@/lib/services/storage")
      const buffer = Buffer.from(await file.arrayBuffer())
      const uploadResult = await uploadBanner(params.id, buffer)

      if (!uploadResult) {
        return new Response(JSON.stringify({ error: "Failed to upload banner" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      }

      const { updateHackathonSettings } = await import("@/lib/services/public-hackathons")
      await updateHackathonSettings(params.id, principal.tenantId, {
        bannerUrl: uploadResult.url,
      })

      await logAudit({
        principal,
        action: "hackathon.banner_uploaded",
        resourceType: "hackathon",
        resourceId: params.id,
      })

      return { url: uploadResult.url }
    }
  )
  .delete("/hackathons/:id/banner", async ({ principal, params }) => {
    requirePrincipal(principal, ["user", "api_key"], ["hackathons:write"])

    const { checkHackathonOrganizer } = await import("@/lib/services/public-hackathons")
    const result = await checkHackathonOrganizer(params.id, principal.tenantId)

    if (result.status === "not_found") {
      return new Response(JSON.stringify({ error: "Hackathon not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }
    if (result.status === "not_authorized") {
      return new Response(JSON.stringify({ error: "Not authorized to manage this hackathon. You may need to switch to the correct organization." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { deleteBanner } = await import("@/lib/services/storage")
    await deleteBanner(params.id)

    const { updateHackathonSettings } = await import("@/lib/services/public-hackathons")
    await updateHackathonSettings(params.id, principal.tenantId, {
      bannerUrl: null,
    })

    await logAudit({
      principal,
      action: "hackathon.banner_deleted",
      resourceType: "hackathon",
      resourceId: params.id,
    })

    return { success: true }
  })
  .get("/hackathons/:id/sponsors", async ({ principal, params }) => {
    requirePrincipal(principal, ["user", "api_key"], ["hackathons:read"])

    const { checkHackathonOrganizer } = await import("@/lib/services/public-hackathons")
    const result = await checkHackathonOrganizer(params.id, principal.tenantId)

    if (result.status === "not_found") {
      return new Response(JSON.stringify({ error: "Hackathon not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }
    if (result.status === "not_authorized") {
      return new Response(JSON.stringify({ error: "Not authorized to manage this hackathon. You may need to switch to the correct organization." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { listHackathonSponsorsWithTenants } = await import("@/lib/services/sponsors")
    const sponsors = await listHackathonSponsorsWithTenants(params.id)

    return {
      sponsors: sponsors.map((s) => ({
        id: s.id,
        name: s.name,
        logoUrl: s.logo_url,
        websiteUrl: s.website_url,
        tier: s.tier,
        displayOrder: s.display_order,
        sponsorTenantId: s.sponsor_tenant_id,
        tenant: s.tenant
          ? {
              slug: s.tenant.slug,
              name: s.tenant.name,
              logoUrl: s.tenant.logo_url,
            }
          : null,
        createdAt: s.created_at,
      })),
    }
  })
  .post(
    "/hackathons/:id/sponsors",
    async ({ principal, params, body }) => {
      requirePrincipal(principal, ["user", "api_key"], ["hackathons:write"])

      const { checkHackathonOrganizer } = await import("@/lib/services/public-hackathons")
      const result = await checkHackathonOrganizer(params.id, principal.tenantId)

      if (result.status === "not_found") {
        return new Response(JSON.stringify({ error: "Hackathon not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }
      if (result.status === "not_authorized") {
        return new Response(JSON.stringify({ error: "Not authorized to manage this hackathon. You may need to switch to the correct organization." }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        })
      }

      const { addSponsor } = await import("@/lib/services/sponsors")
      const sponsor = await addSponsor({
        hackathonId: params.id,
        name: body.name,
        logoUrl: body.logoUrl,
        websiteUrl: body.websiteUrl,
        tier: body.tier as "title" | "gold" | "silver" | "bronze" | "partner" | undefined,
        sponsorTenantId: body.sponsorTenantId,
        displayOrder: body.displayOrder,
      })

      if (!sponsor) {
        return new Response(JSON.stringify({ error: "Failed to add sponsor" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      }

      await logAudit({
        principal,
        action: "sponsor.added",
        resourceType: "hackathon_sponsor",
        resourceId: sponsor.id,
        metadata: { hackathonId: params.id, name: body.name },
      })

      return {
        id: sponsor.id,
        name: sponsor.name,
        tier: sponsor.tier,
        createdAt: sponsor.created_at,
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        logoUrl: t.Optional(t.Union([t.String(), t.Null()])),
        websiteUrl: t.Optional(t.Union([t.String(), t.Null()])),
        tier: t.Optional(t.String()),
        sponsorTenantId: t.Optional(t.Union([t.String(), t.Null()])),
        displayOrder: t.Optional(t.Number()),
      }),
    }
  )
  .patch(
    "/hackathons/:id/sponsors/:sponsorId",
    async ({ principal, params, body }) => {
      requirePrincipal(principal, ["user", "api_key"], ["hackathons:write"])

      const { checkHackathonOrganizer } = await import("@/lib/services/public-hackathons")
      const result = await checkHackathonOrganizer(params.id, principal.tenantId)

      if (result.status === "not_found") {
        return new Response(JSON.stringify({ error: "Hackathon not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }
      if (result.status === "not_authorized") {
        return new Response(JSON.stringify({ error: "Not authorized to manage this hackathon. You may need to switch to the correct organization." }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        })
      }

      const { updateSponsor } = await import("@/lib/services/sponsors")
      const sponsor = await updateSponsor(params.sponsorId, {
        name: body.name,
        logoUrl: body.logoUrl,
        websiteUrl: body.websiteUrl,
        tier: body.tier as "title" | "gold" | "silver" | "bronze" | "partner" | undefined,
        sponsorTenantId: body.sponsorTenantId,
        displayOrder: body.displayOrder,
      }, params.id)

      if (!sponsor) {
        return new Response(JSON.stringify({ error: "Sponsor not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }

      await logAudit({
        principal,
        action: "sponsor.updated",
        resourceType: "hackathon_sponsor",
        resourceId: params.sponsorId,
      })

      return {
        id: sponsor.id,
        updatedAt: sponsor.created_at,
      }
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        logoUrl: t.Optional(t.Union([t.String(), t.Null()])),
        websiteUrl: t.Optional(t.Union([t.String(), t.Null()])),
        tier: t.Optional(t.String()),
        sponsorTenantId: t.Optional(t.Union([t.String(), t.Null()])),
        displayOrder: t.Optional(t.Number()),
      }),
    }
  )
  .delete("/hackathons/:id/sponsors/:sponsorId", async ({ principal, params }) => {
    requirePrincipal(principal, ["user", "api_key"], ["hackathons:write"])

    const { checkHackathonOrganizer } = await import("@/lib/services/public-hackathons")
    const result = await checkHackathonOrganizer(params.id, principal.tenantId)

    if (result.status === "not_found") {
      return new Response(JSON.stringify({ error: "Hackathon not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }
    if (result.status === "not_authorized") {
      return new Response(JSON.stringify({ error: "Not authorized to manage this hackathon. You may need to switch to the correct organization." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { removeSponsor } = await import("@/lib/services/sponsors")
    const success = await removeSponsor(params.sponsorId, params.id)

    if (!success) {
      return new Response(JSON.stringify({ error: "Sponsor not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    await logAudit({
      principal,
      action: "sponsor.removed",
      resourceType: "hackathon_sponsor",
      resourceId: params.sponsorId,
    })

    return { success: true }
  })
  .patch(
    "/hackathons/:id/sponsors/reorder",
    async ({ principal, params, body }) => {
      requirePrincipal(principal, ["user", "api_key"], ["hackathons:write"])

      const { checkHackathonOrganizer } = await import("@/lib/services/public-hackathons")
      const result = await checkHackathonOrganizer(params.id, principal.tenantId)

      if (result.status === "not_found") {
        return new Response(JSON.stringify({ error: "Hackathon not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }
      if (result.status === "not_authorized") {
        return new Response(JSON.stringify({ error: "Not authorized to manage this hackathon. You may need to switch to the correct organization." }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        })
      }

      const { reorderSponsors } = await import("@/lib/services/sponsors")
      const success = await reorderSponsors(params.id, body.sponsorIds)

      if (!success) {
        return new Response(JSON.stringify({ error: "Failed to reorder sponsors" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      }

      return { success: true }
    },
    {
      body: t.Object({
        sponsorIds: t.Array(t.String()),
      }),
    }
  )
  .get("/org-profile", async ({ principal }) => {
    requirePrincipal(principal, ["user", "api_key"], ["org:read"])

    const { getPublicTenantById } = await import("@/lib/services/tenant-profiles")
    const tenant = await getPublicTenantById(principal.tenantId)

    if (!tenant) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logo_url,
      description: tenant.description,
      websiteUrl: tenant.website_url,
    }
  })
  .patch(
    "/org-profile",
    async ({ principal, body }) => {
      requirePrincipal(principal, ["user", "api_key"], ["org:write"])

      const { updateTenantProfile, isSlugAvailable } = await import("@/lib/services/tenant-profiles")

      if (body.slug) {
        const available = await isSlugAvailable(body.slug, principal.tenantId)
        if (!available) {
          return new Response(JSON.stringify({ error: "Slug already taken" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          })
        }
      }

      const tenant = await updateTenantProfile(principal.tenantId, {
        slug: body.slug,
        logoUrl: body.logoUrl,
        logoUrlDark: body.logoUrlDark,
        description: body.description,
        websiteUrl: body.websiteUrl,
        name: body.name,
      })

      if (!tenant) {
        return new Response(JSON.stringify({ error: "Failed to update profile" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      }

      await logAudit({
        principal,
        action: "org_profile.updated",
        resourceType: "tenant",
        resourceId: principal.tenantId,
      })

      return {
        id: tenant.id,
        slug: tenant.slug,
        updatedAt: tenant.updated_at,
      }
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        slug: t.Optional(t.Union([t.String(), t.Null()])),
        logoUrl: t.Optional(t.Union([t.String(), t.Null()])),
        logoUrlDark: t.Optional(t.Union([t.String(), t.Null()])),
        description: t.Optional(t.Union([t.String(), t.Null()])),
        websiteUrl: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  )
  .post(
    "/upload-logo",
    async ({ principal, request }) => {
      requirePrincipal(principal, ["user", "api_key"], ["org:write"])

      const formData = await request.formData()
      const file = formData.get("file") as File | null
      const variant = formData.get("variant") as "light" | "dark" | null

      if (!file) {
        return new Response(JSON.stringify({ error: "No file provided" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      }

      if (!variant || (variant !== "light" && variant !== "dark")) {
        return new Response(JSON.stringify({ error: "Invalid variant" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      }

      const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]
      if (!allowedTypes.includes(file.type)) {
        return new Response(JSON.stringify({ error: "Invalid file type" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      }

      if (file.size > 2 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: "File too large (max 2MB)" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      }

      const { uploadLogo } = await import("@/lib/services/storage")
      const buffer = Buffer.from(await file.arrayBuffer())
      const result = await uploadLogo(principal.tenantId, buffer, file.type, variant)

      if (!result) {
        return new Response(JSON.stringify({ error: "Failed to upload logo" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      }

      const { updateTenantProfile } = await import("@/lib/services/tenant-profiles")
      const updates = variant === "light"
        ? { logoUrl: result.url }
        : { logoUrlDark: result.url }

      await updateTenantProfile(principal.tenantId, updates)

      await logAudit({
        principal,
        action: "logo.uploaded",
        resourceType: "tenant",
        resourceId: principal.tenantId,
        metadata: { variant },
      })

      return { url: result.url, variant }
    }
  )
  .delete(
    "/logo/:variant",
    async ({ principal, params }) => {
      requirePrincipal(principal, ["user", "api_key"], ["org:write"])

      const variant = params.variant as "light" | "dark"
      if (variant !== "light" && variant !== "dark") {
        return new Response(JSON.stringify({ error: "Invalid variant" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      }

      const { deleteLogo } = await import("@/lib/services/storage")
      await deleteLogo(principal.tenantId, variant)

      const { updateTenantProfile } = await import("@/lib/services/tenant-profiles")
      const updates = variant === "light"
        ? { logoUrl: null }
        : { logoUrlDark: null }

      await updateTenantProfile(principal.tenantId, updates)

      await logAudit({
        principal,
        action: "logo.deleted",
        resourceType: "tenant",
        resourceId: principal.tenantId,
        metadata: { variant },
      })

      return { success: true }
    }
  )
  .post(
    "/teams/:teamId/invitations",
    async ({ principal, params, body }) => {
      requirePrincipal(principal, ["user"])

      const rateLimitResult = checkRateLimit(`team_invitation:${params.teamId}`, {
        maxRequests: 10,
        windowMs: 60_000,
      })
      if (!rateLimitResult.allowed) {
        throw new RateLimitError(rateLimitResult.resetAt, rateLimitResult.remaining)
      }

      const { createTeamInvitation, getTeamWithHackathon } = await import(
        "@/lib/services/team-invitations"
      )
      const { sendTeamInvitationEmail } = await import("@/lib/email/team-invitations")

      const result = await createTeamInvitation({
        teamId: params.teamId,
        hackathonId: body.hackathonId,
        email: body.email,
        invitedByClerkUserId: principal.userId!,
      })

      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error, code: result.code }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      }

      const teamInfo = await getTeamWithHackathon(params.teamId)

      if (teamInfo) {
        await sendTeamInvitationEmail({
          to: body.email,
          teamName: teamInfo.name,
          hackathonName: teamInfo.hackathon.name,
          inviterName: body.inviterName || "A team captain",
          inviteToken: result.invitation.token,
          expiresAt: result.invitation.expires_at,
        })
      }

      await logAudit({
        principal,
        action: "team_invitation.sent",
        resourceType: "team_invitation",
        resourceId: result.invitation.id,
        metadata: { teamId: params.teamId, email: body.email },
      })

      return {
        id: result.invitation.id,
        email: result.invitation.email,
        expiresAt: result.invitation.expires_at,
      }
    },
    {
      body: t.Object({
        hackathonId: t.String(),
        email: t.String({ format: "email" }),
        inviterName: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/teams/:teamId/invitations",
    async ({ principal, params, query }) => {
      requirePrincipal(principal, ["user"])

      const { listTeamInvitations } = await import("@/lib/services/team-invitations")
      const invitations = await listTeamInvitations(
        params.teamId,
        query.status ? { status: query.status } : undefined
      )

      return {
        invitations: invitations.map((i) => ({
          id: i.id,
          email: i.email,
          status: i.status,
          expiresAt: i.expires_at,
          createdAt: i.created_at,
        })),
      }
    },
    {
      query: t.Object({
        status: t.Optional(
          t.Union([
            t.Literal("pending"),
            t.Literal("accepted"),
            t.Literal("declined"),
            t.Literal("expired"),
            t.Literal("cancelled"),
          ])
        ),
      }),
    }
  )
  .delete("/teams/:teamId/invitations/:invitationId", async ({ principal, params }) => {
    requirePrincipal(principal, ["user"])

    const { cancelTeamInvitation } = await import("@/lib/services/team-invitations")
    const result = await cancelTeamInvitation(params.invitationId, principal.userId!)

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    await logAudit({
      principal,
      action: "team_invitation.cancelled",
      resourceType: "team_invitation",
      resourceId: params.invitationId,
    })

    return { success: true }
  })
