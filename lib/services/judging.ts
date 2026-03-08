import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { JudgingCriteria, JudgeAssignment } from "@/lib/db/hackathon-types"

export type CreateCriteriaInput = {
  name: string
  description?: string | null
  maxScore?: number
  weight?: number
  displayOrder?: number
}

export type UpdateCriteriaInput = {
  name?: string
  description?: string | null
  maxScore?: number
  weight?: number
  displayOrder?: number
}

export async function listJudgingCriteria(
  hackathonId: string
): Promise<JudgingCriteria[]> {
  const client = getSupabase() as unknown as SupabaseClient
  const { data, error } = await client
    .from("judging_criteria")
    .select("*")
    .eq("hackathon_id", hackathonId)
    .order("display_order")

  if (error) {
    console.error("Failed to list judging criteria:", error)
    return []
  }

  return data as unknown as JudgingCriteria[]
}

export async function createJudgingCriteria(
  hackathonId: string,
  input: CreateCriteriaInput
): Promise<JudgingCriteria | null> {
  const client = getSupabase() as unknown as SupabaseClient
  const { data, error } = await client
    .from("judging_criteria")
    .insert({
      hackathon_id: hackathonId,
      name: input.name,
      description: input.description ?? null,
      max_score: input.maxScore ?? 10,
      weight: input.weight ?? 1.0,
      display_order: input.displayOrder ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to create judging criteria:", error)
    return null
  }

  return data as unknown as JudgingCriteria
}

export async function updateJudgingCriteria(
  criteriaId: string,
  hackathonId: string,
  input: UpdateCriteriaInput
): Promise<JudgingCriteria | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description
  if (input.maxScore !== undefined) updates.max_score = input.maxScore
  if (input.weight !== undefined) updates.weight = input.weight
  if (input.displayOrder !== undefined) updates.display_order = input.displayOrder
  updates.updated_at = new Date().toISOString()

  const { data, error } = await client
    .from("judging_criteria")
    .update(updates)
    .eq("id", criteriaId)
    .eq("hackathon_id", hackathonId)
    .select()
    .single()

  if (error) {
    console.error("Failed to update judging criteria:", error)
    return null
  }

  return data as unknown as JudgingCriteria
}

export async function deleteJudgingCriteria(
  criteriaId: string,
  hackathonId: string
): Promise<boolean> {
  const client = getSupabase() as unknown as SupabaseClient
  const { error } = await client
    .from("judging_criteria")
    .delete()
    .eq("id", criteriaId)
    .eq("hackathon_id", hackathonId)

  if (error) {
    console.error("Failed to delete judging criteria:", error)
    return false
  }

  return true
}

export type AddJudgeResult =
  | { success: true; participant: { id: string; clerkUserId: string } }
  | { success: false; error: string; code: string }

export async function addJudge(
  hackathonId: string,
  clerkUserId: string
): Promise<AddJudgeResult> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: existing } = await client
    .from("hackathon_participants")
    .select("id, role")
    .eq("hackathon_id", hackathonId)
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle()

  if (existing) {
    if (existing.role === "judge") {
      return { success: false, error: "Already registered as a judge", code: "already_judge" }
    }

    const { data: updated, error: updateError } = await client
      .from("hackathon_participants")
      .update({ role: "judge" })
      .eq("id", existing.id)
      .select()
      .single()

    if (updateError) {
      console.error("Failed to update participant role:", updateError)
      return { success: false, error: "Failed to update role", code: "update_failed" }
    }

    return { success: true, participant: { id: updated.id, clerkUserId } }
  }

  const { data: participant, error: insertError } = await client
    .from("hackathon_participants")
    .insert({
      hackathon_id: hackathonId,
      clerk_user_id: clerkUserId,
      role: "judge",
    })
    .select()
    .single()

  if (insertError) {
    console.error("Failed to add judge:", insertError)
    return { success: false, error: "Failed to add judge", code: "insert_failed" }
  }

  return { success: true, participant: { id: participant.id, clerkUserId } }
}

export type JudgeInfo = {
  participantId: string
  clerkUserId: string
  displayName: string
  email: string | null
  imageUrl: string | null
  assignmentCount: number
  completedCount: number
}

