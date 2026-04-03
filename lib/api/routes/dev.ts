import { Elysia, t } from "elysia"
import { HackathonStatusEnum } from "@/lib/api/validators"

function devGuard(set: { status?: number | string }) {
  if (process.env.NODE_ENV !== "development") {
    set.status = 403
    return { error: "Forbidden" as const }
  }
  return null
}

async function getDb() {
  const { supabase } = await import("@/lib/db/client")
  return supabase()
}

async function getHackathonTenant(id: string, set: { status?: number | string }) {
  const db = await getDb()
  const { data: row } = await db
    .from("hackathons")
    .select("tenant_id")
    .eq("id", id)
    .single()

  if (!row) {
    set.status = 404
    return { error: "Hackathon not found" as const, tenantId: null }
  }
  return { error: null, tenantId: row.tenant_id as string }
}

const SEED_USERS = [
  "seed_user_alice_001",
  "seed_user_bob_002",
  "seed_user_carol_003",
  "seed_user_dave_004",
  "seed_user_eve_005",
  "seed_user_frank_006",
  "seed_user_grace_007",
  "seed_user_hank_008",
  "seed_user_ivy_009",
  "seed_user_jack_010",
]

const TEAM_NAMES = [
  "Alpha Wolves", "Binary Stars", "Circuit Breakers", "Data Dragons",
  "Echo Squad", "Flux Capacitors", "Gamma Rays", "Hyper Threads",
  "Ion Storm", "Jolt Riders",
]

const SUBMISSION_DATA = [
  { title: "AI Research Assistant", desc: "An AI-powered research tool that synthesizes academic papers" },
  { title: "Code Reviewer Bot", desc: "Automated code review with context-aware suggestions" },
  { title: "DataViz Agent", desc: "Natural language to data visualization pipeline" },
  { title: "HealthCheck AI", desc: "Predictive health monitoring dashboard using wearable data" },
  { title: "EcoTracker", desc: "Carbon footprint tracking with AI-driven recommendations" },
  { title: "SmartMentor", desc: "Personalized learning paths powered by LLMs" },
  { title: "SupplyChain Oracle", desc: "Real-time supply chain optimization with AI forecasting" },
  { title: "SoundScape", desc: "AI-generated ambient soundscapes for productivity" },
  { title: "LegalBot", desc: "Contract analysis and clause extraction using NLP" },
  { title: "FarmVision", desc: "Drone-based crop health monitoring with computer vision" },
]

const ROOM_NAMES = ["Room A", "Room B", "Room C", "Room D", "Room E"]

