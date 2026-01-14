import { supabase as getSupabase } from "@/lib/db/client"
import type { Agent, AgentType } from "@/lib/db/agent-types"
import type { Json } from "@/lib/db/types"
import { getDefaultModel, isValidModel } from "@/lib/ai/anthropic"

export type CreateAgentInput = {
  tenantId: string
  name: string
  description?: string
  type?: AgentType
  model?: string
  instructions?: string
  maxSteps?: number
  timeoutMs?: number
  skillIds?: string[]
  config?: Json
}

export type UpdateAgentInput = {
  name?: string
  description?: string | null
  type?: AgentType
  model?: string
  instructions?: string | null
  maxSteps?: number
  timeoutMs?: number
  skillIds?: string[]
  config?: Json
  isActive?: boolean
}

export type ListAgentsOptions = {
  limit?: number
  offset?: number
  activeOnly?: boolean
}

export async function createAgent(input: CreateAgentInput): Promise<Agent | null> {
  const model = input.model ?? getDefaultModel()
  if (!isValidModel(model)) {
    console.error("Invalid model:", model)
    return null
  }

  const { data, error } = await getSupabase()
    .from("agents")
    .insert({
      tenant_id: input.tenantId,
      name: input.name,
      description: input.description ?? null,
      type: input.type ?? "ai_sdk",
      model,
      instructions: input.instructions ?? "",
      max_steps: input.maxSteps ?? 5,
      timeout_ms: input.timeoutMs ?? 300000,
      skill_ids: input.skillIds ?? [],
      config: input.config ?? {},
    })
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to create agent:", error)
    return null
  }

  return data as Agent
}

export async function getAgentById(
  agentId: string,
  tenantId: string
): Promise<Agent | null> {
  const { data } = await getSupabase()
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .eq("tenant_id", tenantId)
    .single()

  return data as Agent | null
}

export async function listAgents(
  tenantId: string,
  options: ListAgentsOptions = {}
): Promise<Agent[]> {
  let query = getSupabase()
    .from("agents")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (options.activeOnly) {
    query = query.eq("is_active", true)
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

  return (data as Agent[] | null) ?? []
}

export async function updateAgent(
  agentId: string,
  tenantId: string,
  updates: UpdateAgentInput
): Promise<Agent | null> {
  if (updates.model && !isValidModel(updates.model)) {
    console.error("Invalid model:", updates.model)
    return null
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.type !== undefined) updateData.type = updates.type
  if (updates.model !== undefined) updateData.model = updates.model
  if (updates.instructions !== undefined) updateData.instructions = updates.instructions
  if (updates.maxSteps !== undefined) updateData.max_steps = updates.maxSteps
  if (updates.timeoutMs !== undefined) updateData.timeout_ms = updates.timeoutMs
  if (updates.skillIds !== undefined) updateData.skill_ids = updates.skillIds
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive

  if (updates.config !== undefined) {
    const existingAgent = await getAgentById(agentId, tenantId)
    const existingConfig = (existingAgent?.config as Record<string, unknown>) ?? {}
    const newConfig = updates.config as Record<string, unknown>
    updateData.config = { ...existingConfig, ...newConfig }
  }

  const { data, error } = await getSupabase()
    .from("agents")
    .update(updateData)
    .eq("id", agentId)
    .eq("tenant_id", tenantId)
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to update agent:", error)
    return null
  }

  return data as Agent
}

export async function deleteAgent(
  agentId: string,
  tenantId: string
): Promise<boolean> {
  const { error } = await getSupabase()
    .from("agents")
    .delete()
    .eq("id", agentId)
    .eq("tenant_id", tenantId)

  if (error) {
    console.error("Failed to delete agent:", error)
    return false
  }

  return true
}

export async function deactivateAgent(
  agentId: string,
  tenantId: string
): Promise<Agent | null> {
  return updateAgent(agentId, tenantId, { isActive: false })
}

export async function activateAgent(
  agentId: string,
  tenantId: string
): Promise<Agent | null> {
  return updateAgent(agentId, tenantId, { isActive: true })
}