export async function listJudges(hackathonId: string): Promise<JudgeInfo[]> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: judges, error } = await client
    .from("hackathon_participants")
    .select("id, clerk_user_id")
    .eq("hackathon_id", hackathonId)
    .eq("role", "judge")

  if (error || !judges) {
    console.error("Failed to list judges:", error)
    return []
  }

  if (judges.length === 0) return []

  const judgeIds = judges.map((j) => j.id)

  const { data: assignments } = await client
    .from("judge_assignments")
    .select("judge_participant_id, is_complete")
    .eq("hackathon_id", hackathonId)
    .in("judge_participant_id", judgeIds)

  const countMap: Record<string, { total: number; completed: number }> = {}
  for (const a of assignments ?? []) {
    if (!countMap[a.judge_participant_id]) {
      countMap[a.judge_participant_id] = { total: 0, completed: 0 }
    }
    countMap[a.judge_participant_id].total++
    if (a.is_complete) countMap[a.judge_participant_id].completed++
  }

  const userMap: Record<string, { displayName: string; email: string | null; imageUrl: string | null }> = {}
  try {
    const { clerkClient } = await import("@clerk/nextjs/server")
    const client = await clerkClient()
    const clerkUserIds = judges.map((j) => j.clerk_user_id)
    const clerkUsers = await client.users.getUserList({ userId: clerkUserIds, limit: 100 })
    for (const u of clerkUsers.data) {
      const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.id
      userMap[u.id] = {
        displayName: name,
        email: u.primaryEmailAddress?.emailAddress ?? null,
        imageUrl: u.imageUrl ?? null,
      }
    }
  } catch (err) {
    console.error("Failed to fetch Clerk users for judges:", err)
  }

  return judges.map((j) => ({
    participantId: j.id,
    clerkUserId: j.clerk_user_id,
    displayName: userMap[j.clerk_user_id]?.displayName ?? j.clerk_user_id,
    email: userMap[j.clerk_user_id]?.email ?? null,
    imageUrl: userMap[j.clerk_user_id]?.imageUrl ?? null,
    assignmentCount: countMap[j.id]?.total ?? 0,
    completedCount: countMap[j.id]?.completed ?? 0,
  }))
}

export type RemoveJudgeResult = {
  success: boolean
  resultsStale?: boolean
}

export async function removeJudge(
  hackathonId: string,
  judgeParticipantId: string
): Promise<RemoveJudgeResult> {
  const client = getSupabase() as unknown as SupabaseClient

  const { error: assignmentError } = await client
    .from("judge_assignments")
    .delete()
    .eq("hackathon_id", hackathonId)
    .eq("judge_participant_id", judgeParticipantId)

  if (assignmentError) {
    console.error("Failed to remove judge assignments:", assignmentError)
    return { success: false }
  }

  const { error } = await client
    .from("hackathon_participants")
    .delete()
    .eq("id", judgeParticipantId)
    .eq("hackathon_id", hackathonId)
    .eq("role", "judge")

  if (error) {
    console.error("Failed to remove judge:", error)
    return { success: false }
  }

  const { data: existingResults } = await client
    .from("hackathon_results")
    .select("id")
    .eq("hackathon_id", hackathonId)
    .limit(1)

  const resultsStale = (existingResults?.length ?? 0) > 0
  if (resultsStale) {
    console.warn(`Judge removed from hackathon ${hackathonId} — existing results may be stale`)
  }

  return { success: true, resultsStale }
}

export type AssignmentWithDetails = JudgeAssignment & {
  judgeName: string
  judgeEmail: string | null
  submissionTitle: string
}

