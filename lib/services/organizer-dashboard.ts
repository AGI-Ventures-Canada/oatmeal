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

// Fetches minimal rows (hackathon_id only) and groups in JS rather than running
// N * 6 individual count queries. For the typical organizer dashboard (< 20
// hackathons) this is 6 queries total vs 60–120 count queries.
export async function getBatchHackathonStats(hackathonIds: string[]): Promise<Map<string, HackathonMiniStats>> {
  if (hackathonIds.length === 0) return new Map()

  const client = getSupabase() as unknown as SupabaseClient

  const [participants, teams, submissions, assignments, completedAssignments, mentorRequests] = await Promise.all([
    client.from("hackathon_participants").select("hackathon_id").in("hackathon_id", hackathonIds),
    client.from("teams").select("hackathon_id").in("hackathon_id", hackathonIds).neq("status", "disbanded"),
    client.from("submissions").select("hackathon_id").in("hackathon_id", hackathonIds).eq("status", "submitted"),
    client.from("judge_assignments").select("hackathon_id").in("hackathon_id", hackathonIds),
    client.from("judge_assignments").select("hackathon_id").in("hackathon_id", hackathonIds).eq("is_complete", true),
    client.from("mentor_requests").select("hackathon_id").in("hackathon_id", hackathonIds).eq("status", "open"),
  ])

  const result = new Map<string, HackathonMiniStats>()

  for (const id of hackathonIds) {
    result.set(id, {
      hackathonId: id,
      participantCount: countByField(participants.data, id),
      teamCount: countByField(teams.data, id),
      submissionCount: countByField(submissions.data, id),
      judgingComplete: countByField(completedAssignments.data, id),
      judgingTotal: countByField(assignments.data, id),
      openMentorRequests: countByField(mentorRequests.data, id),
    })
  }

  return result
}

function countByField(rows: { hackathon_id: string }[] | null, hackathonId: string): number {
  if (!rows) return 0
  return rows.filter((r) => r.hackathon_id === hackathonId).length
}
