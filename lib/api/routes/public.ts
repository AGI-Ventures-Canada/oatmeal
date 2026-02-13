import { Elysia, t } from "elysia"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { exchangeCodeForTokens, saveIntegration, getProviderConfig } from "@/lib/integrations/oauth"
import { getPublicHackathon, listPublicHackathons } from "@/lib/services/public-hackathons"
import { registerForHackathon, getParticipantCount, isUserRegistered } from "@/lib/services/hackathons"
import { getPublicTenantWithEvents } from "@/lib/services/tenant-profiles"
import {
  getParticipantWithTeam,
  getSubmissionForParticipant,
  getExistingSubmission,
  createSubmission,
  updateSubmission,
  getHackathonSubmissions,
} from "@/lib/services/submissions"

export const publicRoutes = new Elysia({ prefix: "/public" })
  .get("/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }))
  .get("/integrations/:provider/callback", async ({ params, query }) => {
    const { provider } = params
    const code = query.code as string | undefined
    const state = query.state as string | undefined
    const error = query.error as string | undefined

    if (error) {
      const safeError = error
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
      return new Response(
        `<html><body><h1>Error</h1><p>${safeError}</p><script>window.close()</script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      )
    }

    if (!code || !state) {
      return new Response(
        `<html><body><h1>Error</h1><p>Missing code or state</p></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      )
    }

    let stateData: { tenantId: string; userId: string }
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString())
    } catch {
      return new Response(
        `<html><body><h1>Error</h1><p>Invalid state</p></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      )
    }

    const providerType = provider as "gmail" | "google_calendar" | "notion" | "luma"
    const config = getProviderConfig(providerType)

    if (!config) {
      return new Response(
        `<html><body><h1>Error</h1><p>Provider not configured</p></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      )
    }

    const tokens = await exchangeCodeForTokens(providerType, code)

    if (!tokens) {
      return new Response(
        `<html><body><h1>Error</h1><p>Token exchange failed</p></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      )
    }

    await saveIntegration({
      tenantId: stateData.tenantId,
      provider: providerType,
      accountEmail: tokens.email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      scopes: config.scopes,
    })

    return new Response(
      `<html><body><h1>Success!</h1><p>${provider} connected successfully.</p><script>setTimeout(() => window.close(), 2000)</script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    )
  })
  .get("/hackathons/:slug", async ({ params }) => {
    const hackathon = await getPublicHackathon(params.slug)

    if (!hackathon) {
      return new Response(JSON.stringify({ error: "Hackathon not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    return {
      id: hackathon.id,
      name: hackathon.name,
      slug: hackathon.slug,
      description: hackathon.description,
      rules: hackathon.rules,
      bannerUrl: hackathon.banner_url,
      status: hackathon.status,
      startsAt: hackathon.starts_at,
      endsAt: hackathon.ends_at,
      registrationOpensAt: hackathon.registration_opens_at,
      registrationClosesAt: hackathon.registration_closes_at,
      organizer: {
        id: hackathon.organizer.id,
        name: hackathon.organizer.name,
        slug: hackathon.organizer.slug,
        logoUrl: hackathon.organizer.logo_url,
      },
      sponsors: hackathon.sponsors.map((s) => ({
        id: s.id,
        name: s.name,
        logoUrl: s.logo_url,
        websiteUrl: s.website_url,
        tier: s.tier,
        tenant: s.tenant
          ? {
              slug: s.tenant.slug,
              name: s.tenant.name,
              logoUrl: s.tenant.logo_url,
            }
          : null,
      })),
    }
  })
  .post("/hackathons/:slug/register", async ({ params }) => {
    const { userId } = await auth()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Sign in required", code: "not_authenticated" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }

    const hackathon = await getPublicHackathon(params.slug)

    if (!hackathon) {
      return new Response(
        JSON.stringify({ error: "Hackathon not found", code: "hackathon_not_found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    }

    let teamName: string | undefined
    try {
      const client = await clerkClient()
      const user = await client.users.getUser(userId)
      const displayName = user.firstName
        ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
        : user.username || user.emailAddresses?.[0]?.emailAddress?.split("@")[0]
      if (displayName) {
        teamName = `${displayName}'s Team`
      }
    } catch (err) {
      console.warn("Failed to fetch user for team name:", err)
    }

    const result = await registerForHackathon(hackathon.id, userId, teamName)

    if (!result.success) {
      const statusCode = result.code === "already_registered" ? 409 : 400
      return new Response(
        JSON.stringify({ error: result.error, code: result.code }),
        { status: statusCode, headers: { "Content-Type": "application/json" } }
      )
    }

    return { success: true, participantId: result.participantId, teamId: result.teamId }
  })
  .get("/hackathons/:slug/submissions/me", async ({ params }) => {
    const { userId } = await auth()

    if (!userId) {
      return { submission: null }
    }

    const hackathon = await getPublicHackathon(params.slug)

    if (!hackathon) {
      return { submission: null }
    }

    const submission = await getSubmissionForParticipant(hackathon.id, userId)

    if (!submission) {
      return { submission: null }
    }

    return {
      submission: {
        id: submission.id,
        title: submission.title,
        description: submission.description,
        githubUrl: submission.github_url,
        liveAppUrl: submission.live_app_url,
        status: submission.status,
        createdAt: submission.created_at,
        updatedAt: submission.updated_at,
      },
    }
  })
  .get("/hackathons/:slug/submissions", async ({ params }) => {
    const hackathon = await getPublicHackathon(params.slug)

    if (!hackathon) {
      return new Response(
        JSON.stringify({ error: "Hackathon not found", code: "hackathon_not_found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    }

    const submissions = await getHackathonSubmissions(hackathon.id)

    return {
      submissions: submissions.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        githubUrl: s.github_url,
        liveAppUrl: s.live_app_url,
        demoVideoUrl: s.demo_video_url,
        status: s.status,
        createdAt: s.created_at,
        submitter: s.submitter_name,
      })),
    }
  })
  .post(
    "/hackathons/:slug/submissions",
    async ({ params, body }) => {
      const { userId } = await auth()

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Sign in required", code: "not_authenticated" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        )
      }

      const hackathon = await getPublicHackathon(params.slug)

      if (!hackathon) {
        return new Response(
          JSON.stringify({ error: "Hackathon not found", code: "hackathon_not_found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        )
      }

      if (hackathon.status !== "active") {
        return new Response(
          JSON.stringify({ error: "Submissions are not currently open", code: "submissions_closed" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      }

      const participant = await getParticipantWithTeam(hackathon.id, userId)

      if (!participant) {
        return new Response(
          JSON.stringify({ error: "You must register before submitting", code: "not_registered" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        )
      }

      const existing = await getExistingSubmission(
        hackathon.id,
        participant.participantId,
        participant.teamId
      )

      if (existing) {
        return new Response(
          JSON.stringify({ error: "You have already submitted a project", code: "already_submitted" }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        )
      }

      try {
        const url = new URL(body.githubUrl)
        if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
          return new Response(
            JSON.stringify({ error: "GitHub URL must be from github.com", code: "invalid_github_url" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          )
        }
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid GitHub URL", code: "invalid_github_url" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      }

      const submission = await createSubmission(
        hackathon.id,
        participant.participantId,
        participant.teamId,
        {
          title: body.title,
          description: body.description,
          githubUrl: body.githubUrl,
          liveAppUrl: body.liveAppUrl,
        }
      )

      if (!submission) {
        return new Response(
          JSON.stringify({ error: "Failed to create submission", code: "create_failed" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        )
      }

      return { success: true, submissionId: submission.id }
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1, maxLength: 100 }),
        description: t.String({ minLength: 1, maxLength: 280 }),
        githubUrl: t.String(),
        liveAppUrl: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  )
  .patch(
    "/hackathons/:slug/submissions",
    async ({ params, body }) => {
      const { userId } = await auth()

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Sign in required", code: "not_authenticated" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        )
      }

      const hackathon = await getPublicHackathon(params.slug)

      if (!hackathon) {
        return new Response(
          JSON.stringify({ error: "Hackathon not found", code: "hackathon_not_found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        )
      }

      if (hackathon.status !== "active") {
        return new Response(
          JSON.stringify({ error: "Submissions are not currently open", code: "submissions_closed" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      }

      const participant = await getParticipantWithTeam(hackathon.id, userId)

      if (!participant) {
        return new Response(
          JSON.stringify({ error: "You must register before submitting", code: "not_registered" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        )
      }

      const existing = await getExistingSubmission(
        hackathon.id,
        participant.participantId,
        participant.teamId
      )

      if (!existing) {
        return new Response(
          JSON.stringify({ error: "No submission found to update", code: "no_submission" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        )
      }

      if (body.githubUrl) {
        try {
          const url = new URL(body.githubUrl)
          if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
            return new Response(
              JSON.stringify({ error: "GitHub URL must be from github.com", code: "invalid_github_url" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            )
          }
        } catch {
          return new Response(
            JSON.stringify({ error: "Invalid GitHub URL", code: "invalid_github_url" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          )
        }
      }

      const submission = await updateSubmission(
        existing.id,
        participant.participantId,
        participant.teamId,
        {
          title: body.title,
          description: body.description,
          githubUrl: body.githubUrl,
          liveAppUrl: body.liveAppUrl,
        }
      )

      if (!submission) {
        return new Response(
          JSON.stringify({ error: "Failed to update submission", code: "update_failed" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        )
      }

      return { success: true, submissionId: submission.id }
    },
    {
      body: t.Object({
        title: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
        description: t.Optional(t.String({ minLength: 1, maxLength: 280 })),
        githubUrl: t.Optional(t.String()),
        liveAppUrl: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  )
  .get("/hackathons", async ({ query }) => {
    const q = (query as Record<string, string | undefined>).q
    const hackathons = await listPublicHackathons(q ? { search: q } : undefined)

    const { sortByStatusPriority } = await import("@/lib/utils/sort-hackathons")
    const sorted = sortByStatusPriority(hackathons)

    return {
      hackathons: sorted.map((h) => ({
        id: h.id,
        name: h.name,
        slug: h.slug,
        description: h.description,
        bannerUrl: h.banner_url,
        status: h.status,
        startsAt: h.starts_at,
        endsAt: h.ends_at,
        registrationOpensAt: h.registration_opens_at,
        registrationClosesAt: h.registration_closes_at,
        organizer: {
          id: h.organizer.id,
          name: h.organizer.name,
          slug: h.organizer.slug,
          logoUrl: h.organizer.logo_url,
        },
      })),
    }
  })
  .get("/hackathons/:slug/registration", async ({ params }) => {
    const hackathon = await getPublicHackathon(params.slug)

    if (!hackathon) {
      return new Response(
        JSON.stringify({ error: "Hackathon not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    }

    const { userId } = await auth()
    const [participantCount, registered] = await Promise.all([
      getParticipantCount(hackathon.id),
      userId ? isUserRegistered(hackathon.id, userId) : Promise.resolve(false),
    ])

    return {
      participantCount,
      isRegistered: userId ? registered : null,
    }
  })
  .get("/orgs/:slug", async ({ params }) => {
    const tenant = await getPublicTenantWithEvents(params.slug)

    if (!tenant) {
      return new Response(JSON.stringify({ error: "Organization not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logo_url,
      logoUrlDark: tenant.logo_url_dark,
      description: tenant.description,
      websiteUrl: tenant.website_url,
      organizedHackathons: tenant.organizedHackathons.map((h) => ({
        id: h.id,
        name: h.name,
        slug: h.slug,
        description: h.description,
        bannerUrl: h.banner_url,
        status: h.status,
        startsAt: h.starts_at,
        endsAt: h.ends_at,
      })),
      sponsoredHackathons: tenant.sponsoredHackathons.map((h) => ({
        id: h.id,
        name: h.name,
        slug: h.slug,
        description: h.description,
        bannerUrl: h.banner_url,
        status: h.status,
        startsAt: h.starts_at,
        endsAt: h.ends_at,
        organizer: {
          id: h.organizer.id,
          name: h.organizer.name,
          slug: h.organizer.slug,
          logoUrl: h.organizer.logo_url,
        },
      })),
    }
  })
  .get("/invitations/:token", async ({ params }) => {
    const { getInvitationByToken } = await import("@/lib/services/team-invitations")
    const invitation = await getInvitationByToken(params.token)

    if (!invitation) {
      return new Response(
        JSON.stringify({ error: "Invitation not found", code: "not_found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    }

    const now = new Date()
    const isExpired = new Date(invitation.expires_at) < now

    return {
      id: invitation.id,
      status: isExpired && invitation.status === "pending" ? "expired" : invitation.status,
      teamName: invitation.team.name,
      hackathonName: invitation.hackathon.name,
      hackathonSlug: invitation.hackathon.slug,
      hackathonStatus: invitation.hackathon.status,
      email: invitation.email,
      expiresAt: invitation.expires_at,
    }
  })
  .post("/invitations/:token/accept", async ({ params }) => {
    const { userId } = await auth()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Sign in required", code: "not_authenticated" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }

    const { acceptTeamInvitation } = await import("@/lib/services/team-invitations")
    const result = await acceptTeamInvitation(params.token, userId)

    if (!result.success) {
      const statusCode = result.code === "not_found" ? 404 : 400
      return new Response(
        JSON.stringify({ error: result.error, code: result.code }),
        { status: statusCode, headers: { "Content-Type": "application/json" } }
      )
    }

    const { getPublicHackathonById } = await import("@/lib/services/public-hackathons")
    const hackathon = await getPublicHackathonById(result.hackathonId)

    return { success: true, teamId: result.teamId, hackathonSlug: hackathon?.slug || null }
  })
  .post("/invitations/:token/decline", async ({ params }) => {
    const { userId } = await auth()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Sign in required", code: "not_authenticated" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }

    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const userEmail = user.primaryEmailAddress?.emailAddress

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: "No email address found", code: "no_email" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const { declineTeamInvitation } = await import("@/lib/services/team-invitations")
    const result = await declineTeamInvitation(params.token, userEmail)

    if (!result.success) {
      const statusCode = result.code === "not_found" ? 404 : 403
      return new Response(
        JSON.stringify({ error: result.error, code: result.code }),
        { status: statusCode, headers: { "Content-Type": "application/json" } }
      )
    }

    return { success: result.success }
  })
