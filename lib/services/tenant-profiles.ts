import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { TenantProfile, Hackathon } from "@/lib/db/hackathon-types"

export async function getPublicTenantBySlug(
  slug: string
): Promise<TenantProfile | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("tenants")
    .select("id, clerk_org_id, clerk_user_id, name, slug, logo_url, logo_url_dark, description, website_url, created_at, updated_at")
    .eq("slug", slug)
    .single()

  if (error) {
    console.error("Failed to get public tenant by slug:", error)
    return null
  }

  return data as unknown as TenantProfile
}

export async function getPublicTenantById(
  tenantId: string
): Promise<TenantProfile | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("tenants")
    .select("id, clerk_org_id, clerk_user_id, name, slug, logo_url, logo_url_dark, description, website_url, created_at, updated_at")
    .eq("id", tenantId)
    .single()

  if (error) {
    console.error("Failed to get public tenant by ID:", error)
    return null
  }

  return data as unknown as TenantProfile
}

export async function updateTenantProfile(
  tenantId: string,
  updates: {
    slug?: string | null
    logoUrl?: string | null
    logoUrlDark?: string | null
    description?: string | null
    websiteUrl?: string | null
    name?: string
  }
): Promise<TenantProfile | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const updateData: Record<string, unknown> = {}
  if (updates.slug !== undefined) updateData.slug = updates.slug
  if (updates.logoUrl !== undefined) updateData.logo_url = updates.logoUrl
  if (updates.logoUrlDark !== undefined) updateData.logo_url_dark = updates.logoUrlDark
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.websiteUrl !== undefined) updateData.website_url = updates.websiteUrl
  if (updates.name !== undefined) updateData.name = updates.name

  const { data, error } = await client
    .from("tenants")
    .update(updateData)
    .eq("id", tenantId)
    .select("id, clerk_org_id, clerk_user_id, name, slug, logo_url, logo_url_dark, description, website_url, created_at, updated_at")
    .single()

  if (error) {
    console.error("Failed to update tenant profile:", error)
    return null
  }

  return data as unknown as TenantProfile
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export async function isSlugAvailable(
  slug: string,
  excludeTenantId?: string
): Promise<boolean> {
  const client = getSupabase() as unknown as SupabaseClient

  let query = client
    .from("tenants")
    .select("id")
    .eq("slug", slug)

  if (excludeTenantId) {
    query = query.neq("id", excludeTenantId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    console.error("Failed to check slug availability:", error)
    return false
  }

  return data === null
}

export type TenantWithHackathons = TenantProfile & {
  hackathons: Hackathon[]
}

export async function getPublicTenantWithHackathons(
  slug: string
): Promise<TenantWithHackathons | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: tenant, error: tenantError } = await client
    .from("tenants")
    .select("id, clerk_org_id, clerk_user_id, name, slug, logo_url, logo_url_dark, description, website_url, created_at, updated_at")
    .eq("slug", slug)
    .single()

  if (tenantError || !tenant) {
    console.error("Failed to get public tenant:", tenantError)
    return null
  }

  const { data: hackathons, error: hackathonsError } = await client
    .from("hackathons")
    .select("*")
    .eq("tenant_id", tenant.id)
    .in("status", ["published", "registration_open", "active", "judging", "completed"])
    .order("starts_at", { ascending: false })

  if (hackathonsError) {
    console.error("Failed to get tenant hackathons:", hackathonsError)
  }

  return {
    ...(tenant as unknown as TenantProfile),
    hackathons: (hackathons || []) as unknown as Hackathon[],
  }
}
