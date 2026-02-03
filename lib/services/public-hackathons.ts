import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Hackathon, TenantProfile, HackathonSponsor, HackathonStatus } from "@/lib/db/hackathon-types"

export type PublicHackathon = Hackathon & {
  organizer: Pick<TenantProfile, "id" | "name" | "slug" | "logo_url" | "logo_url_dark" | "clerk_org_id">
  sponsors: (HackathonSponsor & {
    tenant?: Pick<TenantProfile, "slug" | "name" | "logo_url" | "logo_url_dark"> | null
  })[]
}

export async function getPublicHackathon(
  slug: string,
  options?: { includeUnpublished?: boolean }
): Promise<PublicHackathon | null> {
  const client = getSupabase() as unknown as SupabaseClient

  let query = client
    .from("hackathons")
    .select(`
      *,
      organizer:tenants!tenant_id(id, name, slug, logo_url, logo_url_dark, clerk_org_id)
    `)
    .eq("slug", slug)

  if (!options?.includeUnpublished) {
    query = query.in("status", ["published", "registration_open", "active", "judging", "completed"])
  }

  const { data: hackathon, error: hackathonError } = await query.single()

  if (hackathonError || !hackathon) {
    // Only log actual errors, not "not found" (PGRST116 = 0 rows)
    if (hackathonError && hackathonError.code !== "PGRST116") {
      console.error("Failed to get public hackathon:", hackathonError)
    }
    return null
  }

  const { data: sponsors, error: sponsorsError } = await client
    .from("hackathon_sponsors")
    .select(`
      *,
      tenant:tenants!sponsor_tenant_id(slug, name, logo_url, logo_url_dark)
    `)
    .eq("hackathon_id", hackathon.id)
    .order("tier")
    .order("display_order")

  if (sponsorsError) {
    console.error("Failed to get hackathon sponsors:", sponsorsError)
  }

  return {
    ...hackathon,
    sponsors: sponsors || [],
  } as unknown as PublicHackathon
}

export async function listPublicHackathons(): Promise<
  (Hackathon & { organizer: Pick<TenantProfile, "id" | "name" | "slug" | "logo_url" | "logo_url_dark" | "clerk_org_id"> })[]
> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("hackathons")
    .select(`
      *,
      organizer:tenants!tenant_id(id, name, slug, logo_url, logo_url_dark, clerk_org_id)
    `)
    .in("status", ["published", "registration_open", "active", "judging", "completed"])
    .order("starts_at", { ascending: true })

  if (error) {
    console.error("Failed to list public hackathons:", error)
    return []
  }

  return data as unknown as (Hackathon & {
    organizer: Pick<TenantProfile, "id" | "name" | "slug" | "logo_url" | "logo_url_dark" | "clerk_org_id">
  })[]
}

export async function getHackathonByIdForOrganizer(
  hackathonId: string,
  tenantId: string
): Promise<Hackathon | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("hackathons")
    .select("*")
    .eq("id", hackathonId)
    .eq("tenant_id", tenantId)
    .single()

  if (error) {
    console.error("Failed to get hackathon for organizer:", error)
    return null
  }

  return data as unknown as Hackathon
}

export async function getHackathonByIdWithFullData(
  hackathonId: string,
  tenantId: string
): Promise<PublicHackathon | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: hackathon, error: hackathonError } = await client
    .from("hackathons")
    .select(`
      *,
      organizer:tenants!tenant_id(id, name, slug, logo_url, logo_url_dark, clerk_org_id)
    `)
    .eq("id", hackathonId)
    .eq("tenant_id", tenantId)
    .single()

  if (hackathonError || !hackathon) {
    if (hackathonError && hackathonError.code !== "PGRST116") {
      console.error("Failed to get hackathon with full data:", hackathonError)
    }
    return null
  }

  const { data: sponsors, error: sponsorsError } = await client
    .from("hackathon_sponsors")
    .select(`
      *,
      tenant:tenants!sponsor_tenant_id(slug, name, logo_url, logo_url_dark)
    `)
    .eq("hackathon_id", hackathon.id)
    .order("tier")
    .order("display_order")

  if (sponsorsError) {
    console.error("Failed to get hackathon sponsors:", sponsorsError)
  }

  return {
    ...hackathon,
    sponsors: sponsors || [],
  } as unknown as PublicHackathon
}

export async function getHackathonByIdWithAccess(
  hackathonId: string,
  tenantId: string,
  clerkUserId: string
): Promise<(Hackathon & { isOrganizer: boolean; isSponsor: boolean }) | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: hackathon, error: hackathonError } = await client
    .from("hackathons")
    .select("*")
    .eq("id", hackathonId)
    .single()

  if (hackathonError || !hackathon) {
    return null
  }

  const isOrganizer = hackathon.tenant_id === tenantId

  if (isOrganizer) {
    return { ...(hackathon as unknown as Hackathon), isOrganizer: true, isSponsor: false }
  }

  const { data: sponsor } = await client
    .from("hackathon_sponsors")
    .select("id")
    .eq("hackathon_id", hackathonId)
    .eq("sponsor_tenant_id", tenantId)
    .single()

  if (sponsor) {
    return { ...(hackathon as unknown as Hackathon), isOrganizer: false, isSponsor: true }
  }

  const { data: participant } = await client
    .from("hackathon_participants")
    .select("id")
    .eq("hackathon_id", hackathonId)
    .eq("clerk_user_id", clerkUserId)
    .single()

  if (participant) {
    return { ...(hackathon as unknown as Hackathon), isOrganizer: false, isSponsor: false }
  }

  return null
}

export async function updateHackathonSettings(
  hackathonId: string,
  tenantId: string,
  updates: {
    bannerUrl?: string | null
    name?: string
    description?: string | null
    rules?: string | null
    startsAt?: string | null
    endsAt?: string | null
    registrationOpensAt?: string | null
    registrationClosesAt?: string | null
    status?: HackathonStatus
  }
): Promise<Hackathon | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const updateData: Record<string, unknown> = {}
  if (updates.bannerUrl !== undefined) updateData.banner_url = updates.bannerUrl
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.rules !== undefined) updateData.rules = updates.rules
  if (updates.startsAt !== undefined) updateData.starts_at = updates.startsAt
  if (updates.endsAt !== undefined) updateData.ends_at = updates.endsAt
  if (updates.registrationOpensAt !== undefined) updateData.registration_opens_at = updates.registrationOpensAt
  if (updates.registrationClosesAt !== undefined) updateData.registration_closes_at = updates.registrationClosesAt
  if (updates.status !== undefined) updateData.status = updates.status

  const { data, error } = await client
    .from("hackathons")
    .update(updateData)
    .eq("id", hackathonId)
    .eq("tenant_id", tenantId)
    .select()
    .single()

  if (error) {
    console.error("Failed to update hackathon settings:", error)
    return null
  }

  return data as unknown as Hackathon
}