export async function listJudgeAssignments(
  hackathonId: string
): Promise<AssignmentWithDetails[]> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: assignments, error } = await client
    .from("judge_assignments")
    .select(`
      *,
      judge:hackathon_participants!judge_participant_id(clerk_user_id),
      submission:submissions!submission_id(title)
    `)
    .eq("hackathon_id", hackathonId)
    .order("assigned_at")

  if (error || !assignments) {
    console.error("Failed to list judge assignments:", error)
    return []
  }

  const clerkUserIds = [
    ...new Set(
      assignments
        .map((a: Record<string, unknown>) => {
          const judge = a.judge as unknown as { clerk_user_id: string } | null
          return judge?.clerk_user_id
        })
        .filter(Boolean) as string[]
    ),
  ]

  const userMap: Record<string, { displayName: string; email: string | null }> = {}
  if (clerkUserIds.length > 0) {
    try {
      const { clerkClient } = await import("@clerk/nextjs/server")
      const clerk = await clerkClient()
      const clerkUsers = await clerk.users.getUserList({ userId: clerkUserIds, limit: 100 })
      for (const u of clerkUsers.data) {
        const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.id
        userMap[u.id] = {
          displayName: name,
          email: u.primaryEmailAddress?.emailAddress ?? null,
        }
      }
    } catch (err) {
      console.error("Failed to fetch Clerk users for assignments:", err)
    }
  }

  return assignments.map((a: Record<string, unknown>) => {
    const judge = a.judge as unknown as { clerk_user_id: string } | null
    const submission = a.submission as unknown as { title: string } | null
    const clerkUserId = judge?.clerk_user_id
    return {
      ...(a as unknown as JudgeAssignment),
      judgeName: clerkUserId ? (userMap[clerkUserId]?.displayName ?? clerkUserId) : "Unknown",
      judgeEmail: clerkUserId ? (userMap[clerkUserId]?.email ?? null) : null,
      submissionTitle: submission?.title ?? "Unknown",
    }
  })
}

export type AssignJudgeResult =
  | { success: true; assignment: JudgeAssignment }
  | { success: false; error: string; code: string }

export async function assignJudgeToSubmission(
  hackathonId: string,
  judgeParticipantId: string,
  submissionId: string
): Promise<AssignJudgeResult> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: judge } = await client
    .from("hackathon_participants")
    .select("id, team_id")
    .eq("id", judgeParticipantId)
    .eq("hackathon_id", hackathonId)
    .eq("role", "judge")
    .single()

  if (!judge) {
    return { success: false, error: "Judge not found", code: "judge_not_found" }
  }

  const { data: submission } = await client
    .from("submissions")
    .select("id, team_id")
    .eq("id", submissionId)
    .eq("hackathon_id", hackathonId)
    .single()

  if (!submission) {
    return { success: false, error: "Submission not found", code: "submission_not_found" }
  }

  if (judge.team_id && submission.team_id && judge.team_id === submission.team_id) {
    return { success: false, error: "Cannot assign judge to their own team's submission", code: "conflict_of_interest" }
  }

  const { data: assignment, error } = await client
    .from("judge_assignments")
    .insert({
      hackathon_id: hackathonId,
      judge_participant_id: judgeParticipantId,
      submission_id: submissionId,
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Judge already assigned to this submission", code: "already_assigned" }
    }
    console.error("Failed to assign judge:", error)
    return { success: false, error: "Failed to assign judge", code: "insert_failed" }
  }

  return { success: true, assignment: assignment as unknown as JudgeAssignment }
}

export async function removeJudgeAssignment(assignmentId: string): Promise<boolean> {
  const client = getSupabase() as unknown as SupabaseClient
  const { error } = await client
    .from("judge_assignments")
    .delete()
    .eq("id", assignmentId)

  if (error) {
    console.error("Failed to remove assignment:", error)
    return false
  }

  return true
}

