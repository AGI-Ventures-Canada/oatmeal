import { Elysia, t } from "elysia"
import { resolvePrincipal, requirePrincipal } from "@/lib/auth/principal"

export const dashboardSponsorFulfillmentRoutes = new Elysia()
  .derive(async ({ request }) => {
    const principal = await resolvePrincipal(request)
    return { principal }
  })
  .get("/hackathons/:id/sponsor-fulfillments", async ({ principal, params }) => {
    requirePrincipal(principal, ["user", "api_key"], ["hackathons:read"])

    const { isValidUuid } = await import("@/lib/utils/uuid")
    if (!isValidUuid(params.id)) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { listSponsorFulfillments } = await import("@/lib/services/sponsor-fulfillments")
    const fulfillments = await listSponsorFulfillments(principal.tenantId, params.id)

    return { fulfillments }
  }, {
    detail: {
      summary: "List sponsor fulfillments",
      description: "Returns prize fulfillments for prizes in sponsor-owned tracks. Winner details only visible after claim.",
    },
  })
  .patch("/hackathons/:id/sponsor-fulfillments/:fulfillmentId", async ({ principal, params, body }) => {
    requirePrincipal(principal, ["user", "api_key"], ["hackathons:write"])

    const { isValidUuid } = await import("@/lib/utils/uuid")
    if (!isValidUuid(params.id) || !isValidUuid(params.fulfillmentId)) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { trackingNumber } = body

    const { markSponsorFulfilled } = await import("@/lib/services/sponsor-fulfillments")
    const success = await markSponsorFulfilled(
      principal.tenantId,
      params.id,
      params.fulfillmentId,
      trackingNumber
    )

    if (!success) {
      return new Response(
        JSON.stringify({ error: "Cannot mark as fulfilled. Prize must be claimed first." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    return { success: true }
  }, {
    body: t.Object({
      trackingNumber: t.Optional(t.String({ maxLength: 100, description: "Shipping tracking number" })),
    }),
    detail: {
      summary: "Mark sponsor prize as fulfilled",
      description: "Advances a claimed prize fulfillment to shipped status. Validates sponsor ownership.",
    },
  })
