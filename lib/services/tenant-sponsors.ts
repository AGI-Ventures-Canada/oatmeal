import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"

export interface TenantSponsor {
  id: string
  tenant_id: string
  name: string
  logo_url: string | null
  logo_url_dark: string | null
  website_url: string | null
  created_at: string
  updated_at: string
}

export interface UpsertTenantSponsorInput {
  name: string
  logoUrl?: string | null
  logoUrlDark?: string | null
  websiteUrl?: string | null
}

export async function upsertTenantSponsor(
  tenantId: string,
  input: UpsertTenantSponsorInput
): Promise<TenantSponsor | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("tenant_sponsors")
    .upsert(
      {
        tenant_id: tenantId,
        name: input.name,
        logo_url: input.logoUrl ?? null,
        logo_url_dark: input.logoUrlDark ?? null,
        website_url: input.websiteUrl ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,name" }
    )
    .select()
    .single()

  if (error) {
    console.error("Failed to upsert tenant sponsor:", error)
    return null
  }

  return data as unknown as TenantSponsor
}

export async function updateTenantSponsorLogos(
  id: string,
  tenantId: string,
  updates: { logoUrl?: string | null; logoUrlDark?: string | null }
): Promise<void> {
  const client = getSupabase() as unknown as SupabaseClient

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.logoUrl !== undefined) updateData.logo_url = updates.logoUrl
  if (updates.logoUrlDark !== undefined) updateData.logo_url_dark = updates.logoUrlDark

  const { error } = await client
    .from("tenant_sponsors")
    .update(updateData)
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) {
    console.error("Failed to update tenant sponsor logos:", error)
  }
}

export interface TenantSponsorSearchResult {
  id: string
  name: string
  logo_url: string | null
  logo_url_dark: string | null
  website_url: string | null
}

export async function searchTenantSponsors(
  tenantId: string,
  query: string,
  options?: { excludeNames?: string[]; limit?: number }
): Promise<TenantSponsorSearchResult[]> {
  if (!query || query.length < 2) return []

  const client = getSupabase() as unknown as SupabaseClient
  const limit = options?.limit ?? 5
  const excludeNames = options?.excludeNames ?? []

  const sanitized = query.replace(/[%_().,\\]/g, "")
  if (sanitized.length < 2) return []

  let queryBuilder = client
    .from("tenant_sponsors")
    .select("id, name, logo_url, logo_url_dark, website_url")
    .eq("tenant_id", tenantId)
    .ilike("name", `%${sanitized}%`)
    .limit(limit)

  if (excludeNames.length > 0) {
    const escaped = excludeNames.map((n) => `"${n.replace(/"/g, '""')}"`)
    queryBuilder = queryBuilder.not("name", "in", `(${escaped.join(",")})`)
  }

  const { data, error } = await queryBuilder

  if (error) {
    console.error("Failed to search tenant sponsors:", error)
    return []
  }

  return (data ?? []) as TenantSponsorSearchResult[]
}
