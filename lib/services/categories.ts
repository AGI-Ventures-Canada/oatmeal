import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"

export type SubmissionCategory = {
  id: string
  hackathon_id: string
  name: string
  description: string | null
  prize_id: string | null
  display_order: number
  created_at: string
}

export type CategoryWithPrize = SubmissionCategory & {
  prize_name: string | null
}

export type CreateCategoryInput = {
  name: string
  description?: string | null
  prizeId?: string | null
  displayOrder?: number
}

export type UpdateCategoryInput = {
  name?: string
  description?: string | null
  prizeId?: string | null
  displayOrder?: number
}

export async function listCategories(hackathonId: string): Promise<CategoryWithPrize[]> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("submission_categories")
    .select("*, prizes(name)")
    .eq("hackathon_id", hackathonId)
    .order("display_order")

  if (error) {
    console.error("Failed to list categories:", error)
    return []
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const { prizes, ...rest } = row
    return {
      ...rest,
      prize_name: (prizes as { name: string } | null)?.name ?? null,
    } as CategoryWithPrize
  })
}

export async function createCategory(
  hackathonId: string,
  input: CreateCategoryInput
): Promise<SubmissionCategory | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("submission_categories")
    .insert({
      hackathon_id: hackathonId,
      name: input.name,
      description: input.description ?? null,
      prize_id: input.prizeId ?? null,
      display_order: input.displayOrder ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to create category:", error)
    return null
  }

  return data as SubmissionCategory
}

export async function updateCategory(
  categoryId: string,
  hackathonId: string,
  input: UpdateCategoryInput
): Promise<SubmissionCategory | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description
  if (input.prizeId !== undefined) updates.prize_id = input.prizeId
  if (input.displayOrder !== undefined) updates.display_order = input.displayOrder

  if (Object.keys(updates).length === 0) return null

  const { data, error } = await client
    .from("submission_categories")
    .update(updates)
    .eq("id", categoryId)
    .eq("hackathon_id", hackathonId)
    .select()
    .single()

  if (error) {
    console.error("Failed to update category:", error)
    return null
  }

  return data as SubmissionCategory
}

export async function deleteCategory(categoryId: string, hackathonId: string): Promise<boolean> {
  const client = getSupabase() as unknown as SupabaseClient

  const { error } = await client
    .from("submission_categories")
    .delete()
    .eq("id", categoryId)
    .eq("hackathon_id", hackathonId)

  if (error) {
    console.error("Failed to delete category:", error)
    return false
  }

  return true
}

export async function getSubmissionCategories(submissionId: string): Promise<SubmissionCategory[]> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("submission_category_entries")
    .select("category_id, submission_categories(*)")
    .eq("submission_id", submissionId)

  if (error) {
    console.error("Failed to get submission categories:", error)
    return []
  }

  return (data ?? []).map((row: Record<string, unknown>) => row.submission_categories as SubmissionCategory)
}

export async function setSubmissionCategories(
  submissionId: string,
  categoryIds: string[]
): Promise<boolean> {
  const client = getSupabase() as unknown as SupabaseClient

  const { error: deleteError } = await client
    .from("submission_category_entries")
    .delete()
    .eq("submission_id", submissionId)

  if (deleteError) {
    console.error("Failed to clear submission categories:", deleteError)
    return false
  }

  if (categoryIds.length === 0) return true

  const { error: insertError } = await client
    .from("submission_category_entries")
    .insert(categoryIds.map((categoryId) => ({ submission_id: submissionId, category_id: categoryId })))

  if (insertError) {
    console.error("Failed to set submission categories:", insertError)
    return false
  }

  return true
}
