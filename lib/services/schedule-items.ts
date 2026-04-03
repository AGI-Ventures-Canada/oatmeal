import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"

export type ScheduleItem = {
  id: string
  hackathon_id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string | null
  location: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type CreateScheduleItemInput = {
  title: string
  description?: string
  startsAt: string
  endsAt?: string
  location?: string
  sortOrder?: number
}

export type UpdateScheduleItemInput = {
  title?: string
  description?: string | null
  startsAt?: string
  endsAt?: string | null
  location?: string | null
  sortOrder?: number
}

export async function listScheduleItems(hackathonId: string): Promise<ScheduleItem[]> {
  const client = getSupabase() as unknown as SupabaseClient
  const { data, error } = await client
    .from("hackathon_schedule_items")
    .select("*")
    .eq("hackathon_id", hackathonId)
    .order("starts_at")
    .order("sort_order")

  if (error || !data) {
    console.error("Failed to list schedule items:", error)
    return []
  }
  return data as unknown as ScheduleItem[]
}

export async function createScheduleItem(hackathonId: string, input: CreateScheduleItemInput): Promise<ScheduleItem | null> {
  const client = getSupabase() as unknown as SupabaseClient
  const { data, error } = await client
    .from("hackathon_schedule_items")
    .insert({
      hackathon_id: hackathonId,
      title: input.title,
      description: input.description ?? null,
      starts_at: input.startsAt,
      ends_at: input.endsAt ?? null,
      location: input.location ?? null,
      sort_order: input.sortOrder ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to create schedule item:", error)
    return null
  }
  return data as ScheduleItem
}

export async function updateScheduleItem(itemId: string, hackathonId: string, input: UpdateScheduleItemInput): Promise<ScheduleItem | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.title !== undefined) updates.title = input.title
  if (input.description !== undefined) updates.description = input.description
  if (input.startsAt !== undefined) updates.starts_at = input.startsAt
  if (input.endsAt !== undefined) updates.ends_at = input.endsAt
  if (input.location !== undefined) updates.location = input.location
  if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder

  const { data, error } = await client
    .from("hackathon_schedule_items")
    .update(updates)
    .eq("id", itemId)
    .eq("hackathon_id", hackathonId)
    .select()
    .single()

  if (error) {
    console.error("Failed to update schedule item:", error)
    return null
  }
  return data as ScheduleItem
}

export async function deleteScheduleItem(itemId: string, hackathonId: string): Promise<boolean> {
  const client = getSupabase() as unknown as SupabaseClient
  const { error } = await client
    .from("hackathon_schedule_items")
    .delete()
    .eq("id", itemId)
    .eq("hackathon_id", hackathonId)

  if (error) {
    console.error("Failed to delete schedule item:", error)
    return false
  }
  return true
}
