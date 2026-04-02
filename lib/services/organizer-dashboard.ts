import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"

export type HackathonMiniStats = {
  hackathonId: string
  participantCount: number
  teamCount: number
  submissionCount: number
  judgingComplete: number
  judgingTotal: number
  openMentorRequests: number
}

export async function getBatchHackathonStats(hackathonIds: string[]): Promise<Map<string, HackathonMiniStats>> {
  if (hackathonIds.length === 0) return new Map()

  const client = getSupabase() as unknown as SupabaseClient
  const result = new Map<string, HackathonMiniStats>()

  await Promise.all(hackathonIds.map(async (id) => {
    const [participants, teams, submissions, assignmentsTotal, assignmentsComplete, mentorRequests] = await Promise.all([
      client.from("hackathon_participants").select("id", { count: "exact", head: true }).eq("hackathon_id", id),
      client.from("teams").select("id", { count: "exact", head: true }).eq("hackathon_id", id).neq("status", "disbanded"),
      client.from("submissions").select("id", { count: "exact", head: true }).eq("hackathon_id", id).eq("status", "submitted"),
      client.from("judge_assignments").select("id", { count: "exact", head: true }).eq("hackathon_id", id),
      client.from("judge_assignments").select("id", { count: "exact", head: true }).eq("hackathon_id", id).eq("is_complete", true),
      client.from("mentor_requests").select("id", { count: "exact", head: true }).eq("hackathon_id", id).eq("status", "open"),
    ])

    result.set(id, {
      hackathonId: id,
      participantCount: participants.count ?? 0,
      teamCount: teams.count ?? 0,
      submissionCount: submissions.count ?? 0,
      judgingTotal: assignmentsTotal.count ?? 0,
      judgingComplete: assignmentsComplete.count ?? 0,
      openMentorRequests: mentorRequests.count ?? 0,
    })
  }))

  return result
}