export async function autoAssignJudges(
  hackathonId: string,
  submissionsPerJudge: number
): Promise<{ assignedCount: number }> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: judges } = await client
    .from("hackathon_participants")
    .select("id, team_id")
    .eq("hackathon_id", hackathonId)
    .eq("role", "judge")

  if (!judges || judges.length === 0) return { assignedCount: 0 }

  const { data: submissions } = await client
    .from("submissions")
    .select("id, team_id")
    .eq("hackathon_id", hackathonId)
    .eq("status", "submitted")

  if (!submissions || submissions.length === 0) return { assignedCount: 0 }

  const { data: existing } = await client
    .from("judge_assignments")
    .select("judge_participant_id, submission_id")
    .eq("hackathon_id", hackathonId)

  const existingSet = new Set(
    (existing ?? []).map((e) => `${e.judge_participant_id}:${e.submission_id}`)
  )

  const newAssignments: { hackathon_id: string; judge_participant_id: string; submission_id: string }[] = []

  const judgeAssignmentCounts: Record<string, number> = {}
  for (const e of existing ?? []) {
    judgeAssignmentCounts[e.judge_participant_id] = (judgeAssignmentCounts[e.judge_participant_id] ?? 0) + 1
  }

  const submissionAssignmentCounts: Record<string, number> = {}
  for (const e of existing ?? []) {
    submissionAssignmentCounts[e.submission_id] = (submissionAssignmentCounts[e.submission_id] ?? 0) + 1
  }

  let changed = true
  while (changed) {
    changed = false

    const sortedSubmissions = [...submissions].sort(
      (a, b) => (submissionAssignmentCounts[a.id] ?? 0) - (submissionAssignmentCounts[b.id] ?? 0)
    )

    for (const sub of sortedSubmissions) {
      const sortedJudges = [...judges].sort(
        (a, b) => (judgeAssignmentCounts[a.id] ?? 0) - (judgeAssignmentCounts[b.id] ?? 0)
      )

      for (const judge of sortedJudges) {
        if ((judgeAssignmentCounts[judge.id] ?? 0) >= submissionsPerJudge) continue
        if (judge.team_id && sub.team_id && judge.team_id === sub.team_id) continue
        const key = `${judge.id}:${sub.id}`
        if (existingSet.has(key)) continue

        newAssignments.push({
          hackathon_id: hackathonId,
          judge_participant_id: judge.id,
          submission_id: sub.id,
        })
        existingSet.add(key)
        judgeAssignmentCounts[judge.id] = (judgeAssignmentCounts[judge.id] ?? 0) + 1
        submissionAssignmentCounts[sub.id] = (submissionAssignmentCounts[sub.id] ?? 0) + 1
        changed = true
        break
      }
    }
  }

  if (newAssignments.length === 0) return { assignedCount: 0 }

  const { error } = await client
    .from("judge_assignments")
    .insert(newAssignments)

  if (error) {
    console.error("Failed to auto-assign judges:", error)
    return { assignedCount: 0 }
  }

  return { assignedCount: newAssignments.length }
}

export type JudgingProgress = {
  totalAssignments: number
  completedAssignments: number
  judges: { participantId: string; clerkUserId: string; displayName: string; completed: number; total: number }[]
}

export async function getJudgingProgress(hackathonId: string): Promise<JudgingProgress> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: assignments } = await client
    .from("judge_assignments")
    .select("judge_participant_id, is_complete")
    .eq("hackathon_id", hackathonId)

  const { data: judges } = await client
    .from("hackathon_participants")
    .select("id, clerk_user_id")
    .eq("hackathon_id", hackathonId)
    .eq("role", "judge")

  const totalAssignments = assignments?.length ?? 0
  const completedAssignments = assignments?.filter((a) => a.is_complete).length ?? 0

  const judgeMap: Record<string, { completed: number; total: number }> = {}
  for (const a of assignments ?? []) {
    if (!judgeMap[a.judge_participant_id]) {
      judgeMap[a.judge_participant_id] = { completed: 0, total: 0 }
    }
    judgeMap[a.judge_participant_id].total++
    if (a.is_complete) judgeMap[a.judge_participant_id].completed++
  }

  const userMap: Record<string, string> = {}
  if (judges && judges.length > 0) {
    try {
      const { clerkClient } = await import("@clerk/nextjs/server")
      const clerk = await clerkClient()
      const clerkUserIds = judges.map((j) => j.clerk_user_id)
      const batchSize = 100
      for (let i = 0; i < clerkUserIds.length; i += batchSize) {
        const batch = clerkUserIds.slice(i, i + batchSize)
        const clerkUsers = await clerk.users.getUserList({ userId: batch, limit: batchSize })
        for (const u of clerkUsers.data) {
          userMap[u.id] = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.id
        }
      }
    } catch (err) {
      console.error("Failed to fetch Clerk users for judging progress:", err)
    }
  }

  return {
    totalAssignments,
    completedAssignments,
    judges: (judges ?? []).map((j) => ({
      participantId: j.id,
      clerkUserId: j.clerk_user_id,
      displayName: userMap[j.clerk_user_id] ?? j.clerk_user_id,
      completed: judgeMap[j.id]?.completed ?? 0,
      total: judgeMap[j.id]?.total ?? 0,
    })),
  }
}

export type JudgeAssignmentForJudge = {
  id: string
  submissionId: string
  submissionTitle: string
  submissionDescription: string | null
  submissionGithubUrl: string | null
  submissionLiveAppUrl: string | null
  submissionScreenshotUrl: string | null
  teamName: string | null
  isComplete: boolean
  notes: string
  viewedAt: string | null
}

