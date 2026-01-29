import { supabase as getSupabase } from "@/lib/db/client"
import type { Tenant } from "@/lib/db/hackathon-types"

export async function getOrCreateTenant(clerkOrgId: string): Promise<Tenant | null> {
  const { data: existing } = await getSupabase()
    .from("tenants")
    .select("*")
    .eq("clerk_org_id", clerkOrgId)
    .single()

  if (existing) {
    return existing as Tenant
  }

  const { data: created, error } = await getSupabase()
    .from("tenants")
    .insert({
      clerk_org_id: clerkOrgId,
      name: `Org ${clerkOrgId.slice(0, 8)}`,
    })
    .select()
    .single()

  if (error || !created) {
    console.error("Failed to create tenant:", error)
    return null
  }

  return created as Tenant
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
