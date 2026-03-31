import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"

export type ChallengeData = {
  title: string | null
  body: string | null
  releasedAt: string | null
}

export async function getChallenge(hackathonId: string): Promise<ChallengeData | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("hackathons")
    .select("challenge_title, challenge_body, challenge_released_at")
    .eq("id", hackathonId)
    .single()

  if (error || !data) return null

  return {
    title: data.challenge_title,
    body: data.challenge_body,
    releasedAt: data.challenge_released_at,
  }
}

export async function saveChallenge(
  hackathonId: string,
  tenantId: string,
  input: { title: string; body: string }
): Promise<boolean> {
  const client = getSupabase() as unknown as SupabaseClient

  const { error } = await client
    .from("hackathons")
    .update({
      challenge_title: input.title,
      challenge_body: input.body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", hackathonId)
    .eq("tenant_id", tenantId)

  if (error) {
    console.error("Failed to save challenge:", error)
    return false
  }

  return true
}

export async function releaseChallenge(
  hackathonId: string,
  tenantId: string
): Promise<boolean> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: hackathon, error: fetchErr } = await client
    .from("hackathons")
    .select("challenge_title, challenge_released_at")
    .eq("id", hackathonId)
    .eq("tenant_id", tenantId)
    .single()

  if (fetchErr || !hackathon) {
    console.error("Failed to fetch hackathon for challenge release:", fetchErr)
    return false
  }

  if (hackathon.challenge_released_at) return true
  if (!hackathon.challenge_title) return false

  const { error } = await client
    .from("hackathons")
    .update({
      challenge_released_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", hackathonId)
    .eq("tenant_id", tenantId)

  if (error) {
    console.error("Failed to release challenge:", error)
    return false
  }

  return true
}
