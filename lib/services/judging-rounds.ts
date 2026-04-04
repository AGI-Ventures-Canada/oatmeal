import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"

export type JudgingRound = {
  id: string
  hackathon_id: string
  name: string
  round_type: "preliminary" | "finals"
  is_active: boolean
  display_order: number
  created_at: string
}

export type CreateRoundInput = {
  name: string
  roundType: "preliminary" | "finals"
  displayOrder?: number
}

export type UpdateRoundInput = {
  name?: string
  roundType?: "preliminary" | "finals"
  displayOrder?: number
}

export async function listRounds(hackathonId: string): Promise<JudgingRound[]> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("judging_rounds")
    .select("*")
    .eq("hackathon_id", hackathonId)
    .order("display_order")

  if (error) {
    console.error("Failed to list judging rounds:", error)
    return []
  }

  return data as JudgingRound[]
}

export async function createRound(
  hackathonId: string,
  input: CreateRoundInput
): Promise<JudgingRound | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("judging_rounds")
    .insert({
      hackathon_id: hackathonId,
      name: input.name,
      round_type: input.roundType,
      display_order: input.displayOrder ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to create judging round:", error)
    return null
  }

  return data as JudgingRound
}

export async function updateRound(
  roundId: string,
  hackathonId: string,
  input: UpdateRoundInput
): Promise<JudgingRound | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.roundType !== undefined) updates.round_type = input.roundType
  if (input.displayOrder !== undefined) updates.display_order = input.displayOrder

  if (Object.keys(updates).length === 0) return null

  const { data, error } = await client
    .from("judging_rounds")
    .update(updates)
    .eq("id", roundId)
    .eq("hackathon_id", hackathonId)
    .select()
    .single()

  if (error) {
    console.error("Failed to update judging round:", error)
    return null
  }

  return data as JudgingRound
}

export async function deleteRound(roundId: string, hackathonId: string): Promise<boolean> {
  const client = getSupabase() as unknown as SupabaseClient

  const { error } = await client
    .from("judging_rounds")
    .delete()
    .eq("id", roundId)
    .eq("hackathon_id", hackathonId)

  if (error) {
    console.error("Failed to delete judging round:", error)
    return false
  }

  return true
}

export async function activateRound(roundId: string, hackathonId: string): Promise<boolean> {
  const client = getSupabase() as unknown as SupabaseClient

  const { error: deactivateErr } = await client
    .from("judging_rounds")
    .update({ is_active: false })
    .eq("hackathon_id", hackathonId)
    .neq("id", roundId)

  if (deactivateErr) {
    console.error("Failed to deactivate rounds:", deactivateErr)
    return false
  }

  const { data, error: activateErr } = await client
    .from("judging_rounds")
    .update({ is_active: true })
    .eq("id", roundId)
    .eq("hackathon_id", hackathonId)
    .select("id")
    .single()

  if (activateErr || !data) {
    console.error("Failed to activate round:", activateErr)
    return false
  }

  return true
}

export async function getActiveRound(hackathonId: string): Promise<JudgingRound | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("judging_rounds")
    .select("*")
    .eq("hackathon_id", hackathonId)
    .eq("is_active", true)
    .maybeSingle()

  if (error) {
    console.error("Failed to get active round:", error)
    return null
  }

  return data as JudgingRound | null
}
