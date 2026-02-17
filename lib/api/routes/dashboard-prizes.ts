import { Elysia, t } from "elysia"
import { resolvePrincipal, requirePrincipal } from "@/lib/auth/principal"
import { logAudit } from "@/lib/services/audit"

export const dashboardPrizesRoutes = new Elysia()
  .derive(async ({ request }) => {
    const principal = await resolvePrincipal(request)
    return { principal }
  })
  .get("/hackathons/:id/prizes", async ({ principal, params }) => {
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

    const { listPrizes } = await import("@/lib/services/prizes")
    const { listPrizeAssignments } = await import("@/lib/services/prizes")
    const [prizes, assignments] = await Promise.all([
      listPrizes(params.id),
      listPrizeAssignments(params.id),
    ])

    return {
      prizes: prizes.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        value: p.value,
        displayOrder: p.display_order,
        createdAt: p.created_at,
      })),
      assignments: assignments.map((a) => ({
        id: a.id,
        prizeId: a.prize_id,
        prizeName: a.prizeName,
        submissionId: a.submission_id,
        submissionTitle: a.submissionTitle,
        teamName: a.teamName,
        assignedAt: a.assigned_at,
      })),
    }
  })
  .post(
    "/hackathons/:id/prizes",
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
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        })
      }

      const { createPrize } = await import("@/lib/services/prizes")
      const prize = await createPrize(params.id, {
        name: body.name,
        description: body.description,
        value: body.value,
        displayOrder: body.displayOrder,
      })

      if (!prize) {
        return new Response(JSON.stringify({ error: "Failed to create prize" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      }

      await logAudit({
        principal,
        action: "prize.created",
        resourceType: "prize",
        resourceId: prize.id,
        metadata: { hackathonId: params.id },
      })

      return { id: prize.id, name: prize.name }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        description: t.Optional(t.Union([t.String(), t.Null()])),
        value: t.Optional(t.Union([t.String(), t.Null()])),
        displayOrder: t.Optional(t.Number()),
      }),
    }
  )
  .patch(
    "/hackathons/:id/prizes/:prizeId",
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
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        })
      }

      const { updatePrize } = await import("@/lib/services/prizes")
      const prize = await updatePrize(params.prizeId, params.id, {
        name: body.name,
        description: body.description,
        value: body.value,
        displayOrder: body.displayOrder,
      })

      if (!prize) {
        return new Response(JSON.stringify({ error: "Prize not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }

      return { id: prize.id, updatedAt: prize.updated_at }
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.Union([t.String(), t.Null()])),
        value: t.Optional(t.Union([t.String(), t.Null()])),
        displayOrder: t.Optional(t.Number()),
      }),
    }
  )
  .delete("/hackathons/:id/prizes/:prizeId", async ({ principal, params }) => {
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
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { deletePrize } = await import("@/lib/services/prizes")
    const success = await deletePrize(params.prizeId, params.id)

    if (!success) {
      return new Response(JSON.stringify({ error: "Prize not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    await logAudit({
      principal,
      action: "prize.deleted",
      resourceType: "prize",
      resourceId: params.prizeId,
    })

    return { success: true }
  })
  .post("/hackathons/:id/prizes/:prizeId/assign", async ({ principal, params, body }) => {
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
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { assignPrize } = await import("@/lib/services/prizes")
    const assignment = await assignPrize(params.prizeId, (body as { submissionId: string }).submissionId)

    if (!assignment) {
      return new Response(JSON.stringify({ error: "Failed to assign prize" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    await logAudit({
      principal,
      action: "prize.assigned",
      resourceType: "prize_assignment",
      resourceId: assignment.id,
      metadata: { prizeId: params.prizeId, submissionId: (body as { submissionId: string }).submissionId },
    })

    return { id: assignment.id }
  })
  .delete("/hackathons/:id/prizes/:prizeId/assign/:submissionId", async ({ principal, params }) => {
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
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { removePrizeAssignment } = await import("@/lib/services/prizes")
    const success = await removePrizeAssignment(params.prizeId, params.submissionId)

    if (!success) {
      return new Response(JSON.stringify({ error: "Assignment not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    return { success: true }
  })
