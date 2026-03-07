import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"

export async function castVote(
  hackathonId: string,
  submissionId: string,
  clerkUserId: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase() as unknown as SupabaseClient

  const { error: deleteError } = await client
    .from("crowd_votes")
    .delete()
    .eq("hackathon_id", hackathonId)
    .eq("clerk_user_id", clerkUserId)

  if (deleteError) {
    console.error("Failed to clear previous vote:", deleteError)
    return { success: false, error: "Failed to cast vote" }
  }

  const { error } = await client
    .from("crowd_votes")
    .insert({
      hackathon_id: hackathonId,
      submission_id: submissionId,
      clerk_user_id: clerkUserId,
    })

  if (error) {
    console.error("Failed to cast vote:", error)
    return { success: false, error: "Failed to cast vote" }
  }

  return { success: true }
}

export async function removeVote(
  hackathonId: string,
  clerkUserId: string
): Promise<boolean> {
  const client = getSupabase() as unknown as SupabaseClient
  const { error } = await client
    .from("crowd_votes")
    .delete()
    .eq("hackathon_id", hackathonId)
    .eq("clerk_user_id", clerkUserId)

  if (error) {
    console.error("Failed to remove vote:", error)
    return false
  }

  return true
}

export async function getVoteCounts(
  hackathonId: string
): Promise<{ submissionId: string; voteCount: number }[]> {
  const client = getSupabase() as unknown as SupabaseClient
  const { data, error } = await client
    .from("crowd_votes")
    .select("submission_id")
    .eq("hackathon_id", hackathonId)

  if (error || !data) {
    console.error("Failed to get vote counts:", error)
    return []
  }

  const counts: Record<string, number> = {}
  for (const vote of data) {
    counts[vote.submission_id] = (counts[vote.submission_id] || 0) + 1
  }

  return Object.entries(counts).map(([submissionId, voteCount]) => ({
    submissionId,
    voteCount,
  }))
}

export async function getUserVote(
  hackathonId: string,
  clerkUserId: string
): Promise<string | null> {
  const client = getSupabase() as unknown as SupabaseClient
  const { data, error } = await client
    .from("crowd_votes")
    .select("submission_id")
    .eq("hackathon_id", hackathonId)
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data.submission_id
}

export async function getCrowdFavoriteWinner(
  hackathonId: string
): Promise<string | null> {
  const counts = await getVoteCounts(hackathonId)
  if (counts.length === 0) return null

  counts.sort((a, b) => b.voteCount - a.voteCount)
  return counts[0].submissionId
}
