import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Hackathon, HackathonParticipant } from "@/lib/db/hackathon-types"

type ParticipantWithHackathon = HackathonParticipant & {
  hackathons: Hackathon
}

export async function listParticipatingHackathons(
  clerkUserId: string
): Promise<(Hackathon & { role: string })[]> {
  const client = getSupabase() as unknown as SupabaseClient
  const { data, error } = await client
    .from("hackathon_participants")
    .select("hackathon_id, role, hackathons(*)")
    .eq("clerk_user_id", clerkUserId)

  if (error) {
    console.error("Failed to list participating hackathons:", error)
    return []
  }

  return (data as unknown as ParticipantWithHackathon[])
    .filter((r) => r.hackathons)
    .map((r) => ({ ...r.hackathons, role: r.role }))
}

export async function listOrganizedHackathons(
  tenantId: string
): Promise<Hackathon[]> {
  const client = getSupabase() as unknown as SupabaseClient
  const { data, error } = await client
    .from("hackathons")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to list organized hackathons:", error)
    return []
  }

  return data as unknown as Hackathon[]
}

type SponsorWithHackathon = {
  hackathon_id: string
  hackathons: Hackathon
}

export async function listSponsoredHackathons(
  tenantId: string
): Promise<Hackathon[]> {
  const client = getSupabase() as unknown as SupabaseClient
  const { data, error } = await client
    .from("hackathon_sponsors")
    .select("hackathon_id, hackathons(*)")
    .eq("sponsor_tenant_id", tenantId)

  if (error) {
    console.error("Failed to list sponsored hackathons:", error)
    return []
  }

  return (data as unknown as SponsorWithHackathon[])
    .filter((r) => r.hackathons)
    .map((r) => r.hackathons)
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export type CreateHackathonInput = {
  name: string
  description?: string | null
}

export async function createHackathon(
  tenantId: string,
  input: CreateHackathonInput
): Promise<Hackathon | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const baseSlug = generateSlug(input.name)
  let slug = baseSlug
  let attempt = 0

  while (attempt < 10) {
    const { data: existing } = await client
      .from("hackathons")
      .select("id")
      .eq("slug", slug)
      .maybeSingle()

    if (!existing) break
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  const { data, error } = await client
    .from("hackathons")
    .insert({
      tenant_id: tenantId,
      name: input.name,
      slug,
      description: input.description ?? null,
      status: "draft",
      min_team_size: 1,
      max_team_size: 5,
      allow_solo: true,
      metadata: {},
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to create hackathon:", error)
    return null
  }

  return data as unknown as Hackathon
}

export async function getHackathonById(
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
    console.error("Failed to get hackathon:", error)
    return null
  }

  return data as unknown as Hackathon
}

export async function isUserRegistered(
  hackathonId: string,
  clerkUserId: string
): Promise<boolean> {
  const client = getSupabase() as unknown as SupabaseClient
  const { data, error } = await client
    .from("hackathon_participants")
    .select("id")
    .eq("hackathon_id", hackathonId)
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle()

  if (error) {
    console.error("Failed to check registration:", error)
    return false
  }

  return data !== null
}

export async function getParticipantCount(hackathonId: string): Promise<number> {
  const client = getSupabase() as unknown as SupabaseClient
  const { count, error } = await client
    .from("hackathon_participants")
    .select("*", { count: "exact", head: true })
    .eq("hackathon_id", hackathonId)
    .eq("role", "participant")

  if (error) {
    console.error("Failed to get participant count:", error)
    return 0
  }

  return count ?? 0
}

export type RegistrationInfo = {
  isRegistered: boolean
  participantCount: number
}

export async function getRegistrationInfo(
  hackathonId: string,
  clerkUserId: string
): Promise<RegistrationInfo> {
  const client = getSupabase() as unknown as SupabaseClient

  const [registrationResult, countResult] = await Promise.all([
    client
      .from("hackathon_participants")
      .select("id")
      .eq("hackathon_id", hackathonId)
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle(),
    client
      .from("hackathon_participants")
      .select("*", { count: "exact", head: true })
      .eq("hackathon_id", hackathonId)
      .eq("role", "participant"),
  ])

  if (registrationResult.error) {
    console.error("Failed to check registration:", registrationResult.error)
  }
  if (countResult.error) {
    console.error("Failed to get participant count:", countResult.error)
  }

  return {
    isRegistered: registrationResult.data !== null,
    participantCount: countResult.count ?? 0,
  }
}

type RegisterResult =
  | { success: true; participantId: string }
  | { success: false; error: string; code: string }

export async function registerForHackathon(
  hackathonId: string,
  clerkUserId: string
): Promise<RegisterResult> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client.rpc("register_for_hackathon", {
    p_hackathon_id: hackathonId,
    p_clerk_user_id: clerkUserId,
  })

  if (error) {
    console.error("Failed to register for hackathon:", error)
    return { success: false, error: "Failed to register", code: "rpc_failed" }
  }

  const result = data?.[0]
  if (!result) {
    return { success: false, error: "Failed to register", code: "no_result" }
  }

  if (result.success) {
    return { success: true, participantId: result.participant_id }
  }

  return {
    success: false,
    error: result.error_message || "Failed to register",
    code: result.error_code || "unknown",
  }
}
