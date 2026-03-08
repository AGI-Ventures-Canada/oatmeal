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
  }, {
    detail: {
      summary: "List judging criteria",
      description: "Lists all judging criteria for a hackathon. Requires hackathons:read scope.",
    },
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
      detail: {
        summary: "Create judging criteria",
        description: "Creates a new judging criteria. Requires hackathons:write scope.",
      },
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
      detail: {
        summary: "Update judging criteria",
        description: "Updates a judging criteria. Requires hackathons:write scope.",
      },
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
  }, {
    detail: {
      summary: "Delete judging criteria",
      description: "Deletes a judging criteria. Requires hackathons:write scope.",
    },
  })
  .get("/hackathons/:id/judging/user-search", async ({ principal, params, query }) => {
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

    const q = (query as Record<string, string>).q?.trim()
    if (!q || q.length < 2) {
      return { users: [] }
    }

    try {
      const { clerkClient } = await import("@clerk/nextjs/server")
      const client = await clerkClient()
      const users = await client.users.getUserList({ query: q, limit: 10 })

      return {
        users: users.data.map((u) => ({
          id: u.id,
          email: u.primaryEmailAddress?.emailAddress ?? null,
          firstName: u.firstName,
          lastName: u.lastName,
          username: u.username,
          imageUrl: u.imageUrl,
        })),
      }
    } catch {
      return new Response(JSON.stringify({ error: "Failed to search users" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }
  }, {
    detail: {
      summary: "Search users for judge assignment",
      description: "Searches Clerk users by name or email for adding as judges. Requires hackathons:read scope.",
    },
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
        displayName: j.displayName,
        email: j.email,
        imageUrl: j.imageUrl,
        assignmentCount: j.assignmentCount,
        completedCount: j.completedCount,
      })),
    }
  }, {
    detail: {
      summary: "List judges",
      description: "Lists all judges for a hackathon with assignment progress. Requires hackathons:read scope.",
    },
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

      const typedBody = body as { clerkUserId?: string; email?: string }

      if (typedBody.clerkUserId) {
        const { addJudge } = await import("@/lib/services/judging")
        const addResult = await addJudge(params.id, typedBody.clerkUserId)

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
          metadata: { hackathonId: params.id, clerkUserId: typedBody.clerkUserId },
        })

        return {
          participantId: addResult.participant.id,
          clerkUserId: addResult.participant.clerkUserId,
        }
      }

      if (typedBody.email) {
        const email = typedBody.email

        const { clerkClient } = await import("@clerk/nextjs/server")
        const client = await clerkClient()

        try {
          const users = await client.users.getUserList({ emailAddress: [email] })
          if (users.data.length > 0) {
            const { addJudge } = await import("@/lib/services/judging")
            const addResult = await addJudge(params.id, users.data[0].id)

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
              metadata: { hackathonId: params.id, email },
            })

            return {
              participantId: addResult.participant.id,
              clerkUserId: addResult.participant.clerkUserId,
            }
          }
        } catch {
          return new Response(JSON.stringify({ error: "Failed to look up user", code: "lookup_failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          })
        }

        const invitedByUserId = principal.kind === "user" ? principal.userId : "api_key"

        const { createJudgeInvitation } = await import("@/lib/services/judge-invitations")
        const inviteResult = await createJudgeInvitation({
          hackathonId: params.id,
          email,
          invitedByClerkUserId: invitedByUserId,
        })

        if (!inviteResult.success) {
          return new Response(JSON.stringify({ error: inviteResult.error, code: inviteResult.code }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          })
        }

        const hackathon = result.hackathon
        let inviterName = "An organizer"
        if (principal.kind === "user") {
          try {
            const inviterUser = await client.users.getUser(principal.userId)
            inviterName = [inviterUser.firstName, inviterUser.lastName].filter(Boolean).join(" ") || "An organizer"
          } catch {
            // fall back to default
          }
        }
        const { sendJudgeInvitationEmail } = await import("@/lib/email/judge-invitations")
        await sendJudgeInvitationEmail({
          to: email,
          hackathonName: hackathon.name,
          inviterName,
          inviteToken: inviteResult.invitation.token,
          expiresAt: inviteResult.invitation.expires_at,
        })

        await logAudit({
          principal,
          action: "judge.invited",
          resourceType: "judge_invitation",
          resourceId: inviteResult.invitation.id,
          metadata: { hackathonId: params.id, email },
        })

        return {
          invited: true,
          invitationId: inviteResult.invitation.id,
        }
      }

      return new Response(JSON.stringify({ error: "Either clerkUserId or email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    },
    {
      detail: {
        summary: "Add judge",
        description: "Adds a judge by Clerk user ID or email. If email user not found, sends an invitation. Requires hackathons:write scope.",
      },
      body: t.Object({
        clerkUserId: t.Optional(t.String()),
        email: t.Optional(t.String({ format: "email" })),
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
  }, {
    detail: {
      summary: "Remove judge",
      description: "Removes a judge from a hackathon. Requires hackathons:write scope.",
    },
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
  }, {
    detail: {
      summary: "List judging assignments (organizer)",
      description: "Lists all judge-submission assignments with progress stats. Requires hackathons:read scope.",
    },
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
      detail: {
        summary: "Create judging assignment",
        description: "Manually assigns a judge to a submission. Requires hackathons:write scope.",
      },
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
  }, {
    detail: {
      summary: "Delete judging assignment",
      description: "Removes a judge-submission assignment. Requires hackathons:write scope.",
    },
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

      const { autoAssignJudges, listJudges, listJudgeAssignments } = await import("@/lib/services/judging")
      const { assignedCount } = await autoAssignJudges(params.id, body.submissionsPerJudge)

      await logAudit({
        principal,
        action: "judging.auto_assigned",
        resourceType: "hackathon",
        resourceId: params.id,
        metadata: { assignedCount, submissionsPerJudge: body.submissionsPerJudge },
      })

      const [judges, assignmentsRaw] = await Promise.all([
        listJudges(params.id),
        listJudgeAssignments(params.id),
      ])

      const assignments = assignmentsRaw.map((a) => ({
        id: a.id,
        judgeParticipantId: a.judge_participant_id,
        judgeName: a.judgeName,
        judgeEmail: a.judgeEmail,
        submissionId: a.submission_id,
        submissionTitle: a.submissionTitle,
        isComplete: a.is_complete,
        assignedAt: a.assigned_at,
      }))

      return { assignedCount, judges, assignments }
    },
    {
      detail: {
        summary: "Auto-assign judges",
        description: "Automatically distributes submissions across judges. Requires hackathons:write scope.",
      },
      body: t.Object({
        submissionsPerJudge: t.Number({ minimum: 1 }),
      }),
    }
  )
  .get("/hackathons/:id/judging/pick-results", async ({ principal, params }) => {
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
    const prizes = await listPrizes(params.id)

    const { getPickResults } = await import("@/lib/services/judge-picks")
    const results: Record<string, Awaited<ReturnType<typeof getPickResults>>> = {}
    for (const prize of prizes) {
      results[prize.id] = await getPickResults(params.id, prize.id)
    }

    return { results }
  }, {
    detail: {
      summary: "Get pick results for subjective judging",
      description: "Returns tallied pick results per prize for subjective judging mode. Requires hackathons:read scope.",
    },
  })
  .get("/hackathons/:id/judging/invitations", async ({ principal, params }) => {
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

    const { listJudgeInvitations } = await import("@/lib/services/judge-invitations")
    const invitations = await listJudgeInvitations(params.id, "pending")

    return {
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        status: inv.status,
        expiresAt: inv.expires_at,
        createdAt: inv.created_at,
      })),
    }
  }, {
    detail: {
      summary: "List judge invitations",
      description: "Lists pending judge invitations for a hackathon. Requires hackathons:read scope.",
    },
  })
  .delete("/hackathons/:id/judging/invitations/:invitationId", async ({ principal, params }) => {
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

    const { cancelJudgeInvitation } = await import("@/lib/services/judge-invitations")
    const cancelResult = await cancelJudgeInvitation(params.invitationId, params.id)

    if (!cancelResult.success) {
      return new Response(JSON.stringify({ error: cancelResult.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    await logAudit({
      principal,
      action: "judge_invitation.cancelled",
      resourceType: "judge_invitation",
      resourceId: params.invitationId,
    })

    return { success: true }
  }, {
    detail: {
      summary: "Cancel judge invitation",
      description: "Cancels a pending judge invitation. Requires hackathons:write scope.",
    },
  })
