import { Elysia, t } from "elysia"
import { resolvePrincipal, requireAdmin, AuthError } from "@/lib/auth/principal"
import { checkRateLimit, getRateLimitHeaders, RateLimitError } from "@/lib/services/rate-limit"
import { logAudit } from "@/lib/services/audit"
import {
  getPlatformStats,
  listAllHackathons,
  getHackathonById,
  updateHackathonAsAdmin,
  deleteHackathon,
} from "@/lib/services/admin"
import { listScenarios, runScenario } from "@/lib/services/admin-scenarios"
import type { UpdateHackathonFields } from "@/lib/services/admin"

const HackathonStatusEnum = t.Union([
  t.Literal("draft"),
  t.Literal("published"),
  t.Literal("registration_open"),
  t.Literal("active"),
  t.Literal("judging"),
  t.Literal("completed"),
  t.Literal("archived"),
])

const LocationTypeEnum = t.Union([
  t.Literal("in_person"),
  t.Literal("virtual"),
])

export const adminRoutes = new Elysia({ prefix: "/admin" })
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
    requireAdmin(principal)

    const result = checkRateLimit(`admin:${principal.userId}`, { maxRequests: 60, windowMs: 60_000 })
    if (!result.allowed) {
      throw new RateLimitError(result.resetAt, result.remaining)
    }

    return { principal }
  })
  .get("/stats", async () => {
    const stats = await getPlatformStats()
    return stats
  }, {
    detail: {
      summary: "Get platform stats",
      description: "Returns aggregate counts of tenants, hackathons, participants, and submissions.",
    },
  })
  .get(
    "/hackathons",
    async ({ query }) => {
      const result = await listAllHackathons({
        limit: query.limit,
        offset: query.offset,
        status: query.status || undefined,
        tenantId: query.tenant_id || undefined,
        search: query.search || undefined,
      })
      return result
    },
    {
      query: t.Object({
        limit: t.Optional(t.Numeric()),
        offset: t.Optional(t.Numeric()),
        status: t.Optional(t.String()),
        tenant_id: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
      detail: {
        summary: "List all hackathons",
        description: "List hackathons across all tenants with pagination and filters.",
      },
    }
  )
  .get(
    "/hackathons/:id",
    async ({ params }) => {
      const hackathon = await getHackathonById(params.id)
      if (!hackathon) {
        throw new AuthError("Hackathon not found", 404)
      }
      return hackathon
    },
    {
      detail: {
        summary: "Get hackathon detail",
        description: "Returns full hackathon details including tenant info.",
      },
    }
  )
  .patch(
    "/hackathons/:id",
    async ({ params, body, principal }) => {
      const existing = await getHackathonById(params.id)
      if (!existing) {
        throw new AuthError("Hackathon not found", 404)
      }

      const updated = await updateHackathonAsAdmin(params.id, body as UpdateHackathonFields)

      await logAudit({
        principal,
        action: "admin.hackathon.updated",
        resourceType: "hackathon",
        resourceId: params.id,
        targetTenantId: existing.tenant_id,
        metadata: { fields: Object.keys(body) },
      })

      return updated
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        slug: t.Optional(t.String()),
        description: t.Optional(t.Nullable(t.String())),
        status: t.Optional(HackathonStatusEnum),
        starts_at: t.Optional(t.Nullable(t.String())),
        ends_at: t.Optional(t.Nullable(t.String())),
        registration_opens_at: t.Optional(t.Nullable(t.String())),
        registration_closes_at: t.Optional(t.Nullable(t.String())),
        min_team_size: t.Optional(t.Nullable(t.Number())),
        max_team_size: t.Optional(t.Nullable(t.Number())),
        max_participants: t.Optional(t.Nullable(t.Number())),
        allow_solo: t.Optional(t.Nullable(t.Boolean())),
        anonymous_judging: t.Optional(t.Boolean()),
        rules: t.Optional(t.Nullable(t.String())),
        location_type: t.Optional(t.Nullable(LocationTypeEnum)),
        location_name: t.Optional(t.Nullable(t.String())),
        location_url: t.Optional(t.Nullable(t.String())),
        results_published_at: t.Optional(t.Nullable(t.String())),
      }),
      detail: {
        summary: "Update hackathon",
        description: "Update any hackathon field as admin.",
      },
    }
  )
  .delete(
    "/hackathons/:id",
    async ({ params, principal }) => {
      const existing = await getHackathonById(params.id)
      if (!existing) {
        throw new AuthError("Hackathon not found", 404)
      }

      await deleteHackathon(params.id)

      await logAudit({
        principal,
        action: "admin.hackathon.deleted",
        resourceType: "hackathon",
        resourceId: params.id,
        targetTenantId: existing.tenant_id,
        metadata: { name: existing.name, slug: existing.slug },
      })

      return { success: true }
    },
    {
      detail: {
        summary: "Delete hackathon",
        description: "Permanently delete a hackathon and all associated data.",
      },
    }
  )
  .get("/scenarios", () => {
    return { scenarios: listScenarios() }
  }, {
    detail: {
      summary: "List test scenarios",
      description: "Returns available test scenarios with descriptions.",
    },
  })
  .post(
    "/scenarios/:name",
    async ({ params, body, principal }) => {
      const result = await runScenario(params.name, body?.tenant_id || undefined)

      await logAudit({
        principal,
        action: "admin.scenario.created",
        resourceType: "hackathon",
        resourceId: result.hackathonId,
        targetTenantId: result.tenantId,
        metadata: { scenario: params.name },
      })

      return result
    },
    {
      body: t.Optional(
        t.Object({
          tenant_id: t.Optional(t.String()),
        })
      ),
      detail: {
        summary: "Run test scenario",
        description: "Run a test scenario to seed the database with sample data.",
      },
    }
  )
