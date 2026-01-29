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
