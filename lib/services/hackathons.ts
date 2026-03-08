import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Hackathon, HackathonParticipant } from "@/lib/db/hackathon-types"
import { sortByStartDate } from "@/lib/utils/format"
import { clerkClient } from "@clerk/nextjs/server"

type ParticipantWithHackathon = HackathonParticipant & {
  hackathons: Hackathon
}

export async function listParticipatingHackathons(
  clerkUserId: string,
  options?: { search?: string }
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

  let hackathons = (data as unknown as ParticipantWithHackathon[])
    .filter((r) => r.hackathons)
    .map((r) => ({ ...r.hackathons, role: r.role }))

  if (options?.search && options.search.length >= 2) {
    const q = options.search.toLowerCase()
    hackathons = hackathons.filter(
      (h) => h.name.toLowerCase().includes(q) || h.description?.toLowerCase().includes(q)
    )
  }

  return sortByStartDate(hackathons)
}

export async function listOrganizedHackathons(
  tenantId: string,
  options?: { search?: string }
): Promise<Hackathon[]> {
  const client = getSupabase() as unknown as SupabaseClient
  let query = client
    .from("hackathons")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("starts_at", { ascending: true, nullsFirst: false })

  if (options?.search && options.search.length >= 2) {
    const sanitized = options.search.replace(/[%_().,\\]/g, "")
    if (sanitized.length >= 2) {
      query = query.or(`name.ilike.%${sanitized}%,description.ilike.%${sanitized}%`)
    }
  }

  const { data, error } = await query

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
  tenantId: string,
  options?: { search?: string }
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

  let hackathons = (data as unknown as SponsorWithHackathon[])
    .filter((r) => r.hackathons)
    .map((r) => r.hackathons)

  if (options?.search && options.search.length >= 2) {
    const q = options.search.toLowerCase()
    hackathons = hackathons.filter(
      (h) => h.name.toLowerCase().includes(q) || h.description?.toLowerCase().includes(q)
    )
  }

  return sortByStartDate(hackathons)
}

export async function listJudgingHackathons(
  clerkUserId: string,
  options?: { search?: string }
): Promise<Hackathon[]> {
  const client = getSupabase() as unknown as SupabaseClient
  const { data, error } = await client
    .from("hackathon_participants")
    .select("hackathon_id, role, hackathons(*)")
    .eq("clerk_user_id", clerkUserId)
    .eq("role", "judge")

  if (error) {
    console.error("Failed to list judging hackathons:", error)
    return []
  }

  let hackathons = (data as unknown as ParticipantWithHackathon[])
    .filter((r) => r.hackathons)
    .map((r) => r.hackathons)

  if (options?.search && options.search.length >= 2) {
    const q = options.search.toLowerCase()
    hackathons = hackathons.filter(
      (h) => h.name.toLowerCase().includes(q) || h.description?.toLowerCase().includes(q)
    )
  }

  return sortByStartDate(hackathons)
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
  participantId: string | null
  participantRole: string | null
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
      .select("id, role")
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
    participantId: registrationResult.data?.id ?? null,
    participantRole: registrationResult.data?.role ?? null,
    participantCount: countResult.count ?? 0,
  }
}

type RegisterResult =
  | { success: true; participantId: string; teamId: string }
  | { success: false; error: string; code: string }

export async function registerForHackathon(
  hackathonId: string,
  clerkUserId: string,
  teamName?: string
): Promise<RegisterResult> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client.rpc("register_for_hackathon", {
    p_hackathon_id: hackathonId,
    p_clerk_user_id: clerkUserId,
    p_team_name: teamName ?? null,
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
    return { success: true, participantId: result.participant_id, teamId: result.team_id }
  }

  return {
    success: false,
    error: result.error_message || "Failed to register",
    code: result.error_code || "unknown",
  }
}

export type TeamMember = {
  clerkUserId: string
  displayName: string | null
  role: "participant" | "judge" | "mentor" | "organizer"
  isCaptain: boolean
  registeredAt: string
}

export type ParticipantTeamInfo = {
  team: {
    id: string
    name: string
    status: "forming" | "locked" | "disbanded"
    inviteCode: string
    captainClerkUserId: string
  }
  members: TeamMember[]
  pendingInvitations: {
    id: string
    email: string
    expiresAt: string
    createdAt: string
  }[]
  isCaptain: boolean
} | null

export async function getParticipantTeamInfo(
  hackathonId: string,
  clerkUserId: string
): Promise<ParticipantTeamInfo> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: participant } = await client
    .from("hackathon_participants")
    .select("team_id")
    .eq("hackathon_id", hackathonId)
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle()

  if (!participant?.team_id) {
    return null
  }

  const [teamResult, membersResult, invitationsResult] = await Promise.all([
    client
      .from("teams")
      .select("id, name, status, invite_code, captain_clerk_user_id")
      .eq("id", participant.team_id)
      .single(),
    client
      .from("hackathon_participants")
      .select("clerk_user_id, role, registered_at")
      .eq("team_id", participant.team_id)
      .order("registered_at", { ascending: true }),
    client
      .from("team_invitations")
      .select("id, email, expires_at, created_at")
      .eq("team_id", participant.team_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ])

  if (teamResult.error || !teamResult.data) {
    console.error("Failed to get team:", teamResult.error)
    return null
  }

  const team = teamResult.data
  const memberData = membersResult.data ?? []

  const memberUserIds = memberData.map((m) => m.clerk_user_id)
  const userDisplayNames: Record<string, string | null> = {}

  if (memberUserIds.length > 0) {
    try {
      const client = await clerkClient()
      const users = await client.users.getUserList({ userId: memberUserIds })
      for (const user of users.data) {
        const displayName = user.firstName
          ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
          : user.username || null
        userDisplayNames[user.id] = displayName
      }
    } catch {
      // Silently fail - displayName will be null
    }
  }

  const members = memberData.map((m) => ({
    clerkUserId: m.clerk_user_id,
    displayName: userDisplayNames[m.clerk_user_id] || null,
    role: m.role as TeamMember["role"],
    isCaptain: m.clerk_user_id === team.captain_clerk_user_id,
    registeredAt: m.registered_at,
  }))

  const pendingInvitations = (invitationsResult.data ?? []).map((inv) => ({
    id: inv.id,
    email: inv.email,
    expiresAt: inv.expires_at,
    createdAt: inv.created_at,
  }))

  return {
    team: {
      id: team.id,
      name: team.name,
      status: team.status,
      inviteCode: team.invite_code,
      captainClerkUserId: team.captain_clerk_user_id,
    },
    members,
    pendingInvitations,
    isCaptain: team.captain_clerk_user_id === clerkUserId,
  }
}