export async function getJudgeAssignments(
  hackathonId: string,
  clerkUserId: string
): Promise<JudgeAssignmentForJudge[]> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: participant } = await client
    .from("hackathon_participants")
    .select("id")
    .eq("hackathon_id", hackathonId)
    .eq("clerk_user_id", clerkUserId)
    .eq("role", "judge")
    .maybeSingle()

  if (!participant) return []

  const { data: assignments, error } = await client
    .from("judge_assignments")
    .select(`
      id, submission_id, is_complete, notes, viewed_at,
      submission:submissions!submission_id(title, description, github_url, live_app_url, screenshot_url, team_id)
    `)
    .eq("hackathon_id", hackathonId)
    .eq("judge_participant_id", participant.id)
    .order("assigned_at")

  if (error || !assignments) {
    console.error("Failed to get judge assignments:", error)
    return []
  }

  const teamIds = assignments
    .map((a: Record<string, unknown>) => {
      const sub = a.submission as unknown as { team_id: string | null } | null
      return sub?.team_id
    })
    .filter((id): id is string => id !== null)

  let teamsMap: Record<string, string> = {}
  if (teamIds.length > 0) {
    const { data: teams } = await client
      .from("teams")
      .select("id, name")
      .in("id", teamIds)
    teamsMap = Object.fromEntries((teams ?? []).map((t) => [t.id, t.name]))
  }

  return assignments.map((a: Record<string, unknown>) => {
    const sub = a.submission as unknown as {
      title: string
      description: string | null
      github_url: string | null
      live_app_url: string | null
      screenshot_url: string | null
      team_id: string | null
    }
    return {
      id: a.id as string,
      submissionId: a.submission_id as string,
      submissionTitle: sub.title,
      submissionDescription: sub.description,
      submissionGithubUrl: sub.github_url,
      submissionLiveAppUrl: sub.live_app_url,
      submissionScreenshotUrl: sub.screenshot_url,
      teamName: sub.team_id ? teamsMap[sub.team_id] ?? null : null,
      isComplete: a.is_complete as boolean,
      notes: a.notes as string,
      viewedAt: (a.viewed_at as string | null) ?? null,
    }
  })
}

export type AssignmentDetail = {
  id: string
  submissionId: string
  submissionTitle: string
  submissionDescription: string | null
  submissionGithubUrl: string | null
  submissionLiveAppUrl: string | null
  submissionScreenshotUrl: string | null
  teamName: string | null
  isComplete: boolean
  notes: string
  criteria: (JudgingCriteria & { currentScore: number | null })[]
}

export async function getAssignmentDetail(
  assignmentId: string,
  clerkUserId: string
): Promise<AssignmentDetail | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: assignment } = await client
    .from("judge_assignments")
    .select(`
      *,
      judge:hackathon_participants!judge_participant_id(clerk_user_id),
      submission:submissions!submission_id(title, description, github_url, live_app_url, screenshot_url, team_id)
    `)
    .eq("id", assignmentId)
    .single()

  if (!assignment) return null

  const judge = assignment.judge as unknown as { clerk_user_id: string } | null
  if (judge?.clerk_user_id !== clerkUserId) return null

  const criteria = await listJudgingCriteria(assignment.hackathon_id)

  const { data: existingScores } = await client
    .from("scores")
    .select("criteria_id, score")
    .eq("judge_assignment_id", assignmentId)

  const scoreMap: Record<string, number> = {}
  for (const s of existingScores ?? []) {
    scoreMap[s.criteria_id] = s.score
  }

  const sub = assignment.submission as unknown as {
    title: string
    description: string | null
    github_url: string | null
    live_app_url: string | null
    screenshot_url: string | null
    team_id: string | null
  }

  let teamName: string | null = null
  if (sub.team_id) {
    const { data: team } = await client
      .from("teams")
      .select("name")
      .eq("id", sub.team_id)
      .single()
    teamName = team?.name ?? null
  }

  return {
    id: assignment.id,
    submissionId: assignment.submission_id,
    submissionTitle: sub.title,
    submissionDescription: sub.description,
    submissionGithubUrl: sub.github_url,
    submissionLiveAppUrl: sub.live_app_url,
    submissionScreenshotUrl: sub.screenshot_url,
    teamName,
    isComplete: assignment.is_complete,
    notes: assignment.notes,
    criteria: criteria.map((c) => ({
      ...c,
      currentScore: scoreMap[c.id] ?? null,
    })),
  }
}

