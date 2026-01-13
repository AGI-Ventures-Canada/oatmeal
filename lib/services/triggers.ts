import { supabase as getSupabase } from "@/lib/db/client"
import type {
  EmailAddress,
  InboundEmail,
  LumaWebhookConfig,
  TriggerType,
  LumaEventType,
} from "@/lib/db/agent-types"
import type { Json } from "@/lib/db/types"
import crypto from "crypto"

// ============================================================================
// Email Address Management
// ============================================================================

export type CreateEmailAddressInput = {
  tenantId: string
  address: string
  domain: string
  localPart?: string
  isCustomDomain?: boolean
  agentId?: string
}

export async function createEmailAddress(
  input: CreateEmailAddressInput
): Promise<EmailAddress | null> {
  const localPart = input.localPart ?? input.address.split("@")[0]

  const { data, error } = await getSupabase()
    .from("email_addresses")
    .insert({
      tenant_id: input.tenantId,
      address: input.address,
      domain: input.domain,
      local_part: localPart,
      is_custom_domain: input.isCustomDomain ?? false,
      agent_id: input.agentId ?? null,
    })
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to create email address:", error)
    return null
  }

  return data as EmailAddress
}

export async function getEmailAddressById(
  emailAddressId: string,
  tenantId: string
): Promise<EmailAddress | null> {
  const { data } = await getSupabase()
    .from("email_addresses")
    .select("*")
    .eq("id", emailAddressId)
    .eq("tenant_id", tenantId)
    .single()

  return data as EmailAddress | null
}

export async function getEmailAddressByAddress(
  address: string
): Promise<EmailAddress | null> {
  const { data } = await getSupabase()
    .from("email_addresses")
    .select("*")
    .eq("address", address)
    .eq("is_active", true)
    .single()

  return data as EmailAddress | null
}

export async function listEmailAddresses(tenantId: string): Promise<EmailAddress[]> {
  const { data } = await getSupabase()
    .from("email_addresses")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  return (data as EmailAddress[] | null) ?? []
}

export async function updateEmailAddress(
  emailAddressId: string,
  tenantId: string,
  updates: { agentId?: string | null; isActive?: boolean }
): Promise<EmailAddress | null> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.agentId !== undefined) updateData.agent_id = updates.agentId
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive

  const { data, error } = await getSupabase()
    .from("email_addresses")
    .update(updateData)
    .eq("id", emailAddressId)
    .eq("tenant_id", tenantId)
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to update email address:", error)
    return null
  }

  return data as EmailAddress
}

export async function deleteEmailAddress(
  emailAddressId: string,
  tenantId: string
): Promise<boolean> {
  const { error } = await getSupabase()
    .from("email_addresses")
    .delete()
    .eq("id", emailAddressId)
    .eq("tenant_id", tenantId)

  return !error
}

export function generateInboundEmailAddress(tenantId: string): string {
  const domain = process.env.RESEND_RECEIVING_DOMAIN ?? "agents.resend.app"
  const prefix = tenantId.slice(0, 8)
  return `inbox-${prefix}@${domain}`
}

// ============================================================================
// Inbound Email Management
// ============================================================================

export type StoreInboundEmailInput = {
  emailAddressId: string
  resendEmailId: string
  fromAddress: string
  subject?: string
  bodyText?: string
  bodyHtml?: string
  attachments?: Json
  agentRunId?: string
}

export async function storeInboundEmail(
  input: StoreInboundEmailInput
): Promise<InboundEmail | null> {
  const { data, error } = await getSupabase()
    .from("inbound_emails")
    .insert({
      email_address_id: input.emailAddressId,
      resend_email_id: input.resendEmailId,
      from_address: input.fromAddress,
      subject: input.subject ?? null,
      body_text: input.bodyText ?? null,
      body_html: input.bodyHtml ?? null,
      attachments: input.attachments ?? null,
      agent_run_id: input.agentRunId ?? null,
    })
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to store inbound email:", error)
    return null
  }

  return data as InboundEmail
}

export async function updateInboundEmailAgentRun(
  inboundEmailId: string,
  agentRunId: string
): Promise<boolean> {
  const { error } = await getSupabase()
    .from("inbound_emails")
    .update({ agent_run_id: agentRunId })
    .eq("id", inboundEmailId)

  return !error
}

export async function listInboundEmails(
  emailAddressId: string,
  options: { limit?: number } = {}
): Promise<InboundEmail[]> {
  let query = getSupabase()
    .from("inbound_emails")
    .select("*")
    .eq("email_address_id", emailAddressId)
    .order("received_at", { ascending: false })

  if (options.limit) {
    query = query.limit(options.limit)
  }

  const { data } = await query

  return (data as InboundEmail[] | null) ?? []
}

// ============================================================================
// Luma Webhook Config Management
// ============================================================================

export type CreateLumaWebhookConfigInput = {
  tenantId: string
  calendarId?: string
  eventTypes: LumaEventType[]
  agentId?: string
}

export async function createLumaWebhookConfig(
  input: CreateLumaWebhookConfigInput
): Promise<{ config: LumaWebhookConfig; webhookUrl: string } | null> {
  const webhookToken = crypto.randomBytes(32).toString("hex")

  const { data, error } = await getSupabase()
    .from("luma_webhook_configs")
    .insert({
      tenant_id: input.tenantId,
      webhook_token: webhookToken,
      calendar_id: input.calendarId ?? null,
      event_types: input.eventTypes,
      agent_id: input.agentId ?? null,
    })
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to create Luma webhook config:", error)
    return null
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const webhookUrl = `${baseUrl}/api/public/webhooks/luma/${webhookToken}`

  return { config: data as LumaWebhookConfig, webhookUrl }
}

