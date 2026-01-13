import { supabase as getSupabase } from "@/lib/db/client"
import type { Skill } from "@/lib/db/agent-types"
import type { Json } from "@/lib/db/types"

export type CreateSkillInput = {
  tenantId: string
  name: string
  slug: string
  description?: string
  content: string
  referencesContent?: Json
  scriptsContent?: Json
}

export type UpdateSkillInput = {
  name?: string
  slug?: string
  description?: string | null
  content?: string
  referencesContent?: Json
  scriptsContent?: Json
}

export async function createSkill(input: CreateSkillInput): Promise<Skill | null> {
  const { data, error } = await getSupabase()
    .from("skills")
    .insert({
      tenant_id: input.tenantId,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      content: input.content,
      references_content: input.referencesContent ?? {},
      scripts_content: input.scriptsContent ?? {},
    })
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to create skill:", error)
    return null
  }

  return data as Skill
}

export async function getSkillById(
  skillId: string,
  tenantId: string
): Promise<Skill | null> {
  const { data } = await getSupabase()
    .from("skills")
    .select("*")
    .eq("id", skillId)
    .eq("tenant_id", tenantId)
    .single()

  return data as Skill | null
}

export async function getSkillBySlug(
  slug: string,
  tenantId: string
): Promise<Skill | null> {
  const { data } = await getSupabase()
    .from("skills")
    .select("*")
    .eq("slug", slug)
    .eq("tenant_id", tenantId)
    .single()

  return data as Skill | null
}

export async function getSkillsByIds(
  skillIds: string[],
  tenantId: string
): Promise<Skill[]> {
  if (skillIds.length === 0) return []

  const { data } = await getSupabase()
    .from("skills")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("id", skillIds)

  return (data as Skill[] | null) ?? []
}

export async function listSkills(
  tenantId: string,
  options: { limit?: number; offset?: number; includeBuiltin?: boolean } = {}
): Promise<Skill[]> {
  let query = getSupabase()
    .from("skills")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (!options.includeBuiltin) {
    query = query.eq("is_builtin", false)
  }
  if (options.limit) {
    query = query.limit(options.limit)
  }
  if (options.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit ?? 50) - 1
    )
  }

  const { data } = await query

  return (data as Skill[] | null) ?? []
}

export async function updateSkill(
  skillId: string,
  tenantId: string,
  updates: UpdateSkillInput
): Promise<Skill | null> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.slug !== undefined) updateData.slug = updates.slug
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.content !== undefined) {
    updateData.content = updates.content
    // Version will be incremented via raw SQL if needed
  }
  if (updates.referencesContent !== undefined)
    updateData.references_content = updates.referencesContent
  if (updates.scriptsContent !== undefined)
    updateData.scripts_content = updates.scriptsContent

  const { data, error } = await getSupabase()
    .from("skills")
    .update(updateData)
    .eq("id", skillId)
    .eq("tenant_id", tenantId)
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to update skill:", error)
    return null
  }

  return data as Skill
}

export async function deleteSkill(
  skillId: string,
  tenantId: string
): Promise<boolean> {
  const { error } = await getSupabase()
    .from("skills")
    .delete()
    .eq("id", skillId)
    .eq("tenant_id", tenantId)
    .eq("is_builtin", false)

  if (error) {
    console.error("Failed to delete skill:", error)
    return false
  }

  return true
}

export interface SkillFile {
  path: string
  content: string
}

export function buildSkillFilesForSandbox(skills: Skill[]): SkillFile[] {
  const files: SkillFile[] = []

  for (const skill of skills) {
    files.push({
      path: `.claude/skills/${skill.slug}/SKILL.md`,
      content: skill.content,
    })

    const references = skill.references_content as Record<string, string> | null
    if (references) {
      for (const [filename, content] of Object.entries(references)) {
        files.push({
          path: `.claude/skills/${skill.slug}/references/${filename}`,
          content,
        })
      }
    }

    const scripts = skill.scripts_content as Record<string, string> | null
    if (scripts) {
      for (const [filename, content] of Object.entries(scripts)) {
        files.push({
          path: `.claude/skills/${skill.slug}/scripts/${filename}`,
          content,
        })
      }
    }
  }

  return files
}
