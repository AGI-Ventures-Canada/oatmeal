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
        }
      )

      return logs
    },
    {
      query: t.Object({
        limit: t.Optional(t.Numeric()),
        offset: t.Optional(t.Numeric()),
        action: t.Optional(t.String()),
      }),
      detail: {
        summary: "List hackathon activity",
        description: "List audit logs for a specific hackathon.",
      },
    }
  )