export type SubmitScoresInput = {
  scores: { criteriaId: string; score: number }[]
  notes?: string
}

export type SubmitScoresResult =
  | { success: true }
  | { success: false; error: string; code: string }

export async function submitScores(
  assignmentId: string,
  clerkUserId: string,
  input: SubmitScoresInput
): Promise<SubmitScoresResult> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: assignment } = await client
    .from("judge_assignments")
    .select("id, judge:hackathon_participants!judge_participant_id(clerk_user_id)")
    .eq("id", assignmentId)
    .single()

  if (!assignment) {
    return { success: false, error: "Assignment not found", code: "assignment_not_found" }
  }

  const judge = assignment.judge as unknown as { clerk_user_id: string } | null
  if (judge?.clerk_user_id !== clerkUserId) {
    return { success: false, error: "Not authorized", code: "not_authorized" }
  }

  const scoresJson = input.scores.map((s) => ({
    criteria_id: s.criteriaId,
    score: s.score,
  }))

  const { data, error } = await client.rpc("submit_scores", {
    p_judge_assignment_id: assignmentId,
    p_scores: scoresJson,
    p_notes: input.notes ?? null,
  })

  if (error) {
    console.error("Failed to submit scores:", error)
    return { success: false, error: "Failed to submit scores", code: "rpc_failed" }
  }

  const result = data?.[0]
  if (!result?.success) {
    return {
      success: false,
      error: result?.error_message || "Failed to submit scores",
      code: result?.error_code || "unknown",
    }
  }

  return { success: true }
}

export async function saveNotes(
  assignmentId: string,
  clerkUserId: string,
  notes: string
): Promise<boolean> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: assignment } = await client
    .from("judge_assignments")
    .select("id, judge:hackathon_participants!judge_participant_id(clerk_user_id)")
    .eq("id", assignmentId)
    .single()

  if (!assignment) return false

  const judge = assignment.judge as unknown as { clerk_user_id: string } | null
  if (judge?.clerk_user_id !== clerkUserId) return false

  const { error } = await client
    .from("judge_assignments")
    .update({ notes })
    .eq("id", assignmentId)

  if (error) {
    console.error("Failed to save notes:", error)
    return false
  }

  return true
}

export async function markAssignmentViewed(
  assignmentId: string,
  clerkUserId: string
): Promise<boolean> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: assignment } = await client
    .from("judge_assignments")
    .select("id, viewed_at, judge:hackathon_participants!judge_participant_id(clerk_user_id)")
    .eq("id", assignmentId)
    .single()

  if (!assignment) return false

  const judge = assignment.judge as unknown as { clerk_user_id: string } | null
  if (judge?.clerk_user_id !== clerkUserId) return false

  if (assignment.viewed_at) return true

  const { error } = await client
    .from("judge_assignments")
    .update({ viewed_at: new Date().toISOString() })
    .eq("id", assignmentId)

  if (error) {
    console.error("Failed to mark assignment viewed:", error)
    return false
  }

  return true
}

export type JudgingSetupStatus = {
  judgeCount: number
  hasUnassignedSubmissions: boolean
}

export async function getJudgingSetupStatus(hackathonId: string): Promise<JudgingSetupStatus> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: judges } = await client
    .from("hackathon_participants")
    .select("id")
    .eq("hackathon_id", hackathonId)
    .eq("role", "judge")

  const judgeCount = judges?.length ?? 0

  const { data: submissions } = await client
    .from("submissions")
    .select("id")
    .eq("hackathon_id", hackathonId)
    .eq("status", "submitted")

  const { data: assignments } = await client
    .from("judge_assignments")
    .select("submission_id")
    .eq("hackathon_id", hackathonId)

  const assignedSubmissionIds = new Set((assignments ?? []).map(a => a.submission_id))
  const hasUnassignedSubmissions = (submissions ?? []).some(s => !assignedSubmissionIds.has(s.id))

  return { judgeCount, hasUnassignedSubmissions }
}
