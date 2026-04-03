import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { HackathonResult } from "@/lib/db/hackathon-types"

export type ResultWithDetails = HackathonResult & {
  submissionTitle: string
  submissionDescription: string | null
  submissionGithubUrl: string | null
  submissionLiveAppUrl: string | null
  submissionScreenshotUrl: string | null
  submissionTeamId: string | null
  teamName: string | null
  prizes: { id: string; name: string; value: string | null }[]
}

export type PublicResultWithDetails = {
  rank: number
  submissionTitle: string
  submissionDescription: string | null
  submissionGithubUrl: string | null
  submissionLiveAppUrl: string | null
  submissionScreenshotUrl: string | null
  teamName: string | null
  members: string[]
  weightedScore: number | null
  judgeCount: number
  prizes: { id: string; name: string; value: string | null }[]
}

export type CalculateResultsResponse =
  | { success: true; count: number }
  | { success: false; error: string; code: string }

export async function calculateResults(
  hackathonId: string
): Promise<CalculateResultsResponse> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: hackathon } = await client
    .from("hackathons")
    .select("judging_mode")
    .eq("id", hackathonId)
    .single()

  if (hackathon?.judging_mode === "subjective") {
    return calculateSubjectiveResults(hackathonId)
  }

  const { data, error } = await client.rpc("calculate_results", {
    p_hackathon_id: hackathonId,
  })

  if (error) {
    console.error("Failed to calculate results:", error)
    return { success: false, error: "Failed to calculate results", code: "rpc_failed" }
  }

  const result = data?.[0]
  if (!result?.success) {
    return {
      success: false,
      error: result?.error_message || "Failed to calculate results",
      code: result?.error_code || "unknown",
    }
  }

  return { success: true, count: result.results_count }
}

async function calculateSubjectiveResults(
  hackathonId: string
): Promise<CalculateResultsResponse> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: picks, error: picksError } = await client
    .from("judge_picks")
    .select("submission_id, prize_id, rank, judge_participant_id")
    .eq("hackathon_id", hackathonId)

  if (picksError) {
    console.error("Failed to get picks for results:", picksError)
    return { success: false, error: "Failed to get picks", code: "query_failed" }
  }

  if (!picks || picks.length === 0) {
    return { success: false, error: "No judge picks found", code: "no_picks" }
  }

  const submissionStats: Record<string, { totalPicks: number; firstPicks: number; totalRank: number }> = {}

  for (const pick of picks) {
    if (!submissionStats[pick.submission_id]) {
      submissionStats[pick.submission_id] = { totalPicks: 0, firstPicks: 0, totalRank: 0 }
    }
    submissionStats[pick.submission_id].totalPicks++
    if (pick.rank === 1) submissionStats[pick.submission_id].firstPicks++
    submissionStats[pick.submission_id].totalRank += pick.rank
  }

  const uniqueJudges = new Set(picks.map((p) => p.judge_participant_id)).size

  const ranked = Object.entries(submissionStats)
    .sort(([, a], [, b]) => {
      if (b.firstPicks !== a.firstPicks) return b.firstPicks - a.firstPicks
      const avgA = a.totalRank / a.totalPicks
      const avgB = b.totalRank / b.totalPicks
      return avgA - avgB
    })

  await client.from("hackathon_results").delete().eq("hackathon_id", hackathonId)

  const results = ranked.map(([submissionId, stats], index) => ({
    hackathon_id: hackathonId,
    submission_id: submissionId,
    rank: index + 1,
    total_score: stats.firstPicks,
    weighted_score: stats.totalPicks > 0 ? stats.firstPicks / stats.totalPicks : 0,
    judge_count: uniqueJudges,
  }))

  const { error: insertError } = await client
    .from("hackathon_results")
    .insert(results)

  if (insertError) {
    console.error("Failed to insert subjective results:", insertError)
    return { success: false, error: "Failed to save results", code: "insert_failed" }
  }

  return { success: true, count: results.length }
}

