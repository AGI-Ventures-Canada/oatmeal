import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { RubricLevel } from "@/lib/db/hackathon-types"

export const DEFAULT_RUBRIC_LEVELS = [
  { level_number: 1, label: "Far Below Expectations" },
  { level_number: 2, label: "Below Expectations" },
  { level_number: 3, label: "Meets Expectations" },
  { level_number: 4, label: "Exceeds Expectations" },
  { level_number: 5, label: "Far Exceeds Expectations" },
]

export async function listRubricLevels(
  criteriaId: string
): Promise<RubricLevel[]> {
  const client = getSupabase() as unknown as SupabaseClient
  const { data, error } = await client
    .from("rubric_levels")
    .select("*")
    .eq("criteria_id", criteriaId)
    .order("level_number")

  if (error) {
    console.error("Failed to list rubric levels:", error)
    return []
  }

  return data as unknown as RubricLevel[]
}

export async function createDefaultRubricLevels(
  criteriaId: string
): Promise<RubricLevel[]> {
  const client = getSupabase() as unknown as SupabaseClient
  const rows = DEFAULT_RUBRIC_LEVELS.map((level) => ({
    criteria_id: criteriaId,
    level_number: level.level_number,
    label: level.label,
  }))

  const { data, error } = await client
    .from("rubric_levels")
    .insert(rows)
    .select()

  if (error) {
    console.error("Failed to create default rubric levels:", error)
    return []
  }

  return data as unknown as RubricLevel[]
}

export type CreateRubricLevelInput = {
  label: string
  description?: string | null
}

export type UpdateRubricLevelInput = {
  label?: string
  description?: string | null
}

export type DeleteRubricLevelResult =
  | { success: true; levels: RubricLevel[] }
  | { success: false; error: string }

export async function createRubricLevel(
  criteriaId: string,
  input: CreateRubricLevelInput
): Promise<RubricLevel | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: existing } = await client
    .from("rubric_levels")
    .select("level_number")
    .eq("criteria_id", criteriaId)
    .order("level_number", { ascending: false })
    .limit(1)

  const nextNumber = (existing?.[0]?.level_number ?? 0) + 1

  const { data, error } = await client
    .from("rubric_levels")
    .insert({
      criteria_id: criteriaId,
      level_number: nextNumber,
      label: input.label,
      description: input.description ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to create rubric level:", error)
    return null
  }

  return data as unknown as RubricLevel
}

export async function updateRubricLevel(
  levelId: string,
  input: UpdateRubricLevelInput
): Promise<RubricLevel | null> {
  const client = getSupabase() as unknown as SupabaseClient
  const updates: Record<string, unknown> = {}
  if (input.label !== undefined) updates.label = input.label
  if (input.description !== undefined) updates.description = input.description

  const { data, error } = await client
    .from("rubric_levels")
    .update(updates)
    .eq("id", levelId)
    .select()
    .single()

  if (error) {
    console.error("Failed to update rubric level:", error)
    return null
  }

  return data as unknown as RubricLevel
}

export async function deleteRubricLevel(
  levelId: string,
  criteriaId: string
): Promise<DeleteRubricLevelResult> {
  const client = getSupabase() as unknown as SupabaseClient

  const { count } = await client
    .from("rubric_levels")
    .select("*", { count: "exact", head: true })
    .eq("criteria_id", criteriaId)

  if ((count ?? 0) <= 2) {
    return { success: false, error: "Cannot delete: minimum 2 levels required" }
  }

  const { data: deleted, error: deleteError } = await client
    .from("rubric_levels")
    .delete()
    .eq("id", levelId)
    .select("criteria_id")
    .single()

  if (deleteError || !deleted) {
    return { success: false, error: "Failed to delete rubric level" }
  }

  const { data: remaining } = await client
    .from("rubric_levels")
    .select("*")
    .eq("criteria_id", criteriaId)
    .order("level_number")

  if (remaining) {
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].level_number !== i + 1) {
        await client
          .from("rubric_levels")
          .update({ level_number: i + 1 })
          .eq("id", remaining[i].id)
      }
    }
  }

  const { data: renumbered } = await client
    .from("rubric_levels")
    .select("*")
    .eq("criteria_id", criteriaId)
    .order("level_number")

  return { success: true, levels: (renumbered ?? []) as unknown as RubricLevel[] }
}
