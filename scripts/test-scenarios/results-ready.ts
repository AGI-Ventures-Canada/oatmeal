import {
  getOrCreateTenant,
  createTestHackathon,
  createTeamWithMembers,
  registerParticipant,
  createSubmission,
  addJudgingCriteria,
  assignJudges,
  submitRandomScores,
  DEV_USER_ID,
  SEED_USERS,
  supabase,
  printReady,
  promptForOptionalTenantId,
} from "./_helpers"

const SLUG = "test-results-ready"

async function run() {
  console.log("Setting up results-ready scenario...")

  const overrideTenantId = await promptForOptionalTenantId()
  const tenantId = await getOrCreateTenant(overrideTenantId)

  const now = new Date()
  const hackathonId = await createTestHackathon({
    tenantId,
    slug: SLUG,
    name: "Results Ready Test",
    status: "judging",
    startsAt: new Date(now.getTime() - 7 * 86400000),
    endsAt: new Date(now.getTime() - 4 * 86400000),
  })

  const teams: string[] = []
  const submissions: string[] = []
  const allUsers = [DEV_USER_ID, ...SEED_USERS]

  for (let i = 0; i < 5; i++) {
    const captain = allUsers[i]
    const teamId = await createTeamWithMembers(hackathonId, captain, [])
    teams.push(teamId)

    const pid = await registerParticipant(hackathonId, captain)
    const subId = await createSubmission(hackathonId, teamId, pid, i)
    submissions.push(subId)
  }

  const judgeUsers = [DEV_USER_ID, SEED_USERS[0], SEED_USERS[1]]
  const judgeParticipantIds: string[] = []
  const judgeTeamIds: Record<string, string> = {}

  for (const userId of judgeUsers) {
    const { data: participant } = await supabase
      .from("hackathon_participants")
      .select("id, team_id")
      .eq("hackathon_id", hackathonId)
      .eq("clerk_user_id", userId)
      .single()

    if (participant) {
      await supabase
        .from("hackathon_participants")
        .update({ role: "judge" })
        .eq("id", participant.id)

      judgeParticipantIds.push(participant.id)
      if (participant.team_id) {
        judgeTeamIds[participant.id] = participant.team_id
      }
    }
  }

  const criteriaIds = await addJudgingCriteria(hackathonId)
  const assignmentIds = await assignJudges(hackathonId, judgeParticipantIds, submissions, judgeTeamIds)

  for (const assignmentId of assignmentIds) {
    await submitRandomScores(assignmentId, criteriaIds)
  }

  await supabase.rpc("calculate_results", { p_hackathon_id: hackathonId })

  const prizes = [
    { name: "Grand Prize", description: "Overall best project", value: "$10,000", display_order: 0 },
    { name: "Runner Up", description: "Second place", value: "$5,000", display_order: 1 },
    { name: "Best Design", description: "Most polished UI/UX", value: "$2,500", display_order: 2 },
  ]

  for (const p of prizes) {
    await supabase.from("prizes").insert({
      hackathon_id: hackathonId,
      ...p,
    })
  }

  console.log(`Created 5 teams, 5 submissions, 3 judges, ${assignmentIds.length} assignments — all scored.`)
  console.log("Results calculated. 3 prizes defined but not yet assigned.")
  console.log("Test: assign prizes to winners, then publish results.")
  printReady(SLUG)
}

run().catch(console.error)
