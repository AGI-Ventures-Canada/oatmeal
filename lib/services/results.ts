import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { HackathonResult } from "@/lib/db/hackathon-types"

export type ResultWithDetails = HackathonResult & {
  submissionTitle: string
  teamName: string | null
  prizes: { id: string; name: string; value: string | null }[]
}

export type CalculateResultsResponse =
  | { success: true; count: number }
  | { success: false; error: string; code: string }

export async function calculateResults(
  hackathonId: string
): Promise<CalculateResultsResponse> {
  const client = getSupabase() as unknown as SupabaseClient

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

export async function getResults(hackathonId: string): Promise<ResultWithDetails[]> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: results, error } = await client
    .from("hackathon_results")
    .select(`
      *,
      submission:submissions!submission_id(title, team_id)
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
    const sub = r.submission as unknown as { title: string; team_id: string | null }
    return {
      ...(r as unknown as HackathonResult),
      submissionTitle: sub.title,
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

  const { data: updated, error: hackathonError } = await client
    .from("hackathons")
    .update({
      results_published_at: now,
      status: "completed",
      updated_at: now,
    })
    .eq("id", hackathonId)
    .eq("tenant_id", tenantId)
    .is("results_published_at", null)
    .select("id")
    .single()

  if (hackathonError || !updated) {
    return { success: false, error: "Results are already published" }
  }

  const { error: updateError } = await client
    .from("hackathon_results")
    .update({ published_at: now })
    .eq("hackathon_id", hackathonId)

  if (updateError) {
    console.error("Failed to update results published_at:", updateError)
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
      status: "judging",
      updated_at: new Date().toISOString(),
    })
    .eq("id", hackathonId)
    .eq("tenant_id", tenantId)

  if (hackathonError) {
    console.error("Failed to update hackathon status:", hackathonError)
    return { success: false, error: "Failed to update hackathon status" }
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
