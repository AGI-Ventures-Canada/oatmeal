import { supabase as getSupabase } from "@/lib/db/client"
import type { AuditLog } from "@/lib/db/hackathon-types"
import type { Json } from "@/lib/db/types"
import type { Principal } from "@/lib/auth/types"

export type AuditAction =
  | "api_key.created"
  | "api_key.revoked"
  | "job.created"
  | "job.canceled"
  | "agent.created"
  | "agent.updated"
  | "agent.deleted"
  | "agent_run.created"
  | "agent_run.input_provided"
  | "agent_run.canceled"
  | "skill.created"
  | "skill.updated"
  | "skill.deleted"
  | "webhook.created"
  | "webhook.deleted"
  | "schedule.created"
  | "schedule.updated"
  | "schedule.deleted"
  | "integration.deleted"
  | "email_address.created"
  | "email_address.deleted"
  | "luma_webhook.created"
  | "luma_webhook.deleted"
  | "luma_webhook.token_regenerated"
  | "credential.saved"
  | "credential.updated"
  | "credential.deleted"

export type LogAuditInput = {
  principal: Exclude<Principal, { kind: "anon" }>
  action: AuditAction
  resourceType: string
  resourceId?: string
  metadata?: Json
}

export async function logAudit(input: LogAuditInput): Promise<AuditLog | null> {
  const { data, error } = await getSupabase()
    .from("audit_logs")
    .insert({
      tenant_id: input.principal.tenantId,
      action: input.action,
      actor_type: input.principal.kind === "user" ? "user" : "api_key",
      actor_id:
        input.principal.kind === "user"
          ? input.principal.userId
          : input.principal.keyId,
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      metadata: input.metadata,
    })
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to log audit:", error)
    return null
  }

  return data as AuditLog
}

export async function listAuditLogs(
  tenantId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<AuditLog[]> {
  let query = getSupabase()
    .from("audit_logs")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (options.limit) {
    query = query.limit(options.limit)
  }
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1)
  }

  const { data } = await query

  return (data as AuditLog[] | null) ?? []
}