export async function getResults(hackathonId: string): Promise<ResultWithDetails[]> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: results, error } = await client
    .from("hackathon_results")
    .select(`
      *,
      submission:submissions!submission_id(title, description, github_url, live_app_url, screenshot_url, team_id)
    `)
    .eq("hackathon_id", hackathonId)
    .order("rank")

  if (error || !results) {
    console.error("Failed to get results:", error)
    return []
  }

  const teamIds = results
    .map((r: Record<string, unknown>) => {
      const sub = r.submission as unknown as { team_id: string | null } | null
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

  const submissionIds = results.map((r) => r.submission_id)
  const { data: prizeAssignments } = await client
    .from("prize_assignments")
    .select(`
      submission_id,
      prize:prizes!prize_id(id, name, value)
    `)
    .in("submission_id", submissionIds)

  const prizeMap: Record<string, { id: string; name: string; value: string | null }[]> = {}
  for (const pa of prizeAssignments ?? []) {
    const prize = (pa as Record<string, unknown>).prize as unknown as { id: string; name: string; value: string | null } | null
    if (!prize) continue
    if (!prizeMap[pa.submission_id]) prizeMap[pa.submission_id] = []
    prizeMap[pa.submission_id].push(prize)
  }

  return results.map((r: Record<string, unknown>) => {
    const sub = r.submission as unknown as {
      title: string
      description: string | null
      github_url: string | null
      live_app_url: string | null
      screenshot_url: string | null
      team_id: string | null
    }
    return {
      ...(r as unknown as HackathonResult),
      submissionTitle: sub.title,
      submissionDescription: sub.description,
      submissionGithubUrl: sub.github_url,
      submissionLiveAppUrl: sub.live_app_url,
      submissionScreenshotUrl: sub.screenshot_url,
      submissionTeamId: sub.team_id,
      teamName: sub.team_id ? teamsMap[sub.team_id] ?? null : null,
      prizes: prizeMap[r.submission_id as string] ?? [],
    }
  })
}

export async function publishResults(
  hackathonId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: hackathon } = await client
    .from("hackathons")
    .select("id, status, tenant_id, winner_emails_sent_at")
    .eq("id", hackathonId)
    .eq("tenant_id", tenantId)
    .single()

  if (!hackathon) {
    return { success: false, error: "Hackathon not found" }
  }

  const { data: results } = await client
    .from("hackathon_results")
    .select("id")
    .eq("hackathon_id", hackathonId)
    .limit(1)

  if (!results || results.length === 0) {
    return { success: false, error: "No results calculated yet. Calculate results first." }
  }

  const now = new Date().toISOString()

  const { data: existing } = await client
    .from("hackathons")
    .select("results_published_at")
    .eq("id", hackathonId)
    .eq("tenant_id", tenantId)
    .single()

  if (existing?.results_published_at) {
    return { success: false, error: "Results are already published" }
  }

  const { error: tsError } = await client
    .from("hackathons")
    .update({ results_published_at: now, updated_at: now })
    .eq("id", hackathonId)
    .eq("tenant_id", tenantId)

  if (tsError) {
    return { success: false, error: "Failed to update published timestamp" }
  }

  const { error: updateError } = await client
    .from("hackathon_results")
    .update({ published_at: now })
    .eq("hackathon_id", hackathonId)

  if (updateError) {
    console.error("Failed to update results published_at:", updateError)
  }

  const currentStatus = hackathon.status as string
  if (currentStatus !== "completed") {
    const { executeTransition } = await import("@/lib/services/lifecycle")
    const transitionResult = await executeTransition({
      hackathonId,
      tenantId,
      fromStatus: currentStatus as import("@/lib/db/hackathon-types").HackathonStatus,
      toStatus: "completed",
      trigger: "manual",
      triggeredBy: "system",
    })
    if (!transitionResult.success) {
      console.error("Lifecycle transition to completed failed:", transitionResult.error)
    }
  }

  if (!hackathon.winner_emails_sent_at) {
    try {
      const { sendWinnerEmails } = await import("@/lib/email/winner-notifications")
      const sentCount = await sendWinnerEmails(hackathonId)
      if (sentCount > 0) {
        await client
          .from("hackathons")
          .update({ winner_emails_sent_at: new Date().toISOString() })
          .eq("id", hackathonId)
      }
    } catch (err) {
      console.error("Failed to send winner emails (non-blocking):", err)
    }
  }

  try {
    const { sendResultsAnnouncementEmails } = await import("@/lib/email/results-announcement")
    await sendResultsAnnouncementEmails(hackathonId)
  } catch (err) {
    console.error("Failed to send results announcement (non-blocking):", err)
  }

  try {
    const { initializeFulfillments } = await import("@/lib/services/prize-fulfillment")
    await initializeFulfillments(hackathonId)
  } catch (err) {
    console.error("Failed to initialize fulfillments (non-blocking):", err)
  }

  try {
    const { schedulePostEventReminders } = await import("@/lib/services/post-event-reminders")
    await schedulePostEventReminders(hackathonId)
  } catch (err) {
    console.error("Failed to schedule post-event reminders (non-blocking):", err)
  }

  return { success: true }
}

