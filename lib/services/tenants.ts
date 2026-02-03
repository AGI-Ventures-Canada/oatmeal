import { auth, clerkClient } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { supabase as getSupabase } from "@/lib/db/client"
import type { Tenant } from "@/lib/db/hackathon-types"

export async function getOrCreateTenant(
  clerkOrgId: string,
  clerkOrgName?: string
): Promise<Tenant | null> {
  const { data: existing } = await getSupabase()
    .from("tenants")
    .select("*")
    .eq("clerk_org_id", clerkOrgId)
    .single()

  if (existing) {
    // Sync name from Clerk if provided and different
    if (clerkOrgName && existing.name !== clerkOrgName) {
      const { data: updated } = await getSupabase()
        .from("tenants")
        .update({ name: clerkOrgName, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single()
      return (updated as Tenant) ?? (existing as Tenant)
    }
    return existing as Tenant
  }

  const { data: created, error } = await getSupabase()
    .from("tenants")
    .insert({
      clerk_org_id: clerkOrgId,
      name: clerkOrgName ?? `Org ${clerkOrgId.slice(0, 8)}`,
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to create org tenant:", error)
    const { data: retried } = await getSupabase()
      .from("tenants")
      .select("*")
      .eq("clerk_org_id", clerkOrgId)
      .single()
    return (retried as Tenant) ?? null
  }

  return created as Tenant
}

export async function getOrCreatePersonalTenant(
  clerkUserId: string,
  userName?: string
): Promise<Tenant | null> {
  const { data: existing } = await getSupabase()
    .from("tenants")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .single()

  if (existing) return existing as Tenant

  const { data: created, error } = await getSupabase()
    .from("tenants")
    .insert({
      clerk_user_id: clerkUserId,
      name: userName ?? `Personal ${clerkUserId.slice(0, 8)}`,
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to create personal tenant:", error)
    const { data: retried } = await getSupabase()
      .from("tenants")
      .select("*")
      .eq("clerk_user_id", clerkUserId)
      .single()
    return (retried as Tenant) ?? null
  }

  return created as Tenant
}

export async function resolvePageTenant(): Promise<Tenant> {
  const { userId, orgId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  let tenant: Tenant | null

  if (orgId) {
    // Fetch org name from Clerk to sync
    let orgName: string | undefined
    try {
      const client = await clerkClient()
      const org = await client.organizations.getOrganization({ organizationId: orgId })
      orgName = org.name
    } catch {
      // Ignore errors fetching org name
    }
    tenant = await getOrCreateTenant(orgId, orgName)
  } else {
    tenant = await getOrCreatePersonalTenant(userId)
  }

  if (!tenant) {
    throw new Error("Failed to resolve tenant")
  }

  return tenant
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const { data } = await getSupabase()
    .from("tenants")
    .select("*")
    .eq("id", id)
    .single()

  return data as Tenant | null
}

export async function updateTenantName(
  tenantId: string,
  name: string
): Promise<Tenant | null> {
  const { data, error } = await getSupabase()
    .from("tenants")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", tenantId)
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to update tenant:", error)
    return null
  }

  return data as Tenant
}

export interface TenantSearchResult {
  id: string
  name: string
  slug: string | null
  logo_url: string | null
  website_url: string | null
}

export async function searchTenants(
  query: string,
  options?: { excludeIds?: string[]; limit?: number }
): Promise<TenantSearchResult[]> {
  if (!query || query.length < 2) return []

  const limit = options?.limit ?? 10
  const excludeIds = options?.excludeIds ?? []

  const sanitized = query.replace(/[%_().,\\]/g, "")
  if (sanitized.length < 2) return []

  let queryBuilder = getSupabase()
    .from("tenants")
    .select("id, name, slug, logo_url, website_url")
    .or(`name.ilike.%${sanitized}%,slug.ilike.%${sanitized}%`)
    .not("slug", "is", null)
    .limit(limit)

  if (excludeIds.length > 0) {
    queryBuilder = queryBuilder.not("id", "in", `(${excludeIds.join(",")})`)
  }

  const { data, error } = await queryBuilder

  if (error) {
    console.error("Failed to search tenants:", error)
    return []
  }

  return (data ?? []) as TenantSearchResult[]
}