export const devRoutes = new Elysia({ prefix: "/dev" })
  .patch(
    "/hackathons/:id/status",
    async ({ params, body, set }) => {
      const guard = devGuard(set)
      if (guard) return guard

      const { error, tenantId } = await getHackathonTenant(params.id, set)
      if (error) return { error }

      const { updateHackathonSettings } = await import("@/lib/services/public-hackathons")
      const hackathon = await updateHackathonSettings(params.id, tenantId!, { status: body.status })
      if (!hackathon) { set.status = 500; return { error: "Update failed" } }

      return { id: hackathon.id, status: hackathon.status }
    },
    { body: t.Object({ status: HackathonStatusEnum }) }
  )

  .patch(
    "/hackathons/:id/phase",
    async ({ params, body, set }) => {
      const guard = devGuard(set)
      if (guard) return guard

      const db = await getDb()
      const { error } = await db
        .from("hackathons")
        .update({ phase: body.phase })
        .eq("id", params.id)

      if (error) { set.status = 500; return { error: "Update failed" } }
      return { phase: body.phase }
    },
    { body: t.Object({ phase: t.Union([
      t.Literal("build"),
      t.Literal("submission_open"),
      t.Literal("preliminaries"),
      t.Literal("finals"),
      t.Literal("results_pending"),
      t.Null(),
    ]) }) }
  )

  .patch(
    "/hackathons/:id/timeline",
    async ({ params, body, set }) => {
      const guard = devGuard(set)
      if (guard) return guard

      const db = await getDb()
      const updates: Record<string, string | null> = {}
      if (body.startsAt !== undefined) updates.starts_at = body.startsAt
      if (body.endsAt !== undefined) updates.ends_at = body.endsAt
      if (body.registrationOpensAt !== undefined) updates.registration_opens_at = body.registrationOpensAt
      if (body.registrationClosesAt !== undefined) updates.registration_closes_at = body.registrationClosesAt

      const { error } = await db.from("hackathons").update(updates).eq("id", params.id)
      if (error) { set.status = 500; return { error: "Update failed" } }
      return { updated: Object.keys(updates) }
    },
    {
      body: t.Object({
        startsAt: t.Optional(t.Union([t.String(), t.Null()])),
        endsAt: t.Optional(t.Union([t.String(), t.Null()])),
        registrationOpensAt: t.Optional(t.Union([t.String(), t.Null()])),
        registrationClosesAt: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  )

  .post(
    "/hackathons/:id/seed-teams",
    async ({ params, body, set }) => {
      const guard = devGuard(set)
      if (guard) return guard

      const db = await getDb()
      const count = body.count ?? 5
      const teamIds: string[] = []

      await db.from("teams")
        .delete()
        .eq("hackathon_id", params.id)
        .in("captain_clerk_user_id", SEED_USERS)

      for (let i = 0; i < count; i++) {
        const captainId = SEED_USERS[i % SEED_USERS.length]
        const memberId = SEED_USERS[(i + 1) % SEED_USERS.length]

        const captainPid = await ensureParticipant(db, params.id, captainId)
        const memberPid = await ensureParticipant(db, params.id, memberId)

        const { data: team } = await db
          .from("teams")
          .insert({
            hackathon_id: params.id,
            name: TEAM_NAMES[i % TEAM_NAMES.length],
            captain_clerk_user_id: captainId,
            invite_code: crypto.randomUUID().slice(0, 8),
            status: "forming",
          })
          .select("id")
          .single()

        if (!team) continue

        await db.from("hackathon_participants").update({ team_id: team.id }).eq("id", captainPid)
        await db.from("hackathon_participants").update({ team_id: team.id }).eq("id", memberPid)
        teamIds.push(team.id)
      }

      return { seeded: teamIds.length, teamIds }
    },
    { body: t.Object({ count: t.Optional(t.Number({ minimum: 1, maximum: 10 })) }) }
  )

  .post(
    "/hackathons/:id/seed-submissions",
    async ({ params, set }) => {
      const guard = devGuard(set)
      if (guard) return guard

      const db = await getDb()
      const { data: teams } = await db
        .from("teams")
        .select("id, captain_clerk_user_id")
        .eq("hackathon_id", params.id)
        .neq("status", "disbanded")

      if (!teams?.length) { set.status = 400; return { error: "No teams to create submissions for" } }

      const submissionIds: string[] = []
      for (let i = 0; i < teams.length; i++) {
        const team = teams[i]
        const { data: participant } = await db
          .from("hackathon_participants")
          .select("id")
          .eq("hackathon_id", params.id)
          .eq("team_id", team.id)
          .limit(1)
          .single()

        if (!participant) continue

        const template = SUBMISSION_DATA[i % SUBMISSION_DATA.length]
        const { data: sub } = await db
          .from("submissions")
          .insert({
            hackathon_id: params.id,
            team_id: team.id,
            participant_id: participant.id,
            title: template.title,
            description: template.desc,
            github_url: `https://github.com/example/${template.title.toLowerCase().replace(/\s+/g, "-")}`,
            status: "submitted",
          })
          .select("id")
          .single()

        if (sub) submissionIds.push(sub.id)
      }

      return { seeded: submissionIds.length }
    },
  )

  .post(
    "/hackathons/:id/seed-rooms",
    async ({ params, body, set }) => {
      const guard = devGuard(set)
      if (guard) return guard

      const db = await getDb()
      const count = body.count ?? 3
      const roomIds: string[] = []

      for (let i = 0; i < count; i++) {
        const { data: room } = await db
          .from("rooms")
          .insert({
            hackathon_id: params.id,
            name: ROOM_NAMES[i % ROOM_NAMES.length],
            display_order: i,
          })
          .select("id")
          .single()

        if (room) roomIds.push(room.id)
      }

      if (body.assignTeams) {
        const { data: teams } = await db
          .from("teams")
          .select("id")
          .eq("hackathon_id", params.id)
          .neq("status", "disbanded")

        if (teams?.length) {
          for (let i = 0; i < teams.length; i++) {
            const roomId = roomIds[i % roomIds.length]
            await db.from("room_teams").insert({
              room_id: roomId,
              team_id: teams[i].id,
              present_order: i,
            })
          }
        }
      }

      return { seeded: roomIds.length, roomIds }
    },
    { body: t.Object({
      count: t.Optional(t.Number({ minimum: 1, maximum: 5 })),
      assignTeams: t.Optional(t.Boolean()),
    }) }
  )

  .post(
    "/hackathons/:id/seed-judging",
    async ({ params, set }) => {
      const guard = devGuard(set)
      if (guard) return guard

      const db = await getDb()

      const criteria = [
        { name: "Innovation", description: "Novelty and creativity", max_score: 10, weight: 1.5 },
        { name: "Technical Execution", description: "Code quality and architecture", max_score: 10, weight: 1.0 },
        { name: "Presentation", description: "Demo clarity and communication", max_score: 10, weight: 0.5 },
      ]

      const criteriaIds: string[] = []
      for (let i = 0; i < criteria.length; i++) {
        const { data } = await db
          .from("judging_criteria")
          .insert({ hackathon_id: params.id, ...criteria[i], display_order: i })
          .select("id")
          .single()
        if (data) criteriaIds.push(data.id)
      }

      const judgeUserIds = SEED_USERS.slice(0, 3)
      const judgePids: string[] = []
      for (const uid of judgeUserIds) {
        const pid = await ensureParticipant(db, params.id, uid, "judge")
        judgePids.push(pid)
      }

      const { data: submissions } = await db
        .from("submissions")
        .select("id, team_id")
        .eq("hackathon_id", params.id)
        .eq("status", "submitted")

      let assignmentCount = 0
      if (submissions?.length) {
        for (const judgePid of judgePids) {
          for (const sub of submissions) {
            const { data } = await db
              .from("judge_assignments")
              .insert({
                hackathon_id: params.id,
                judge_participant_id: judgePid,
                submission_id: sub.id,
              })
              .select("id")
              .single()
            if (data) assignmentCount++
          }
        }
      }

      return { criteriaCount: criteriaIds.length, judgeCount: judgePids.length, assignmentCount }
    },
  )

  .post(
    "/hackathons/:id/seed-scores",
    async ({ params, body, set }) => {
      const guard = devGuard(set)
      if (guard) return guard

      const db = await getDb()
      const pct = body.percentage ?? 60

      const { data: assignments } = await db
        .from("judge_assignments")
        .select("id")
        .eq("hackathon_id", params.id)
        .eq("is_complete", false)

      if (!assignments?.length) return { scored: 0 }

      const { data: criteriaRows } = await db
        .from("judging_criteria")
        .select("id")
        .eq("hackathon_id", params.id)

      const criteriaIds = criteriaRows?.map((c) => c.id) ?? []
      const toScore = Math.ceil(assignments.length * (pct / 100))
      let scored = 0

      for (let i = 0; i < toScore; i++) {
        const a = assignments[i]
        for (const cId of criteriaIds) {
          await db.from("scores").insert({
            judge_assignment_id: a.id,
            criteria_id: cId,
            score: Math.floor(Math.random() * 8) + 3,
          })
        }
        await db
          .from("judge_assignments")
          .update({ is_complete: true, completed_at: new Date().toISOString() })
          .eq("id", a.id)
        scored++
      }

      return { scored, total: assignments.length }
    },
    { body: t.Object({ percentage: t.Optional(t.Number({ minimum: 1, maximum: 100 })) }) }
  )

  .post(
    "/hackathons/:id/seed-challenge",
    async ({ params, set }) => {
      const guard = devGuard(set)
      if (guard) return guard

      const db = await getDb()
      const { error } = await db
        .from("hackathons")
        .update({
          challenge_title: "Build an AI Agent That Solves a Real Problem",
          challenge_body: "Create an AI-powered agent that addresses a genuine pain point. Your solution should demonstrate autonomous decision-making, tool usage, and real-world applicability. Bonus points for creative use of MCP, multi-modal inputs, or novel agentic patterns.",
          challenge_released_at: new Date().toISOString(),
        })
        .eq("id", params.id)

      if (error) { set.status = 500; return { error: "Failed" } }
      return { released: true }
    },
  )

  .post(
    "/hackathons/:id/seed-mentors",
    async ({ params, set }) => {
      const guard = devGuard(set)
      if (guard) return guard

      const db = await getDb()
      const categories = ["Frontend", "Backend", "AI/ML", "Design", "Deployment"]
      const descriptions = [
        "Need help with React state management",
        "Database schema design question",
        "How to fine-tune a model for our use case?",
        "UI/UX feedback on our prototype",
        "Struggling with Docker deployment",
      ]

      let created = 0
      for (let i = 0; i < 5; i++) {
        const pid = await ensureParticipant(db, params.id, SEED_USERS[i % SEED_USERS.length])
        const { data: team } = await db
          .from("hackathon_participants")
          .select("team_id")
          .eq("id", pid)
          .single()

        const statuses = ["open", "open", "open", "claimed", "resolved"] as const
        const { error } = await db.from("mentor_requests").insert({
          hackathon_id: params.id,
          requester_participant_id: pid,
          team_id: team?.team_id ?? null,
          category: categories[i],
          description: descriptions[i],
          status: statuses[i],
        })

        if (!error) created++
      }

      return { seeded: created }
    },
  )

  .post(
    "/hackathons/:id/seed-all",
    async ({ params, set }) => {
      const guard = devGuard(set)
      if (guard) return guard

      const db = await getDb()
      const { error, tenantId } = await getHackathonTenant(params.id, set)
      if (error) return { error }

      const { updateHackathonSettings } = await import("@/lib/services/public-hackathons")
      await updateHackathonSettings(params.id, tenantId!, { status: "active" })
      await db.from("hackathons").update({ phase: "build" }).eq("id", params.id)

      const now = new Date()
      await db.from("hackathons").update({
        starts_at: new Date(now.getTime() - 2 * 3600000).toISOString(),
        ends_at: new Date(now.getTime() + 6 * 3600000).toISOString(),
        registration_opens_at: new Date(now.getTime() - 7 * 86400000).toISOString(),
        registration_closes_at: new Date(now.getTime() - 2 * 3600000).toISOString(),
      }).eq("id", params.id)

      await db.from("teams")
        .delete()
        .eq("hackathon_id", params.id)
        .in("captain_clerk_user_id", SEED_USERS)

      const teamIds: string[] = []
      for (let i = 0; i < 5; i++) {
        const captainId = SEED_USERS[i * 2 % SEED_USERS.length]
        const memberId = SEED_USERS[(i * 2 + 1) % SEED_USERS.length]
        const captainPid = await ensureParticipant(db, params.id, captainId)
        const memberPid = await ensureParticipant(db, params.id, memberId)

        const { data: team } = await db
          .from("teams")
          .insert({
            hackathon_id: params.id,
            name: TEAM_NAMES[i],
            captain_clerk_user_id: captainId,
            invite_code: crypto.randomUUID().slice(0, 8),
            status: "forming",
          })
          .select("id")
          .single()

        if (!team) continue
        await db.from("hackathon_participants").update({ team_id: team.id }).eq("id", captainPid)
        await db.from("hackathon_participants").update({ team_id: team.id }).eq("id", memberPid)
        teamIds.push(team.id)
      }

      for (let i = 0; i < teamIds.length; i++) {
        const { data: participant } = await db
          .from("hackathon_participants")
          .select("id")
          .eq("hackathon_id", params.id)
          .eq("team_id", teamIds[i])
          .limit(1)
          .single()
        if (!participant) continue

        const t = SUBMISSION_DATA[i % SUBMISSION_DATA.length]
        await db.from("submissions").insert({
          hackathon_id: params.id,
          team_id: teamIds[i],
          participant_id: participant.id,
          title: t.title,
          description: t.desc,
          status: "submitted",
        })
      }

      const prizeData = [
        { name: "Best Overall", description: "Awarded to the top-scoring team overall", value: "$500", type: "score" as const, rank: 1, display_order: 0 },
        { name: "Most Innovative", description: "Awarded for the most creative and novel solution", value: "$250", type: "criteria" as const, rank: null, display_order: 1 },
        { name: "People's Choice", description: "Voted by the crowd", value: "$100", type: "crowd" as const, rank: null, display_order: 2 },
      ]
      let prizesSeeded = 0
      for (const p of prizeData) {
        const { error: pErr } = await db.from("prizes").insert({
          hackathon_id: params.id,
          name: p.name,
          description: p.description,
          value: p.value,
          type: p.type,
          rank: p.rank,
          display_order: p.display_order,
        })
        if (!pErr) prizesSeeded++
      }

      const roomIds: string[] = []
      for (let i = 0; i < 3; i++) {
        const { data: room } = await db
          .from("rooms")
          .insert({ hackathon_id: params.id, name: ROOM_NAMES[i], display_order: i })
          .select("id")
          .single()
        if (room) roomIds.push(room.id)
      }
      for (let i = 0; i < teamIds.length; i++) {
        await db.from("room_teams").insert({
          room_id: roomIds[i % roomIds.length],
          team_id: teamIds[i],
          present_order: i,
        })
      }

      await db.from("hackathons").update({
        challenge_title: "Build an AI Agent That Solves a Real Problem",
        challenge_released_at: new Date().toISOString(),
      }).eq("id", params.id)

      return { teams: teamIds.length, prizes: prizesSeeded, rooms: roomIds.length, message: "Full seed complete" }
    },
  )

  .post(
    "/hackathons/:id/seed-prizes",
    async ({ params, set }) => {
      const guard = devGuard(set)
      if (guard) return guard

      const db = await getDb()
      const prizes: { name: string; description: string; value: string; type: "score" | "criteria" | "crowd" | "favorite"; rank: number | null; display_order: number }[] = [
        { name: "Best Overall", description: "Top scoring project across all criteria", value: "$500", type: "score", rank: 1, display_order: 0 },
        { name: "Most Innovative", description: "Most creative and novel approach", value: "$250", type: "criteria", rank: null, display_order: 1 },
        { name: "People's Choice", description: "Audience favorite", value: "$100", type: "crowd", rank: null, display_order: 2 },
      ]

      let seeded = 0
      for (const p of prizes) {
        const { error } = await db.from("prizes").insert({ hackathon_id: params.id, ...p })
        if (!error) seeded++
      }
      return { seeded }
    },
  )

  .post(
    "/hackathons/:id/seed-categories",
    async ({ params, set }) => {
      const guard = devGuard(set)
      if (guard) return guard

      const db = await getDb()
      const categories = [
        { name: "AI/ML", description: "Artificial intelligence and machine learning projects" },
        { name: "Web3", description: "Blockchain, DeFi, and decentralized applications" },
        { name: "Social Impact", description: "Projects addressing social or environmental challenges" },
      ]

      let seeded = 0
      for (let i = 0; i < categories.length; i++) {
        const { error } = await db.from("submission_categories").insert({
          hackathon_id: params.id,
          ...categories[i],
          display_order: i,
        })
        if (!error) seeded++
      }
      return { seeded }
    },
  )

  .post(
    "/hackathons/:id/seed-social",
    async ({ params, set }) => {
      const guard = devGuard(set)
      if (guard) return guard

      const db = await getDb()
      const socialPosts = [
        { url: "https://twitter.com/team_alpha/status/1234567890", platform: "twitter", og_title: "Check out our AI Research Assistant!", status: "approved" as const },
        { url: "https://linkedin.com/posts/binary-stars-demo-2026", platform: "linkedin", og_title: "Excited to share our hackathon project", status: "approved" as const },
        { url: "https://twitter.com/circuit_breakers/status/9876543210", platform: "twitter", og_title: "Live demo of our Code Reviewer Bot", status: "pending" as const },
        { url: "https://instagram.com/p/datadragons_hack2026", platform: "instagram", og_title: "Behind the scenes at the hackathon", status: "pending" as const },
        { url: "https://twitter.com/echo_squad_dev/status/5555555555", platform: "twitter", og_title: "Our EcoTracker just went live!", status: "rejected" as const },
      ]

      let seeded = 0
      const { data: participants } = await db
        .from("hackathon_participants")
        .select("id, team_id")
        .eq("hackathon_id", params.id)
        .limit(5)

      if (!participants?.length) return { seeded: 0, error: "No participants found" }

      for (let i = 0; i < socialPosts.length; i++) {
        const p = participants[i % participants.length]
        const { error } = await db.from("social_media_submissions").insert({
          hackathon_id: params.id,
          participant_id: p.id,
          team_id: p.team_id,
          ...socialPosts[i],
        })
        if (!error) seeded++
      }
      return { seeded }
    },
  )

  .post(
    "/hackathons/:id/calculate-results",
    async ({ params, set }) => {
      const guard = devGuard(set)
      if (guard) return guard

      const { calculateResults } = await import("@/lib/services/results")
      return await calculateResults(params.id)
    },
  )

  .post(
    "/hackathons/:id/publish-results",
    async ({ params, set }) => {
      const guard = devGuard(set)
      if (guard) return guard

      const { error, tenantId } = await getHackathonTenant(params.id, set)
      if (error) return { error }

      const { publishResults } = await import("@/lib/services/results")
      return await publishResults(params.id, tenantId!)
    },
  )

  .delete(
    "/hackathons/:id/seed-data",
    async ({ params, set }) => {
      const guard = devGuard(set)
      if (guard) return guard

      const db = await getDb()
      await db.from("mentor_requests").delete().eq("hackathon_id", params.id)
      await db.from("social_media_submissions").delete().eq("hackathon_id", params.id)
      await db.from("hackathon_results").delete().eq("hackathon_id", params.id)
      await db.from("prize_assignments").delete().in(
        "prize_id",
        db.from("prizes").select("id").eq("hackathon_id", params.id) as unknown as string[]
      )
      await db.from("prizes").delete().eq("hackathon_id", params.id)
      await db.from("submission_category_entries").delete().in(
        "category_id",
        db.from("submission_categories").select("id").eq("hackathon_id", params.id) as unknown as string[]
      )
      await db.from("submission_categories").delete().eq("hackathon_id", params.id)
      await db.from("scores").delete().in(
        "judge_assignment_id",
        db.from("judge_assignments").select("id").eq("hackathon_id", params.id) as unknown as string[]
      )
      await db.from("judge_assignments").delete().eq("hackathon_id", params.id)
      await db.from("judging_criteria").delete().eq("hackathon_id", params.id)
      await db.from("room_teams").delete().in(
        "room_id",
        db.from("rooms").select("id").eq("hackathon_id", params.id) as unknown as string[]
      )
      await db.from("rooms").delete().eq("hackathon_id", params.id)
      await db.from("submissions").delete().eq("hackathon_id", params.id)
      await db.from("hackathon_participants").delete().eq("hackathon_id", params.id).in("clerk_user_id", SEED_USERS)
      await db.from("teams").delete().eq("hackathon_id", params.id).in("captain_clerk_user_id", SEED_USERS)

      return { cleared: true }
    },
  )

async function ensureParticipant(
  db: Awaited<ReturnType<typeof getDb>>,
  hackathonId: string,
  clerkUserId: string,
  role: "participant" | "judge" = "participant",
): Promise<string> {
  const { data: existing } = await db
    .from("hackathon_participants")
    .select("id")
    .eq("hackathon_id", hackathonId)
    .eq("clerk_user_id", clerkUserId)
    .single()

  if (existing) return existing.id

  const { data } = await db
    .from("hackathon_participants")
    .insert({ hackathon_id: hackathonId, clerk_user_id: clerkUserId, role })
    .select("id")
    .single()

  return data?.id ?? ""
}
