import { Elysia, t } from "elysia"
import { resolvePrincipal, requirePrincipal } from "@/lib/auth/principal"

export const dashboardActivityRoutes = new Elysia({ prefix: "/dashboard" })
  .derive(async ({ request }) => {
    const principal = await resolvePrincipal(request)
    return { principal }
  })
  .get(
    "/hackathons/:id/activity",
    async ({ principal, params, query }) => {
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
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        })
      }

      const { listHackathonAuditLogs } = await import("@/lib/services/audit")
      const logs = await listHackathonAuditLogs(
        principal.tenantId,
        params.id,
        {
          limit: query.limit,
          offset: query.offset,
          action: query.action || undefined,
          resourceType: query.resource_type || undefined,
          since: query.since || undefined,
          until: query.until || undefined,
          sort: query.sort === "asc" ? "asc" : undefined,
        }
      )

      return logs
    },
    {
      query: t.Object({
        limit: t.Optional(t.Numeric({ description: "Page size (1-100, default 50)" })),
        offset: t.Optional(t.Numeric({ description: "Pagination offset (default 0)" })),
        action: t.Optional(t.String({ description: "Filter by action (substring match)" })),
        resource_type: t.Optional(t.String({ description: "Filter by resource type (exact match)" })),
        since: t.Optional(t.String({ description: "Only logs after this ISO 8601 timestamp" })),
        until: t.Optional(t.String({ description: "Only logs before this ISO 8601 timestamp" })),
        sort: t.Optional(t.String({ description: "Sort order: 'asc' or 'desc' (default 'desc')" })),
      }),
      detail: {
        summary: "List hackathon activity",
        description: "List audit logs for a specific hackathon. Supports filtering by action, resource type, and date range.",
      },
    }
  )
