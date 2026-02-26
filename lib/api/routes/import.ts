import { Elysia, t } from "elysia"
import { extractLumaEventData } from "@/lib/services/luma-import"
import { resolvePrincipal, requirePrincipal, AuthError } from "@/lib/auth/principal"
import { logAudit } from "@/lib/services/audit"

export const importRoutes = new Elysia({ prefix: "/public/import" })
  .post(
    "/luma",
    async ({ body, set }) => {
      const data = await extractLumaEventData(body.slug)

      if (!data) {
        set.status = 404
        return { error: "Could not extract event data from Luma" }
      }

      return data
    },
    {
      detail: {
        summary: "Extract Luma event data",
        description: "Fetches a public Luma event page and extracts structured data. No authentication required.",
        tags: ["public"],
      },
      body: t.Object({
        slug: t.String({ minLength: 1 }),
      }),
    }
  )

export const dashboardImportRoutes = new Elysia({ prefix: "/dashboard/import" })
  .onError(({ error, set }) => {
    if (error instanceof AuthError) {
      set.status = error.statusCode
      return { error: error.message }
    }
    set.status = 500
    return { error: "Internal server error" }
  })
  .derive(async ({ request }) => {
    const principal = await resolvePrincipal(request)
    return { principal }
  })
  .post(
    "/luma",
    async ({ principal, body, set }) => {
      requirePrincipal(principal, ["user", "api_key"], ["hackathons:write"])

      const { createHackathonFromImport } = await import("@/lib/services/luma-import-create")
      const hackathon = await createHackathonFromImport(principal.tenantId, {
        name: body.name,
        description: body.description ?? null,
        startsAt: body.startsAt ?? null,
        endsAt: body.endsAt ?? null,
        registrationOpensAt: body.registrationOpensAt ?? null,
        registrationClosesAt: body.registrationClosesAt ?? null,
        locationType: body.locationType ?? null,
        locationName: body.locationName ?? null,
        locationUrl: body.locationUrl ?? null,
        imageUrl: body.imageUrl ?? null,
      })

      if (!hackathon) {
        set.status = 500
        return { error: "Failed to create hackathon" }
      }

      if (body.sponsors?.length) {
        const { createSponsorsFromImport } = await import("@/lib/services/luma-import-create")
        await createSponsorsFromImport(hackathon.id, body.sponsors)
      }

      await logAudit({
        principal,
        action: "hackathon.created",
        resourceType: "hackathon",
        resourceId: hackathon.id,
        metadata: { source: "luma_import" },
      })

      const { triggerWebhooks } = await import("@/lib/services/webhooks")
      triggerWebhooks(principal.tenantId, "hackathon.created", {
        event: "hackathon.created",
        timestamp: new Date().toISOString(),
        data: { hackathonId: hackathon.id, source: "luma_import" },
      }).catch(console.error)

      return {
        id: hackathon.id,
        name: hackathon.name,
        slug: hackathon.slug,
      }
    },
    {
      detail: {
        summary: "Create hackathon from Luma import",
        description: "Creates a new hackathon with prefilled data from a Luma event. Requires hackathons:write scope.",
        tags: ["dashboard"],
      },
      body: t.Object({
        name: t.String({ minLength: 1 }),
        description: t.Optional(t.Union([t.String(), t.Null()])),
        startsAt: t.Optional(t.Union([t.String(), t.Null()])),
        endsAt: t.Optional(t.Union([t.String(), t.Null()])),
        registrationOpensAt: t.Optional(t.Union([t.String(), t.Null()])),
        registrationClosesAt: t.Optional(t.Union([t.String(), t.Null()])),
        locationType: t.Optional(t.Union([t.Literal("in_person"), t.Literal("virtual"), t.Null()])),
        locationName: t.Optional(t.Union([t.String(), t.Null()])),
        locationUrl: t.Optional(t.Union([t.String(), t.Null()])),
        imageUrl: t.Optional(t.Union([t.String(), t.Null()])),
        sponsors: t.Optional(t.Array(t.Object({
          name: t.String({ minLength: 1 }),
          tier: t.Union([t.String(), t.Null()]),
        }))),
      }),
    }
  )
