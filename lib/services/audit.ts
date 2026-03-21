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
  | "credential.saved"
  | "credential.updated"
  | "credential.deleted"
  | "hackathon.created"
  | "hackathon.updated"
  | "hackathon.banner_uploaded"
  | "hackathon.banner_deleted"
  | "sponsor.added"
  | "sponsor.updated"
  | "sponsor.removed"
  | "sponsor.logo_uploaded"
  | "sponsor.logo_deleted"
  | "org_profile.updated"
  | "logo.uploaded"
  | "logo.deleted"
  | "team_invitation.sent"
  | "team_invitation.cancelled"
  | "judging_criteria.created"
  | "judging_criteria.deleted"
  | "judge.added"
  | "judge.removed"
  | "judge.invited"
  | "judge_invitation.cancelled"
  | "judging.auto_assigned"
  | "judge_display.created"
  | "judge_display.deleted"
  | "prize.created"
  | "prize.deleted"
  | "prize.assigned"
  | "results.calculated"
  | "results.published"
  | "results.unpublished"
  | "cli_auth.completed"
  | "admin.hackathon.updated"
  | "admin.hackathon.deleted"
  | "admin.tenant.updated"
  | "admin.scenario.created"

export type LogAuditInput = {
  principal: Exclude<Principal, { kind: "anon" }>
  action: AuditAction
  resourceType: string
  resourceId?: string
  metadata?: Json
  targetTenantId?: string
}

export async function logAudit(input: LogAuditInput): Promise<AuditLog | null> {
  const { principal } = input

  let tenantId: string
  let actorType: "user" | "api_key"
  let actorId: string
  let metadata = input.metadata

  if (principal.kind === "admin") {
    if (!input.targetTenantId) {
      console.error("Admin audit log requires targetTenantId")
      return null
    }
    tenantId = input.targetTenantId
    actorType = "user"
    actorId = principal.userId
    metadata = { ...(input.metadata as Record<string, unknown> ?? {}), is_admin_action: true, admin_user_id: principal.userId }
  } else if (principal.kind === "user") {
    tenantId = principal.tenantId
    actorType = "user"
    actorId = principal.userId
  } else {
    tenantId = principal.tenantId
    actorType = "api_key"
    actorId = principal.keyId
  }

  const { data, error } = await getSupabase()
    .from("audit_logs")
    .insert({
      tenant_id: tenantId,
      action: input.action,
      actor_type: actorType,
      actor_id: actorId,
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      metadata,
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
