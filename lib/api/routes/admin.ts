import { Elysia, t } from "elysia"
import { resolvePrincipal, requireAdmin, requireAdminScopes, AuthError } from "@/lib/auth/principal"
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
import { supabase } from "@/lib/db/client"
import { HackathonStatusEnum } from "@/lib/api/validators"

const LocationTypeEnum = t.Union([
  t.Literal("in_person"),
  t.Literal("virtual"),
])

export const adminRoutes = new Elysia({ prefix: "/admin" })
  .derive(async ({ request }) => {
    const principal = await resolvePrincipal(request)
    requireAdmin(principal)

    const rateLimitKey = principal.kind === "admin" ? `admin:${principal.userId}` : `admin-key:${principal.keyId}`
    const result = await checkRateLimit(rateLimitKey, { maxRequests: 60, windowMs: 60_000 })
    if (!result.allowed) {
      throw new RateLimitError(result.resetAt, result.remaining)
    }

    return { principal }
  })
  .get("/stats", async ({ principal }) => {
    requireAdminScopes(principal, ["admin:read"])
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
    async ({ query, principal }) => {
      requireAdminScopes(principal, ["admin:read"])
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
    async ({ params, principal }) => {
      requireAdminScopes(principal, ["admin:read"])
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
      requireAdminScopes(principal, ["admin:write"])
      const existing = await getHackathonById(params.id)
      if (!existing) {
        throw new AuthError("Hackathon not found", 404)
      }

      const updated = await updateHackathonAsAdmin(params.id, body)

      await logAudit({
        principal,
        action: "admin.hackathon.updated",
        resourceType: "hackathon",
        resourceId: params.id,
        targetTenantId: existing.tenant_id,
        metadata: { fields: Object.keys(body) },
        critical: true,
      })

      return updated
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ maxLength: 200 })),
        slug: t.Optional(t.String({ maxLength: 200 })),
        description: t.Optional(t.Nullable(t.String({ maxLength: 10000 }))),
        status: t.Optional(HackathonStatusEnum),
        starts_at: t.Optional(t.Nullable(t.String({ maxLength: 100 }))),
        ends_at: t.Optional(t.Nullable(t.String({ maxLength: 100 }))),
        registration_opens_at: t.Optional(t.Nullable(t.String({ maxLength: 100 }))),
        registration_closes_at: t.Optional(t.Nullable(t.String({ maxLength: 100 }))),
        min_team_size: t.Optional(t.Nullable(t.Number())),
        max_team_size: t.Optional(t.Nullable(t.Number())),
        max_participants: t.Optional(t.Nullable(t.Number())),
        allow_solo: t.Optional(t.Nullable(t.Boolean())),
        anonymous_judging: t.Optional(t.Boolean()),
        rules: t.Optional(t.Nullable(t.String({ maxLength: 50000 }))),
        location_type: t.Optional(t.Nullable(LocationTypeEnum)),
        location_name: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
        location_url: t.Optional(t.Nullable(t.String({ maxLength: 2000 }))),
        results_published_at: t.Optional(t.Nullable(t.String({ maxLength: 100 }))),
      }),
      detail: {
        summary: "Update hackathon",
        description: "Update any hackathon field as admin.",
      },
    }
  )
  .delete(
    "/hackathons/:id",
    async ({ params, body, principal }) => {
      requireAdminScopes(principal, ["admin:write"])
      const existing = await getHackathonById(params.id)
      if (!existing) {
        throw new AuthError("Hackathon not found", 404)
      }

      if (body?.confirm_name !== existing.name) {
        throw new AuthError("confirm_name must match the hackathon name", 400)
      }

      await deleteHackathon(params.id)

      await logAudit({
        principal,
        action: "admin.hackathon.deleted",
        resourceType: "hackathon",
        resourceId: params.id,
        targetTenantId: existing.tenant_id,
        metadata: { name: existing.name, slug: existing.slug },
        critical: true,
      })

      return { success: true }
    },
    {
      body: t.Object({
        confirm_name: t.String({ description: "Must match the hackathon name to confirm deletion" }),
      }),
      detail: {
        summary: "Delete hackathon",
        description: "Permanently delete a hackathon and all associated data. Requires confirm_name matching the hackathon name.",
      },
    }
  )
  .get("/scenarios", ({ principal }) => {
    requireAdminScopes(principal, ["admin:scenarios"])
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
      requireAdminScopes(principal, ["admin:scenarios"])
      const result = await runScenario(params.name, body?.tenant_id || undefined)

      await logAudit({
        principal,
        action: "admin.scenario.created",
        resourceType: "hackathon",
        resourceId: result.hackathonId,
        targetTenantId: result.tenantId,
        metadata: { scenario: params.name },
        critical: true,
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
  .post(
    "/maintenance/cleanup-rate-limits",
    async ({ body, principal }) => {
      requireAdminScopes(principal, ["admin:write"])
      const db = supabase()
      const limit = body?.limit ?? 1000
      const { data, error } = await db.rpc("cleanup_expired_rate_limits", { p_limit: limit })
      if (error) {
        throw new Error(error.message)
      }
      return { deleted: data as number }
    },
    {
      body: t.Optional(
        t.Object({
          limit: t.Optional(t.Number({ description: "Max rows to delete (default 1000)" })),
        })
      ),
      detail: {
        summary: "Clean up expired rate limit rows",
        description: "Deletes expired rows from the rate_limits table. Safe to call at any time.",
      },
    }
  )
