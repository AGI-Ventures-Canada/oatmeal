import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"

export type ManageOverviewStats = {
  participantCount: number
  teamCount: number
  mentorQueue: { open: number }
  challengeReleased: boolean
}

// Overlaps with getBatchHackathonStats but optimized for the single-hackathon
// case: uses head-only count queries (no rows transferred) and fetches
// challengeReleased which the batch service doesn't need.
export async function getManageOverviewStats(hackathonId: string): Promise<ManageOverviewStats> {
  const client = getSupabase() as unknown as SupabaseClient

  const [participantResult, teamResult, mentorOpenResult, hackathonResult] = await Promise.all([
    client.from("hackathon_participants").select("id", { count: "exact", head: true }).eq("hackathon_id", hackathonId),
    client.from("teams").select("id", { count: "exact", head: true }).eq("hackathon_id", hackathonId).neq("status", "disbanded"),
    client.from("mentor_requests").select("id", { count: "exact", head: true }).eq("hackathon_id", hackathonId).eq("status", "open"),
    client.from("hackathons").select("challenge_released_at").eq("id", hackathonId).single(),
  ])

  return {
    participantCount: participantResult.count ?? 0,
    teamCount: teamResult.count ?? 0,
    mentorQueue: { open: mentorOpenResult.count ?? 0 },
    challengeReleased: !!hackathonResult.data?.challenge_released_at,
  }
}
