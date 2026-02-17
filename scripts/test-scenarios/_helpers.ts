import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in environment")
  process.exit(1)
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey)

export const DEV_USER_ID = "user_38vEFI8UesKwM07qIuFNqEzFavS"

export const SEED_USERS = [
  "seed_user_alice_001",
  "seed_user_bob_002",
  "seed_user_carol_003",
  "seed_user_dave_004",
  "seed_user_eve_005",
]

const SUBMISSION_DATA = [
  { title: "AI Research Assistant", desc: "An AI-powered research tool that synthesizes academic papers", github: "https://github.com/example/ai-research" },
  { title: "Code Reviewer Bot", desc: "Automated code review with context-aware suggestions", github: "https://github.com/example/code-reviewer" },
  { title: "DataViz Agent", desc: "Natural language to data visualization pipeline", github: "https://github.com/example/dataviz" },
  { title: "HealthCheck AI", desc: "Predictive health monitoring dashboard using wearable data", github: "https://github.com/example/healthcheck" },
  { title: "EcoTracker", desc: "Carbon footprint tracking with AI-driven recommendations", github: "https://github.com/example/ecotracker" },
]

const CRITERIA_PRESETS = [
  { name: "Innovation", description: "Novelty and creativity of the solution", max_score: 10, weight: 1.5 },
  { name: "Technical Execution", description: "Code quality, architecture, and reliability", max_score: 10, weight: 1.0 },
  { name: "Presentation", description: "Demo clarity, documentation, and communication", max_score: 10, weight: 0.5 },
]

export async function getOrCreateTenant(): Promise<string> {
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("clerk_user_id", DEV_USER_ID)
    .single()

  if (tenant) return tenant.id

  const { data: newTenant, error } = await supabase
    .from("tenants")
    .insert({
      clerk_user_id: DEV_USER_ID,
      name: "Test Organizer",
      slug: "test-org",
    })
    .select("id")
    .single()

  if (error || !newTenant) {
    console.error("Failed to create tenant:", error)
    process.exit(1)
  }

  return newTenant.id
}

export async function createTestHackathon(opts: {
  tenantId: string
  slug: string
  name: string
  status: string
  startsAt: Date
  endsAt: Date
  registrationOpensAt?: Date
  registrationClosesAt?: Date
  anonymousJudging?: boolean
  resultsPublishedAt?: string | null
}): Promise<string> {
  await supabase.from("hackathons").delete().eq("slug", opts.slug)

  const { data, error } = await supabase
    .from("hackathons")
    .insert({
      tenant_id: opts.tenantId,
      name: opts.name,
      slug: opts.slug,
      description: `Test hackathon for the "${opts.slug}" scenario.`,
      status: opts.status,
      starts_at: opts.startsAt.toISOString(),
      ends_at: opts.endsAt.toISOString(),
      registration_opens_at: (opts.registrationOpensAt ?? new Date(Date.now() - 14 * 86400000)).toISOString(),
      registration_closes_at: (opts.registrationClosesAt ?? opts.startsAt).toISOString(),
      min_team_size: 1,
      max_team_size: 4,
      allow_solo: true,
      anonymous_judging: opts.anonymousJudging ?? false,
      results_published_at: opts.resultsPublishedAt ?? null,
    })
    .select("id")
    .single()

  if (error || !data) {
    console.error("Failed to create hackathon:", error)
    process.exit(1)
  }

  return data.id
}

export async function registerParticipant(
  hackathonId: string,
  clerkUserId: string,
  role: "participant" | "judge" = "participant"
): Promise<string> {
  const { data: existing } = await supabase
    .from("hackathon_participants")
    .select("id")
    .eq("hackathon_id", hackathonId)
    .eq("clerk_user_id", clerkUserId)
    .single()

  if (existing) return existing.id

  const { data, error } = await supabase
    .from("hackathon_participants")
    .insert({
      hackathon_id: hackathonId,
      clerk_user_id: clerkUserId,
      role,
    })
    .select("id")
    .single()

  if (error || !data) {
    console.error("Failed to register participant:", error)
    process.exit(1)
  }

  return data.id
}

