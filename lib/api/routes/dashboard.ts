import { Elysia, t } from "elysia"
import { resolvePrincipal, requirePrincipal, AuthError } from "@/lib/auth/principal"
import { createApiKey, listApiKeys, revokeApiKey, getApiKeyById } from "@/lib/services/api-keys"
import { listJobs, getJobById } from "@/lib/services/jobs"
import { logAudit } from "@/lib/services/audit"
import type { Scope } from "@/lib/auth/types"
import type { WebhookEvent, LumaEventType } from "@/lib/db/agent-types"

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
    requirePrincipal(principal, ["user"], ["jobs:read"])

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
  // ============================================================================
  // Agents
  // ============================================================================
  .get("/agents", async ({ principal, query }) => {
    requirePrincipal(principal, ["user"], ["agents:read"])

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
  })
  .post(
    "/agents",
    async ({ principal, body }) => {
      requirePrincipal(principal, ["user"], ["agents:manage"])

      const { createAgent } = await import("@/lib/services/agents")
      const agent = await createAgent({
        tenantId: principal.tenantId,
        name: body.name,
        description: body.description,
        instructions: body.instructions,
        type: body.type ?? "ai_sdk",
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
        createdAt: agent.created_at,
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        description: t.Optional(t.String()),
        instructions: t.Optional(t.String()),
        type: t.Optional(t.Union([t.Literal("ai_sdk"), t.Literal("claude_sdk")])),
        model: t.Optional(t.String()),
        skillIds: t.Optional(t.Array(t.String())),
        config: t.Optional(t.Object({})),
      }),
    }
  )
  .get("/agents/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["user"], ["agents:read"])

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
      skillIds: agent.skill_ids,
      config: agent.config,
      isActive: agent.is_active,
      createdAt: agent.created_at,
      updatedAt: agent.updated_at,
    }
  })
  .patch(
    "/agents/:id",
    async ({ principal, params, body }) => {
      requirePrincipal(principal, ["user"], ["agents:manage"])

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

      return { id: agent.id, updatedAt: agent.updated_at }
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        instructions: t.Optional(t.String()),
        model: t.Optional(t.String()),
        skillIds: t.Optional(t.Array(t.String())),
        config: t.Optional(t.Object({})),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )
  .delete("/agents/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["user"], ["agents:manage"])

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
  })
  .get("/agents/:id/runs", async ({ principal, params, query }) => {
    requirePrincipal(principal, ["user"], ["agents:read"])

    const { listAgentRuns } = await import("@/lib/services/agent-runs")
    const runs = await listAgentRuns(principal.tenantId, {
      agentId: params.id,
      limit: query.limit ? parseInt(query.limit) : undefined,
    })

    return {
      runs: runs.map((r) => ({
        id: r.id,
        status: r.status,
        triggerType: r.trigger_type,
        startedAt: r.started_at,
        completedAt: r.completed_at,
        error: r.error,
      })),
    }
  })
  .post(
    "/agents/:id/run",
    async ({ principal, params, body }) => {
      requirePrincipal(principal, ["user"], ["agents:run"])

      const { getAgentById } = await import("@/lib/services/agents")
      const { createAgentRun } = await import("@/lib/services/agent-runs")

      const agent = await getAgentById(params.id, principal.tenantId)
      if (!agent) {
        return new Response(JSON.stringify({ error: "Agent not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }

      const run = await createAgentRun({
        agentId: params.id,
        tenantId: principal.tenantId,
        triggerType: "manual",
        input: {
          trigger: "manual",
          prompt: body.prompt,
          context: body.context,
        },
      })

      if (!run) {
        throw new Error("Failed to create agent run")
      }

      await logAudit({
        principal,
        action: "agent_run.created",
        resourceType: "agent_run",
        resourceId: run.id,
        metadata: { agentId: params.id },
      })

      return { runId: run.id, status: run.status }
    },
    {
      body: t.Object({
        prompt: t.String({ minLength: 1 }),
        context: t.Optional(t.Object({})),
      }),
    }
  )
  // ============================================================================
  // Skills
  // ============================================================================
  .get("/skills", async ({ principal, query }) => {
    requirePrincipal(principal, ["user"], ["skills:read"])

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
  })
  .post(
    "/skills",
    async ({ principal, body }) => {
      requirePrincipal(principal, ["user"], ["skills:write"])

      const { createSkill } = await import("@/lib/services/skills")
      const skill = await createSkill({
        tenantId: principal.tenantId,
        name: body.name,
        slug: body.slug,
        description: body.description,
        content: body.content,
        referencesContent: body.referencesContent,
        scriptsContent: body.scriptsContent,
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

      return { id: skill.id, name: skill.name, slug: skill.slug }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        slug: t.String({ minLength: 1 }),
        description: t.Optional(t.String()),
        content: t.String({ minLength: 1 }),
        referencesContent: t.Optional(t.Object({})),
        scriptsContent: t.Optional(t.Object({})),
      }),
    }
  )
  .get("/skills/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["user"], ["skills:read"])

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
  })
  .patch(
    "/skills/:id",
    async ({ principal, params, body }) => {
      requirePrincipal(principal, ["user"], ["skills:write"])

      const { updateSkill } = await import("@/lib/services/skills")
      const skill = await updateSkill(params.id, principal.tenantId, {
        name: body.name,
        slug: body.slug,
        description: body.description,
        content: body.content,
        referencesContent: body.referencesContent,
        scriptsContent: body.scriptsContent,
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

      return { id: skill.id, version: skill.version, updatedAt: skill.updated_at }
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        slug: t.Optional(t.String()),
        description: t.Optional(t.String()),
        content: t.Optional(t.String()),
        referencesContent: t.Optional(t.Object({})),
        scriptsContent: t.Optional(t.Object({})),
      }),
    }
  )
  .delete("/skills/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["user"], ["skills:write"])

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
  })
  // ============================================================================
  // Webhooks
  // ============================================================================
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
  // ============================================================================
  // Schedules
  // ============================================================================
  .get("/schedules", async ({ principal, query }) => {
    requirePrincipal(principal, ["user"], ["schedules:read"])

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
  })
  .post(
    "/schedules",
    async ({ principal, body }) => {
      requirePrincipal(principal, ["user"], ["schedules:write"])

      const { createSchedule } = await import("@/lib/services/schedules")
      const schedule = await createSchedule({
        tenantId: principal.tenantId,
        name: body.name,
        frequency: body.frequency,
        cronExpression: body.cronExpression,
        timezone: body.timezone,
        agentId: body.agentId,
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
        agentId: t.Optional(t.String()),
        jobType: t.Optional(t.String()),
        input: t.Optional(t.Object({})),
      }),
    }
  )
  .get("/schedules/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["user"], ["schedules:read"])

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
  })
  .patch(
    "/schedules/:id",
    async ({ principal, params, body }) => {
      requirePrincipal(principal, ["user"], ["schedules:write"])

      const { updateSchedule } = await import("@/lib/services/schedules")
      const schedule = await updateSchedule(params.id, principal.tenantId, {
        name: body.name,
        frequency: body.frequency,
        cronExpression: body.cronExpression,
        timezone: body.timezone,
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
        input: t.Optional(t.Object({})),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )
  .delete("/schedules/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["user"], ["schedules:write"])

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
  // ============================================================================
  // Integrations (OAuth)
  // ============================================================================
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
  // ============================================================================
  // Email Addresses (Triggers)
  // ============================================================================
  .get("/email-addresses", async ({ principal }) => {
    requirePrincipal(principal, ["user"])

    const { listEmailAddresses } = await import("@/lib/services/triggers")
    const addresses = await listEmailAddresses(principal.tenantId)

    return {
      emailAddresses: addresses.map((a) => ({
        id: a.id,
        address: a.address,
        domain: a.domain,
        isCustomDomain: a.is_custom_domain,
        agentId: a.agent_id,
        isActive: a.is_active,
        createdAt: a.created_at,
      })),
    }
  })
  .post(
    "/email-addresses",
    async ({ principal, body }) => {
      requirePrincipal(principal, ["user"])

      const { createEmailAddress, generateInboundEmailAddress } = await import(
        "@/lib/services/triggers"
      )

      const address = body.address ?? generateInboundEmailAddress(principal.tenantId)
      const domain = address.split("@")[1]

      const emailAddress = await createEmailAddress({
        tenantId: principal.tenantId,
        address,
        domain,
        isCustomDomain: body.isCustomDomain ?? false,
        agentId: body.agentId,
      })

      if (!emailAddress) {
        throw new Error("Failed to create email address")
      }

      await logAudit({
        principal,
        action: "email_address.created",
        resourceType: "email_address",
        resourceId: emailAddress.id,
      })

      return {
        id: emailAddress.id,
        address: emailAddress.address,
        domain: emailAddress.domain,
      }
    },
    {
      body: t.Object({
        address: t.Optional(t.String()),
        isCustomDomain: t.Optional(t.Boolean()),
        agentId: t.Optional(t.String()),
      }),
    }
  )
  .patch(
    "/email-addresses/:id",
    async ({ principal, params, body }) => {
      requirePrincipal(principal, ["user"])

      const { updateEmailAddress } = await import("@/lib/services/triggers")
      const emailAddress = await updateEmailAddress(params.id, principal.tenantId, {
        agentId: body.agentId,
        isActive: body.isActive,
      })

      if (!emailAddress) {
        return new Response(JSON.stringify({ error: "Email address not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }

      return { id: emailAddress.id, updatedAt: emailAddress.updated_at }
    },
    {
      body: t.Object({
        agentId: t.Optional(t.Union([t.String(), t.Null()])),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )
  .delete("/email-addresses/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["user"])

    const { deleteEmailAddress } = await import("@/lib/services/triggers")
    const success = await deleteEmailAddress(params.id, principal.tenantId)

    if (!success) {
      return new Response(JSON.stringify({ error: "Email address not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    await logAudit({
      principal,
      action: "email_address.deleted",
      resourceType: "email_address",
      resourceId: params.id,
    })

    return { success: true }
  })
  // ============================================================================
  // Luma Webhook Configs (Triggers)
  // ============================================================================
  .get("/luma-webhooks", async ({ principal }) => {
    requirePrincipal(principal, ["user"])

    const { listLumaWebhookConfigs } = await import("@/lib/services/triggers")
    const configs = await listLumaWebhookConfigs(principal.tenantId)

    return {
      lumaWebhooks: configs.map((c) => ({
        id: c.id,
        calendarId: c.calendar_id,
        eventTypes: c.event_types,
        agentId: c.agent_id,
        isActive: c.is_active,
        createdAt: c.created_at,
      })),
    }
  })
  .post(
    "/luma-webhooks",
    async ({ principal, body }) => {
      requirePrincipal(principal, ["user"])

      const { createLumaWebhookConfig } = await import("@/lib/services/triggers")
      const result = await createLumaWebhookConfig({
        tenantId: principal.tenantId,
        calendarId: body.calendarId,
        eventTypes: body.eventTypes as LumaEventType[],
        agentId: body.agentId,
      })

      if (!result) {
        throw new Error("Failed to create Luma webhook config")
      }

      await logAudit({
        principal,
        action: "luma_webhook.created",
        resourceType: "luma_webhook",
        resourceId: result.config.id,
      })

      return {
        id: result.config.id,
        webhookUrl: result.webhookUrl,
        eventTypes: result.config.event_types,
      }
    },
    {
      body: t.Object({
        calendarId: t.Optional(t.String()),
        eventTypes: t.Array(t.String()),
        agentId: t.Optional(t.String()),
      }),
    }
  )
  .patch(
    "/luma-webhooks/:id",
    async ({ principal, params, body }) => {
      requirePrincipal(principal, ["user"])

      const { updateLumaWebhookConfig } = await import("@/lib/services/triggers")
      const config = await updateLumaWebhookConfig(params.id, principal.tenantId, {
        eventTypes: body.eventTypes as LumaEventType[] | undefined,
        agentId: body.agentId,
        isActive: body.isActive,
      })

      if (!config) {
        return new Response(JSON.stringify({ error: "Luma webhook config not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }

      return { id: config.id, updatedAt: config.updated_at }
    },
    {
      body: t.Object({
        eventTypes: t.Optional(t.Array(t.String())),
        agentId: t.Optional(t.Union([t.String(), t.Null()])),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )
  .delete("/luma-webhooks/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["user"])

    const { deleteLumaWebhookConfig } = await import("@/lib/services/triggers")
    const success = await deleteLumaWebhookConfig(params.id, principal.tenantId)

    if (!success) {
      return new Response(JSON.stringify({ error: "Luma webhook config not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    await logAudit({
      principal,
      action: "luma_webhook.deleted",
      resourceType: "luma_webhook",
      resourceId: params.id,
    })

    return { success: true }
  })
  .post("/luma-webhooks/:id/regenerate-token", async ({ principal, params }) => {
    requirePrincipal(principal, ["user"])

    const { regenerateLumaWebhookToken } = await import("@/lib/services/triggers")
    const result = await regenerateLumaWebhookToken(params.id, principal.tenantId)

    if (!result) {
      return new Response(JSON.stringify({ error: "Luma webhook config not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    await logAudit({
      principal,
      action: "luma_webhook.token_regenerated",
      resourceType: "luma_webhook",
      resourceId: params.id,
    })

    return { id: result.config.id, webhookUrl: result.webhookUrl }
  })
  // ============================================================================
  // Agent Runs
  // ============================================================================
  .get("/runs/:id", async ({ principal, params }) => {
    requirePrincipal(principal, ["user"], ["agents:read"])

    const { getAgentRunById, listAgentRunSteps } = await import("@/lib/services/agent-runs")
    const run = await getAgentRunById(params.id, principal.tenantId)

    if (!run) {
      return new Response(JSON.stringify({ error: "Run not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    const steps = await listAgentRunSteps(params.id, principal.tenantId)

    return {
      id: run.id,
      agentId: run.agent_id,
      status: run.status,
      triggerType: run.trigger_type,
      input: run.input,
      result: run.result,
      error: run.error,
      startedAt: run.started_at,
      completedAt: run.completed_at,
      totalTokens: run.total_tokens,
      totalCostCents: run.total_cost_cents,
      steps: steps.map((s) => ({
        id: s.id,
        stepNumber: s.step_number,
        type: s.type,
        name: s.name,
        input: s.input,
        output: s.output,
        error: s.error,
        durationMs: s.duration_ms,
        createdAt: s.created_at,
      })),
    }
  })
