import { supabase as getSupabase } from "@/lib/db/client"
import type { OrgApiCredential, ApiCredentialProvider } from "@/lib/db/agent-types"
import { encryptToken, decryptToken } from "@/lib/services/encryption"

export type SaveCredentialInput = {
  tenantId: string
  provider: ApiCredentialProvider
  apiKey: string
  label?: string
  accountIdentifier?: string
}

export type UpdateCredentialInput = {
  apiKey?: string
  label?: string
  accountIdentifier?: string
  isActive?: boolean
}

export async function saveCredential(
  input: SaveCredentialInput
): Promise<OrgApiCredential | null> {
  const encryptedKey = encryptToken(input.apiKey)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
  const { data, error } = await (getSupabase() as any)
    .from("org_api_credentials")
    .upsert(
      {
        tenant_id: input.tenantId,
        provider: input.provider,
        api_key_encrypted: encryptedKey,
        label: input.label ?? null,
        account_identifier: input.accountIdentifier ?? null,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,provider" }
    )
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to save credential:", error)
    return null
  }

  return data as OrgApiCredential
}

export async function getCredential(
  tenantId: string,
  provider: ApiCredentialProvider
): Promise<OrgApiCredential | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
  const { data } = await (getSupabase() as any)
    .from("org_api_credentials")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("provider", provider)
    .single()

  return data as OrgApiCredential | null
}

export async function listCredentials(
  tenantId: string
): Promise<OrgApiCredential[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
  const { data } = await (getSupabase() as any)
    .from("org_api_credentials")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  return (data as OrgApiCredential[] | null) ?? []
}

export async function updateCredential(
  tenantId: string,
  provider: ApiCredentialProvider,
  updates: UpdateCredentialInput
): Promise<OrgApiCredential | null> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.apiKey !== undefined) {
    updateData.api_key_encrypted = encryptToken(updates.apiKey)
  }
  if (updates.label !== undefined) {
    updateData.label = updates.label
  }
  if (updates.accountIdentifier !== undefined) {
    updateData.account_identifier = updates.accountIdentifier
  }
  if (updates.isActive !== undefined) {
    updateData.is_active = updates.isActive
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
  const { data, error } = await (getSupabase() as any)
    .from("org_api_credentials")
    .update(updateData)
    .eq("tenant_id", tenantId)
    .eq("provider", provider)
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to update credential:", error)
    return null
  }

  return data as OrgApiCredential
}

export async function deleteCredential(
  tenantId: string,
  provider: ApiCredentialProvider
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
  const { error } = await (getSupabase() as any)
    .from("org_api_credentials")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("provider", provider)

  return !error
}

export async function getDecryptedApiKey(
  credential: OrgApiCredential
): Promise<string | null> {
  if (!credential.api_key_encrypted) return null
  return decryptToken(credential.api_key_encrypted)
}

export async function getDecryptedApiKeyForProvider(
  tenantId: string,
  provider: ApiCredentialProvider
): Promise<string | null> {
  const credential = await getCredential(tenantId, provider)
  if (!credential || !credential.is_active) return null

  const apiKey = await getDecryptedApiKey(credential)

  if (apiKey) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
    await (getSupabase() as any)
      .from("org_api_credentials")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", credential.id)
  }

  return apiKey
}

export async function getLumaApiKey(tenantId: string): Promise<string | null> {
  return getDecryptedApiKeyForProvider(tenantId, "luma")
}
