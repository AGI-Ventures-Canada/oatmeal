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

  const perHackathonCounts = hackathonIds.map((id) =>
    Promise.all([
      client.from("hackathon_participants").select("*", { count: "exact", head: true }).eq("hackathon_id", id),
      client.from("teams").select("*", { count: "exact", head: true }).eq("hackathon_id", id).neq("status", "disbanded"),
      client.from("submissions").select("*", { count: "exact", head: true }).eq("hackathon_id", id).eq("status", "submitted"),
      client.from("mentor_requests").select("*", { count: "exact", head: true }).eq("hackathon_id", id).eq("status", "open"),
    ])
  )

  const [counts, assignments] = await Promise.all([
    Promise.all(perHackathonCounts),
    client.from("judge_assignments").select("hackathon_id, is_complete").in("hackathon_id", hackathonIds),
  ])

  const result = new Map<string, HackathonMiniStats>()

  for (let i = 0; i < hackathonIds.length; i++) {
    const id = hackathonIds[i]
    const [participants, teams, submissions, mentorRequests] = counts[i]
    const assignmentRows = (assignments.data ?? []).filter((r: { hackathon_id: string }) => r.hackathon_id === id)

    result.set(id, {
      hackathonId: id,
      participantCount: participants.count ?? 0,
      teamCount: teams.count ?? 0,
      submissionCount: submissions.count ?? 0,
      judgingComplete: assignmentRows.filter((r: { is_complete: boolean }) => r.is_complete).length,
      judgingTotal: assignmentRows.length,
      openMentorRequests: mentorRequests.count ?? 0,
    })
  }

  return result
}