export async function unpublishResults(
  hackathonId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase() as unknown as SupabaseClient

  const { error: resultsError } = await client
    .from("hackathon_results")
    .update({ published_at: null })
    .eq("hackathon_id", hackathonId)

  if (resultsError) {
    console.error("Failed to unpublish results:", resultsError)
    return { success: false, error: "Failed to unpublish results" }
  }

  const { error: hackathonError } = await client
    .from("hackathons")
    .update({
      results_published_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", hackathonId)
    .eq("tenant_id", tenantId)

  if (hackathonError) {
    console.error("Failed to update hackathon:", hackathonError)
    return { success: false, error: "Failed to update hackathon" }
  }

  const { data: hackathon } = await client
    .from("hackathons")
    .select("status")
    .eq("id", hackathonId)
    .single()

  if (hackathon?.status === "completed") {
    const { executeTransition } = await import("@/lib/services/lifecycle")
    const transitionResult = await executeTransition({
      hackathonId,
      tenantId,
      fromStatus: "completed",
      toStatus: "judging" as import("@/lib/db/hackathon-types").HackathonStatus,
      trigger: "manual",
      triggeredBy: "system",
    })
    if (!transitionResult.success) {
      console.error("Lifecycle transition to judging failed:", transitionResult.error)
    }
  }

  return { success: true }
}

export async function getPublicResults(
  hackathonId: string
): Promise<ResultWithDetails[] | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: hackathon } = await client
    .from("hackathons")
    .select("results_published_at")
    .eq("id", hackathonId)
    .single()

  if (!hackathon?.results_published_at) {
    return null
  }

  return getResults(hackathonId)
}

export async function getPublicResultsWithDetails(
  hackathonId: string
): Promise<PublicResultWithDetails[] | null> {
  const results = await getPublicResults(hackathonId)
  if (!results) return null

  const client = getSupabase() as unknown as SupabaseClient

  const top3TeamIds = [
    ...new Set(
      results
        .filter((r) => r.rank <= 3 && r.submissionTeamId)
        .map((r) => r.submissionTeamId as string)
    ),
  ]

  const teamMembersMap: Record<string, string[]> = {}

  if (top3TeamIds.length > 0) {
    const { data: members } = await client
      .from("hackathon_participants")
      .select("team_id, clerk_user_id")
      .in("team_id", top3TeamIds)
      .eq("role", "participant")

    if (members?.length) {
      try {
        const { clerkClient } = await import("@clerk/nextjs/server")
        const clerk = await clerkClient()
        const clerkUsers = await clerk.users.getUserList({
          userId: members.map((m) => m.clerk_user_id),
        })
        const nameMap = Object.fromEntries(
          clerkUsers.data.map((u) => [
            u.id,
            u.firstName
              ? `${u.firstName}${u.lastName ? ` ${u.lastName}` : ""}`
              : u.username || "Anonymous",
          ])
        )
        for (const m of members) {
          if (!teamMembersMap[m.team_id as string]) teamMembersMap[m.team_id as string] = []
          teamMembersMap[m.team_id as string].push(nameMap[m.clerk_user_id] || "Anonymous")
        }
      } catch {
        // Member names unavailable - continue without them
      }
    }
  }

  return results.map((r) => ({
    rank: r.rank,
    submissionTitle: r.submissionTitle,
    submissionDescription: r.submissionDescription,
    submissionGithubUrl: r.submissionGithubUrl,
    submissionLiveAppUrl: r.submissionLiveAppUrl,
    submissionScreenshotUrl: r.submissionScreenshotUrl,
    teamName: r.teamName,
    members: r.submissionTeamId ? (teamMembersMap[r.submissionTeamId] ?? []) : [],
    weightedScore: r.weighted_score,
    judgeCount: r.judge_count,
    prizes: r.prizes,
  }))
}
