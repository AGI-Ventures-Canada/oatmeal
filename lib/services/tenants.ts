import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { supabase as getSupabase } from "@/lib/db/client"
import type { Tenant } from "@/lib/db/hackathon-types"

export async function getOrCreateTenant(clerkOrgId: string): Promise<Tenant | null> {
  const { data, error } = await getSupabase()
    .from("tenants")
    .upsert(
      { clerk_org_id: clerkOrgId, name: `Org ${clerkOrgId.slice(0, 8)}` },
      { onConflict: "clerk_org_id" }
    )
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to get or create tenant:", error)
    return null
  }

  return data as Tenant
}

export async function getOrCreatePersonalTenant(
  clerkUserId: string,
  userName?: string
): Promise<Tenant | null> {
  const { data, error } = await getSupabase()
    .from("tenants")
    .upsert(
      {
        clerk_user_id: clerkUserId,
        name: userName ?? `Personal ${clerkUserId.slice(0, 8)}`,
      },
      { onConflict: "clerk_user_id" }
    )
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to get or create personal tenant:", error)
    return null
  }

  return data as Tenant
}

export async function resolvePageTenant(): Promise<Tenant> {
  const { userId, orgId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  let tenant: Tenant | null

  if (orgId) {
    tenant = await getOrCreateTenant(orgId)
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