export async function createTeamWithMembers(
  hackathonId: string,
  captainUserId: string,
  memberUserIds: string[]
): Promise<string> {
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      hackathon_id: hackathonId,
      name: `Team ${captainUserId.slice(-3)}`,
      captain_clerk_user_id: captainUserId,
      invite_code: crypto.randomUUID().slice(0, 8),
      status: "forming",
    })
    .select("id")
    .single()

  if (teamError || !team) {
    console.error("Failed to create team:", teamError)
    process.exit(1)
  }

  const captainParticipantId = await registerParticipant(hackathonId, captainUserId)
  await supabase
    .from("hackathon_participants")
    .update({ team_id: team.id })
    .eq("id", captainParticipantId)

  for (const userId of memberUserIds) {
    const pid = await registerParticipant(hackathonId, userId)
    await supabase
      .from("hackathon_participants")
      .update({ team_id: team.id })
      .eq("id", pid)
  }

  return team.id
}

export async function createSubmission(
  hackathonId: string,
  teamId: string,
  participantId: string,
  index: number = 0
): Promise<string> {
  const template = SUBMISSION_DATA[index % SUBMISSION_DATA.length]

  const { data, error } = await supabase
    .from("submissions")
    .insert({
      hackathon_id: hackathonId,
      team_id: teamId,
      participant_id: participantId,
      title: template.title,
      description: template.desc,
      github_url: template.github,
      live_app_url: `https://${template.title.toLowerCase().replace(/\s+/g, "-")}.example.com`,
      status: "submitted",
    })
    .select("id")
    .single()

  if (error || !data) {
    console.error("Failed to create submission:", error)
    process.exit(1)
  }

  return data.id
}

export async function addJudgingCriteria(hackathonId: string): Promise<string[]> {
  const criteriaIds: string[] = []

  for (let i = 0; i < CRITERIA_PRESETS.length; i++) {
    const c = CRITERIA_PRESETS[i]
    const { data, error } = await supabase
      .from("judging_criteria")
      .insert({
        hackathon_id: hackathonId,
        name: c.name,
        description: c.description,
        max_score: c.max_score,
        weight: c.weight,
        display_order: i,
      })
      .select("id")
      .single()

    if (error || !data) {
      console.error("Failed to create criteria:", error)
      process.exit(1)
    }

    criteriaIds.push(data.id)
  }

  return criteriaIds
}

export async function assignJudges(
  hackathonId: string,
  judgeParticipantIds: string[],
  submissionIds: string[],
  judgeTeamIds: Record<string, string>
): Promise<string[]> {
  const assignmentIds: string[] = []

  for (const judgeId of judgeParticipantIds) {
    const judgeTeamId = judgeTeamIds[judgeId]

    for (const subId of submissionIds) {
      const { data: sub } = await supabase
        .from("submissions")
        .select("team_id")
        .eq("id", subId)
        .single()

      if (sub?.team_id === judgeTeamId) continue

      const { data, error } = await supabase
        .from("judge_assignments")
        .insert({
          hackathon_id: hackathonId,
          judge_participant_id: judgeId,
          submission_id: subId,
        })
        .select("id")
        .single()

      if (error || !data) {
        console.error("Failed to assign judge:", error)
        continue
      }

      assignmentIds.push(data.id)
    }
  }

  return assignmentIds
}

export async function submitRandomScores(
  assignmentId: string,
  criteriaIds: string[]
): Promise<void> {
  for (const criteriaId of criteriaIds) {
    const score = Math.floor(Math.random() * 8) + 3

    await supabase
      .from("scores")
      .insert({
        judge_assignment_id: assignmentId,
        criteria_id: criteriaId,
        score,
      })
  }

  await supabase
    .from("judge_assignments")
    .update({
      is_complete: true,
      completed_at: new Date().toISOString(),
      notes: "Scored via test scenario script.",
    })
    .eq("id", assignmentId)
}

export function printReady(slug: string) {
  console.log(`\nReady: http://localhost:3000/e/${slug}`)
  console.log(`Dashboard: http://localhost:3000/hackathons/<id>/judging\n`)
}
