import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Hackathon, TenantProfile, HackathonSponsor, HackathonStatus, HackathonJudgeDisplay, Prize, JudgingMode } from "@/lib/db/hackathon-types"

export type PublicPrize = Omit<Prize, "distribution_method" | "monetary_value" | "currency">
import { getEffectiveStatus } from "@/lib/utils/timeline"
import { sortByStatusPriority } from "@/lib/utils/sort-hackathons"

export type PublicHackathon = Hackathon & {
  organizer: Pick<TenantProfile, "id" | "name" | "slug" | "logo_url" | "logo_url_dark" | "clerk_org_id">
  sponsors: (HackathonSponsor & {
    tenant?: Pick<TenantProfile, "slug" | "name" | "logo_url" | "logo_url_dark"> | null
  })[]
  judges: HackathonJudgeDisplay[]
  prizes: PublicPrize[]
}

export async function getPublicHackathonById(
  id: string
): Promise<{ slug: string } | null> {
  const client = getSupabase() as unknown as SupabaseClient
  const { data, error } = await client
    .from("hackathons")
    .select("slug")
    .eq("id", id)
    .single()

  if (error || !data) {
    return null
  }

  return { slug: data.slug }
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

  const { data: judges, error: judgesError } = await client
    .from("hackathon_judges_display")
    .select("*")
    .eq("hackathon_id", hackathon.id)
    .order("display_order")

  if (judgesError) {
    console.error("Failed to get hackathon judges:", judgesError)
  }

  const { data: prizes, error: prizesError } = await client
    .from("prizes")
    .select("*")
    .eq("hackathon_id", hackathon.id)
    .order("display_order")

  if (prizesError) {
    console.error("Failed to get hackathon prizes:", prizesError)
  }

  const publicPrizes = ((prizes || []) as unknown as Prize[]).map(({ distribution_method, monetary_value, currency, ...rest }) => rest)

  return {
    ...hackathon,
    status: getEffectiveStatus(hackathon),
    sponsors: sponsors || [],
    judges: (judges || []) as unknown as HackathonJudgeDisplay[],
    prizes: publicPrizes,
  } as unknown as PublicHackathon
}

type HackathonWithOrganizer = Hackathon & {
  organizer: Pick<TenantProfile, "id" | "name" | "slug" | "logo_url" | "logo_url_dark" | "clerk_org_id">
}

export async function listPublicHackathons(
  options?: { search?: string; page?: number; limit?: number }
): Promise<{ hackathons: HackathonWithOrganizer[]; total: number }> {
  const client = getSupabase() as unknown as SupabaseClient

  let query = client
    .from("hackathons")
    .select(`
      *,
      organizer:tenants!tenant_id(id, name, slug, logo_url, logo_url_dark, clerk_org_id)
    `)
    .in("status", ["published", "registration_open", "active", "judging", "completed"])
    .order("starts_at", { ascending: true })

  if (options?.search && options.search.length >= 2) {
    const sanitized = options.search.replace(/[%_().,\\]/g, "")
    if (sanitized.length >= 2) {
      query = query.or(`name.ilike.%${sanitized}%,description.ilike.%${sanitized}%`)
    }
  }

  const { data, error } = await query

  if (error) {
    console.error("Failed to list public hackathons:", error)
    return { hackathons: [], total: 0 }
  }

  const sorted = sortByStatusPriority(data as unknown as HackathonWithOrganizer[])
  const total = sorted.length

  const page = options?.page ?? 1
  const limit = options?.limit ?? total
  const start = (page - 1) * limit
  const hackathons = sorted
    .slice(start, start + limit)
    .map((h) => ({ ...h, status: getEffectiveStatus(h) })) as unknown as HackathonWithOrganizer[]

  return { hackathons, total }
}

export type OrganizerCheckResult =
  | { status: "ok"; hackathon: Hackathon }
  | { status: "not_found" }
  | { status: "not_authorized" }

export async function getHackathonByIdForOrganizer(
  hackathonId: string,
  tenantId: string
): Promise<Hackathon | null> {
  const result = await checkHackathonOrganizer(hackathonId, tenantId)
  return result.status === "ok" ? result.hackathon : null
}

export async function checkHackathonOrganizer(
  hackathonId: string,
  tenantId: string
): Promise<OrganizerCheckResult> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("hackathons")
    .select("*")
    .eq("id", hackathonId)
    .single()

  if (error || !data) {
    return { status: "not_found" }
  }

  if (data.tenant_id !== tenantId) {
    return { status: "not_authorized" }
  }

  return { status: "ok", hackathon: data as unknown as Hackathon }
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

  const { data: judges } = await client
    .from("hackathon_judges_display")
    .select("*")
    .eq("hackathon_id", hackathon.id)
    .order("display_order")

  const { data: prizes } = await client
    .from("prizes")
    .select("*")
    .eq("hackathon_id", hackathon.id)
    .order("display_order")

  const fullPrizes = ((prizes || []) as unknown as Prize[]).map(({ distribution_method, monetary_value, currency, ...rest }) => rest)

  return {
    ...hackathon,
    status: getEffectiveStatus(hackathon),
    sponsors: sponsors || [],
    judges: (judges || []) as unknown as HackathonJudgeDisplay[],
    prizes: fullPrizes,
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
    anonymousJudging?: boolean
    judgingMode?: JudgingMode
    locationType?: "in_person" | "virtual" | null
    locationName?: string | null
    locationUrl?: string | null
    locationLatitude?: number | null
    locationLongitude?: number | null
    requireLocationVerification?: boolean
    maxParticipants?: number | null
    minTeamSize?: number
    maxTeamSize?: number
    allowSolo?: boolean
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
  if (updates.anonymousJudging !== undefined) updateData.anonymous_judging = updates.anonymousJudging
  if (updates.judgingMode !== undefined) updateData.judging_mode = updates.judgingMode
  if (updates.locationType !== undefined) updateData.location_type = updates.locationType
  if (updates.locationName !== undefined) updateData.location_name = updates.locationName
  if (updates.locationUrl !== undefined) updateData.location_url = updates.locationUrl
  if (updates.locationLatitude !== undefined) updateData.location_latitude = updates.locationLatitude
  if (updates.locationLongitude !== undefined) updateData.location_longitude = updates.locationLongitude
  if (updates.requireLocationVerification !== undefined) updateData.require_location_verification = updates.requireLocationVerification
  if (updates.maxParticipants !== undefined) updateData.max_participants = updates.maxParticipants
  if (updates.minTeamSize !== undefined) updateData.min_team_size = updates.minTeamSize
  if (updates.maxTeamSize !== undefined) updateData.max_team_size = updates.maxTeamSize
  if (updates.allowSolo !== undefined) updateData.allow_solo = updates.allowSolo

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
