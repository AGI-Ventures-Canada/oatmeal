import { Elysia, t } from "elysia"
import { resolvePrincipal, requirePrincipal } from "@/lib/auth/principal"
import { logAudit } from "@/lib/services/audit"

export const dashboardJudgingRoutes = new Elysia()
  .derive(async ({ request }) => {
    const principal = await resolvePrincipal(request)
    return { principal }
  })
  .get("/hackathons/:id/judging/criteria", async ({ principal, params }) => {
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

    const { listJudgingCriteria } = await import("@/lib/services/judging")
    const criteria = await listJudgingCriteria(params.id)

    return {
      criteria: criteria.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        maxScore: c.max_score,
        weight: c.weight,
        displayOrder: c.display_order,
        createdAt: c.created_at,
      })),
    }
  })
  .post(
    "/hackathons/:id/judging/criteria",
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

      const { createJudgingCriteria } = await import("@/lib/services/judging")
      const criteria = await createJudgingCriteria(params.id, {
        name: body.name,
        description: body.description,
        maxScore: body.maxScore,
        weight: body.weight,
        displayOrder: body.displayOrder,
      })

      if (!criteria) {
        return new Response(JSON.stringify({ error: "Failed to create criteria" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      }

      await logAudit({
        principal,
        action: "judging_criteria.created",
        resourceType: "judging_criteria",
        resourceId: criteria.id,
        metadata: { hackathonId: params.id },
      })

      return {
        id: criteria.id,
        name: criteria.name,
        maxScore: criteria.max_score,
        weight: criteria.weight,
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        description: t.Optional(t.Union([t.String(), t.Null()])),
        maxScore: t.Optional(t.Number({ minimum: 1 })),
        weight: t.Optional(t.Number({ minimum: 0 })),
        displayOrder: t.Optional(t.Number()),
      }),
    }
  )
  .patch(
    "/hackathons/:id/judging/criteria/:criteriaId",
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

      const { updateJudgingCriteria } = await import("@/lib/services/judging")
      const criteria = await updateJudgingCriteria(params.criteriaId, params.id, {
        name: body.name,
        description: body.description,
        maxScore: body.maxScore,
        weight: body.weight,
        displayOrder: body.displayOrder,
      })

      if (!criteria) {
        return new Response(JSON.stringify({ error: "Criteria not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }

      return { id: criteria.id, updatedAt: criteria.updated_at }
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.Union([t.String(), t.Null()])),
        maxScore: t.Optional(t.Number({ minimum: 1 })),
        weight: t.Optional(t.Number({ minimum: 0 })),
        displayOrder: t.Optional(t.Number()),
      }),
    }
  )
  .delete("/hackathons/:id/judging/criteria/:criteriaId", async ({ principal, params }) => {
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

    const { deleteJudgingCriteria } = await import("@/lib/services/judging")
    const success = await deleteJudgingCriteria(params.criteriaId, params.id)

    if (!success) {
      return new Response(JSON.stringify({ error: "Criteria not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    await logAudit({
      principal,
      action: "judging_criteria.deleted",
      resourceType: "judging_criteria",
      resourceId: params.criteriaId,
    })

    return { success: true }
  })
  .get("/hackathons/:id/judging/judges", async ({ principal, params }) => {
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

    const { listJudges } = await import("@/lib/services/judging")
    const judges = await listJudges(params.id)

    return {
      judges: judges.map((j) => ({
        participantId: j.participantId,
        clerkUserId: j.clerkUserId,
        assignmentCount: j.assignmentCount,
        completedCount: j.completedCount,
      })),
    }
  })
  .post(
    "/hackathons/:id/judging/judges",
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

      const { clerkClient } = await import("@clerk/nextjs/server")
      const client = await clerkClient()

      let clerkUserId: string
      try {
        const users = await client.users.getUserList({ emailAddress: [body.email] })
        if (users.data.length === 0) {
          return new Response(JSON.stringify({ error: "No user found with this email", code: "user_not_found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          })
        }
        clerkUserId = users.data[0].id
      } catch {
        return new Response(JSON.stringify({ error: "Failed to look up user", code: "lookup_failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      }

      const { addJudge } = await import("@/lib/services/judging")
      const addResult = await addJudge(params.id, clerkUserId)

      if (!addResult.success) {
        return new Response(JSON.stringify({ error: addResult.error, code: addResult.code }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      }

      await logAudit({
        principal,
        action: "judge.added",
        resourceType: "hackathon_participant",
        resourceId: addResult.participant.id,
        metadata: { hackathonId: params.id, email: body.email },
      })

      return {
        participantId: addResult.participant.id,
        clerkUserId: addResult.participant.clerkUserId,
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
      }),
    }
  )
  .delete("/hackathons/:id/judging/judges/:participantId", async ({ principal, params }) => {
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

    const { removeJudge } = await import("@/lib/services/judging")
    const removeResult = await removeJudge(params.id, params.participantId)

    if (!removeResult.success) {
      return new Response(JSON.stringify({ error: "Judge not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    await logAudit({
      principal,
      action: "judge.removed",
      resourceType: "hackathon_participant",
      resourceId: params.participantId,
    })

    return { success: true, resultsStale: removeResult.resultsStale }
  })
  .get("/hackathons/:id/judging/assignments", async ({ principal, params }) => {
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

    const { listJudgeAssignments, getJudgingProgress } = await import("@/lib/services/judging")
    const [assignments, progress] = await Promise.all([
      listJudgeAssignments(params.id),
      getJudgingProgress(params.id),
    ])

    return {
      assignments: assignments.map((a) => ({
        id: a.id,
        judgeParticipantId: a.judge_participant_id,
        judgeName: a.judgeName,
        submissionId: a.submission_id,
        submissionTitle: a.submissionTitle,
        isComplete: a.is_complete,
        assignedAt: a.assigned_at,
      })),
      progress,
    }
  })
  .post(
    "/hackathons/:id/judging/assignments",
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

      const { assignJudgeToSubmission } = await import("@/lib/services/judging")
      const assignResult = await assignJudgeToSubmission(
        params.id,
        body.judgeParticipantId,
        body.submissionId
      )

      if (!assignResult.success) {
        return new Response(JSON.stringify({ error: assignResult.error, code: assignResult.code }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      }

      return { id: assignResult.assignment.id }
    },
    {
      body: t.Object({
        judgeParticipantId: t.String(),
        submissionId: t.String(),
      }),
    }
  )
  .delete("/hackathons/:id/judging/assignments/:assignmentId", async ({ principal, params }) => {
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

    const { removeJudgeAssignment } = await import("@/lib/services/judging")
    const success = await removeJudgeAssignment(params.assignmentId)

    if (!success) {
      return new Response(JSON.stringify({ error: "Assignment not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    return { success: true }
  })
  .post(
    "/hackathons/:id/judging/auto-assign",
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

      const { autoAssignJudges } = await import("@/lib/services/judging")
      const { assignedCount } = await autoAssignJudges(params.id, body.submissionsPerJudge)

      await logAudit({
        principal,
        action: "judging.auto_assigned",
        resourceType: "hackathon",
        resourceId: params.id,
        metadata: { assignedCount, submissionsPerJudge: body.submissionsPerJudge },
      })

      return { assignedCount }
    },
    {
      body: t.Object({
        submissionsPerJudge: t.Number({ minimum: 1 }),
      }),
    }
  )
