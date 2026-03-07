import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Prize, PrizeAssignment, PrizeType } from "@/lib/db/hackathon-types"

export type CreatePrizeInput = {
  name: string
  description?: string | null
  value?: string | null
  type?: PrizeType
  rank?: number | null
  displayOrder?: number
}

export type UpdatePrizeInput = {
  name?: string
  description?: string | null
  value?: string | null
  type?: PrizeType
  rank?: number | null
  displayOrder?: number
}

export async function listPrizes(hackathonId: string): Promise<Prize[]> {
  const client = getSupabase() as unknown as SupabaseClient
  const { data, error } = await client
    .from("prizes")
    .select("*")
    .eq("hackathon_id", hackathonId)
    .order("display_order")

  if (error) {
    console.error("Failed to list prizes:", error)
    return []
  }

  return data as unknown as Prize[]
}

export async function createPrize(
  hackathonId: string,
  input: CreatePrizeInput
): Promise<Prize | null> {
  const client = getSupabase() as unknown as SupabaseClient
  const { data, error } = await client
    .from("prizes")
    .insert({
      hackathon_id: hackathonId,
      name: input.name,
      description: input.description ?? null,
      value: input.value ?? null,
      type: input.type ?? "favorite",
      rank: input.rank ?? null,
      display_order: input.displayOrder ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to create prize:", error)
    return null
  }

  return data as unknown as Prize
}

export async function updatePrize(
  prizeId: string,
  hackathonId: string,
  input: UpdatePrizeInput
): Promise<Prize | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description
  if (input.value !== undefined) updates.value = input.value
  if (input.type !== undefined) updates.type = input.type
  if (input.rank !== undefined) updates.rank = input.rank
  if (input.displayOrder !== undefined) updates.display_order = input.displayOrder
  updates.updated_at = new Date().toISOString()

  const { data, error } = await client
    .from("prizes")
    .update(updates)
    .eq("id", prizeId)
    .eq("hackathon_id", hackathonId)
    .select()
    .single()

  if (error) {
    console.error("Failed to update prize:", error)
    return null
  }

  return data as unknown as Prize
}

export async function deletePrize(
  prizeId: string,
  hackathonId: string
): Promise<boolean> {
  const client = getSupabase() as unknown as SupabaseClient
  const { error } = await client
    .from("prizes")
    .delete()
    .eq("id", prizeId)
    .eq("hackathon_id", hackathonId)

  if (error) {
    console.error("Failed to delete prize:", error)
    return false
  }

  return true
}

export async function assignPrize(
  prizeId: string,
  submissionId: string
): Promise<PrizeAssignment | null> {
  const client = getSupabase() as unknown as SupabaseClient
  const { data, error } = await client
    .from("prize_assignments")
    .insert({
      prize_id: prizeId,
      submission_id: submissionId,
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      console.error("Prize already assigned to this submission")
      return null
    }
    console.error("Failed to assign prize:", error)
    return null
  }

  return data as unknown as PrizeAssignment
}

export async function removePrizeAssignment(
  prizeId: string,
  submissionId: string
): Promise<boolean> {
  const client = getSupabase() as unknown as SupabaseClient
  const { error } = await client
    .from("prize_assignments")
    .delete()
    .eq("prize_id", prizeId)
    .eq("submission_id", submissionId)

  if (error) {
    console.error("Failed to remove prize assignment:", error)
    return false
  }

  return true
}

export async function autoAssignPrizes(hackathonId: string): Promise<void> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: prizes } = await client
    .from("prizes")
    .select("id, type, rank")
    .eq("hackathon_id", hackathonId)

  if (!prizes || prizes.length === 0) return

  const scorePrizes = prizes.filter(
    (p: { type: string; rank: number | null }) => p.type === "score" && p.rank !== null
  )

  if (scorePrizes.length > 0) {
    const { data: results } = await client
      .from("hackathon_results")
      .select("submission_id, rank")
      .eq("hackathon_id", hackathonId)

    if (results) {
      const rankToSubmission = Object.fromEntries(
        results.map((r: { submission_id: string; rank: number }) => [r.rank, r.submission_id])
      )

      for (const prize of scorePrizes) {
        const submissionId = rankToSubmission[prize.rank as number]
        if (submissionId) {
          await assignPrize(prize.id, submissionId)
        }
      }
    }
  }

  const crowdPrizes = prizes.filter(
    (p: { type: string }) => p.type === "crowd"
  )

  if (crowdPrizes.length > 0) {
    const { getCrowdFavoriteWinner } = await import("@/lib/services/crowd-voting")
    const winnerId = await getCrowdFavoriteWinner(hackathonId)
    if (winnerId) {
      for (const prize of crowdPrizes) {
        await assignPrize(prize.id, winnerId)
      }
    }
  }
}

export type PrizeAssignmentWithDetails = PrizeAssignment & {
  prizeName: string
  submissionTitle: string
  teamName: string | null
}

export async function listPrizeAssignments(
  hackathonId: string
): Promise<PrizeAssignmentWithDetails[]> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: prizes } = await client
    .from("prizes")
    .select("id, name")
    .eq("hackathon_id", hackathonId)

  if (!prizes || prizes.length === 0) return []

  const prizeIds = prizes.map((p) => p.id)
  const prizeNameMap = Object.fromEntries(prizes.map((p) => [p.id, p.name]))

  const { data: assignments, error } = await client
    .from("prize_assignments")
    .select(`
      *,
      submission:submissions!submission_id(title, team_id)
    `)
    .in("prize_id", prizeIds)

  if (error || !assignments) {
    console.error("Failed to list prize assignments:", error)
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
    const sub = a.submission as unknown as { title: string; team_id: string | null }
    return {
      ...(a as unknown as PrizeAssignment),
      prizeName: prizeNameMap[a.prize_id as string] ?? "Unknown",
      submissionTitle: sub.title,
      teamName: sub.team_id ? teamsMap[sub.team_id] ?? null : null,
    }
  })
}