export async function getLumaWebhookConfigById(
  configId: string,
  tenantId: string
): Promise<LumaWebhookConfig | null> {
  const { data } = await getSupabase()
    .from("luma_webhook_configs")
    .select("*")
    .eq("id", configId)
    .eq("tenant_id", tenantId)
    .single()

  return data as LumaWebhookConfig | null
}

export async function getLumaWebhookConfigByToken(
  token: string
): Promise<LumaWebhookConfig | null> {
  const { data } = await getSupabase()
    .from("luma_webhook_configs")
    .select("*")
    .eq("webhook_token", token)
    .eq("is_active", true)
    .single()

  return data as LumaWebhookConfig | null
}

export async function listLumaWebhookConfigs(
  tenantId: string
): Promise<LumaWebhookConfig[]> {
  const { data } = await getSupabase()
    .from("luma_webhook_configs")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  return (data as LumaWebhookConfig[] | null) ?? []
}

export async function updateLumaWebhookConfig(
  configId: string,
  tenantId: string,
  updates: {
    eventTypes?: LumaEventType[]
    agentId?: string | null
    isActive?: boolean
  }
): Promise<LumaWebhookConfig | null> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.eventTypes !== undefined) updateData.event_types = updates.eventTypes
  if (updates.agentId !== undefined) updateData.agent_id = updates.agentId
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive

  const { data, error } = await getSupabase()
    .from("luma_webhook_configs")
    .update(updateData)
    .eq("id", configId)
    .eq("tenant_id", tenantId)
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to update Luma webhook config:", error)
    return null
  }

  return data as LumaWebhookConfig
}

export async function deleteLumaWebhookConfig(
  configId: string,
  tenantId: string
): Promise<boolean> {
  const { error } = await getSupabase()
    .from("luma_webhook_configs")
    .delete()
    .eq("id", configId)
    .eq("tenant_id", tenantId)

  return !error
}

export async function regenerateLumaWebhookToken(
  configId: string,
  tenantId: string
): Promise<{ config: LumaWebhookConfig; webhookUrl: string } | null> {
  const newToken = crypto.randomBytes(32).toString("hex")

  const { data, error } = await getSupabase()
    .from("luma_webhook_configs")
    .update({
      webhook_token: newToken,
      updated_at: new Date().toISOString(),
    })
    .eq("id", configId)
    .eq("tenant_id", tenantId)
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to regenerate Luma webhook token:", error)
    return null
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const webhookUrl = `${baseUrl}/api/public/webhooks/luma/${newToken}`

  return { config: data as LumaWebhookConfig, webhookUrl }
}

// ============================================================================
// Luma Webhook Event Logging
// ============================================================================

export type StoreLumaWebhookEventInput = {
  configId: string
  eventType: LumaEventType
  payload: Json
  agentRunId?: string
}

export async function storeLumaWebhookEvent(
  input: StoreLumaWebhookEventInput
): Promise<boolean> {
  const { error } = await getSupabase()
    .from("luma_webhook_events")
    .insert({
      config_id: input.configId,
      event_type: input.eventType,
      payload: input.payload,
      agent_run_id: input.agentRunId ?? null,
    })

  if (error) {
    console.error("Failed to store Luma webhook event:", error)
    return false
  }

  return true
}

// ============================================================================
// Trigger Input Builders
// ============================================================================

export interface EmailTriggerInput {
  trigger: "email"
  emailAddressId: string
  inboundEmailId: string
  from: string
  subject: string
  body: string
  attachments?: Array<{
    id: string
    filename: string
    contentType: string
  }>
}

export interface LumaTriggerInput {
  trigger: "luma_webhook"
  configId: string
  eventType: LumaEventType
  data: Json
}

export interface ManualTriggerInput {
  trigger: "manual"
  prompt: string
  context?: Json
}

export interface ScheduledTriggerInput {
  trigger: "scheduled"
  scheduleId: string
  scheduleName: string
  input?: Json
}

export type AgentTriggerInput =
  | EmailTriggerInput
  | LumaTriggerInput
  | ManualTriggerInput
  | ScheduledTriggerInput

export function buildEmailTriggerInput(
  emailAddress: EmailAddress,
  inboundEmail: InboundEmail
): EmailTriggerInput {
  return {
    trigger: "email",
    emailAddressId: emailAddress.id,
    inboundEmailId: inboundEmail.id,
    from: inboundEmail.from_address,
    subject: inboundEmail.subject ?? "(no subject)",
    body: inboundEmail.body_text ?? inboundEmail.body_html ?? "",
    attachments: (inboundEmail.attachments as Array<{
      id: string
      filename: string
      contentType: string
    }>) ?? undefined,
  }
}

export function buildLumaTriggerInput(
  config: LumaWebhookConfig,
  eventType: LumaEventType,
  eventData: Json
): LumaTriggerInput {
  return {
    trigger: "luma_webhook",
    configId: config.id,
    eventType,
    data: eventData,
  }
}

export function getTriggerType(input: AgentTriggerInput): TriggerType {
  switch (input.trigger) {
    case "email":
      return "email"
    case "luma_webhook":
      return "luma_webhook"
    case "scheduled":
      return "scheduled"
    case "manual":
    default:
      return "manual"
  }
}
