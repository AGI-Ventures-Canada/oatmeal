import { randomBytes } from "crypto"
import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { PrizeFulfillment, PrizeFulfillmentStatus } from "@/lib/db/hackathon-types"

const CLAIM_TOKEN_EXPIRY_DAYS = 30

export type FulfillmentWithDetails = PrizeFulfillment & {
  prizeName: string
  prizeValue: string | null
  submissionTitle: string
  teamName: string | null
}

export type FulfillmentSummary = Record<PrizeFulfillmentStatus, number>

const VALID_TRANSITIONS: Record<PrizeFulfillmentStatus, PrizeFulfillmentStatus[]> = {
  assigned: ["contacted", "shipped", "claimed"],
  contacted: ["shipped", "claimed"],
  shipped: ["claimed"],
  claimed: [],
}

export async function initializeFulfillments(hackathonId: string): Promise<number> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: prizes } = await client
    .from("prizes")
    .select("id")
    .eq("hackathon_id", hackathonId)

  if (!prizes || prizes.length === 0) return 0

  const prizeIds = prizes.map((p) => p.id)

  const { data: assignments } = await client
    .from("prize_assignments")
    .select("id")
    .in("prize_id", prizeIds)

  if (!assignments || assignments.length === 0) return 0

  const { data: existing } = await client
    .from("prize_fulfillments")
    .select("prize_assignment_id")
    .eq("hackathon_id", hackathonId)

  const existingSet = new Set((existing ?? []).map((e) => e.prize_assignment_id))
  const newAssignments = assignments.filter((a) => !existingSet.has(a.id))

  if (newAssignments.length === 0) return 0

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + CLAIM_TOKEN_EXPIRY_DAYS)

  const rows = newAssignments.map((a) => ({
    prize_assignment_id: a.id,
    hackathon_id: hackathonId,
    status: "assigned" as const,
    claim_token: randomBytes(32).toString("base64url"),
    claim_token_expires_at: expiresAt.toISOString(),
  }))

  const { error } = await client.from("prize_fulfillments").insert(rows)

  if (error) {
    console.error("Failed to initialize fulfillments:", error)
    return 0
  }

  return newAssignments.length
}

export async function listFulfillments(hackathonId: string): Promise<FulfillmentWithDetails[]> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: fulfillments, error } = await client
    .from("prize_fulfillments")
    .select(`
      *,
      prize_assignment:prize_assignments!prize_assignment_id(
        prize:prizes!prize_id(name, value),
        submission:submissions!submission_id(title, team_id)
      )
    `)
    .eq("hackathon_id", hackathonId)
    .order("created_at")

  if (error || !fulfillments) {
    console.error("Failed to list fulfillments:", error)
    return []
  }

  const teamIds = fulfillments
    .map((f: Record<string, unknown>) => {
      const pa = f.prize_assignment as { submission: { team_id: string | null } } | null
      return pa?.submission?.team_id
    })
    .filter((id): id is string => id !== null)

  let teamsMap: Record<string, string> = {}
  if (teamIds.length > 0) {
    const { data: teams } = await client
      .from("teams")
      .select("id, name")
      .in("id", [...new Set(teamIds)])
    teamsMap = Object.fromEntries((teams ?? []).map((t) => [t.id, t.name]))
  }

  return fulfillments.map((f: Record<string, unknown>) => {
    const pa = f.prize_assignment as {
      prize: { name: string; value: string | null }
      submission: { title: string; team_id: string | null }
    }
    const fulfillment = f as unknown as PrizeFulfillment
    return {
      ...fulfillment,
      prizeName: pa.prize.name,
      prizeValue: pa.prize.value,
      submissionTitle: pa.submission.title,
      teamName: pa.submission.team_id ? teamsMap[pa.submission.team_id] ?? null : null,
    }
  })
}

export async function updateFulfillmentStatus(
  fulfillmentId: string,
  hackathonId: string,
  status: PrizeFulfillmentStatus,
  updates?: {
    notes?: string
    trackingNumber?: string
    shippingAddress?: string
    recipientEmail?: string
    recipientName?: string
  }
): Promise<PrizeFulfillment | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: existing } = await client
    .from("prize_fulfillments")
    .select("status")
    .eq("id", fulfillmentId)
    .eq("hackathon_id", hackathonId)
    .single()

  if (!existing) return null

  const currentStatus = existing.status as PrizeFulfillmentStatus
  if (!VALID_TRANSITIONS[currentStatus].includes(status)) {
    return null
  }

  const now = new Date().toISOString()
  const updateData: Record<string, unknown> = {
    status,
    updated_at: now,
  }

  if (status === "contacted") updateData.contacted_at = now
  if (status === "shipped") updateData.shipped_at = now
  if (status === "claimed") updateData.claimed_at = now

  if (updates?.notes !== undefined) updateData.notes = updates.notes
  if (updates?.trackingNumber !== undefined) updateData.tracking_number = updates.trackingNumber
  if (updates?.shippingAddress !== undefined) updateData.shipping_address = updates.shippingAddress
  if (updates?.recipientEmail !== undefined) updateData.recipient_email = updates.recipientEmail
  if (updates?.recipientName !== undefined) updateData.recipient_name = updates.recipientName

  const { data, error } = await client
    .from("prize_fulfillments")
    .update(updateData)
    .eq("id", fulfillmentId)
    .eq("hackathon_id", hackathonId)
    .select()
    .single()

  if (error) {
    console.error("Failed to update fulfillment:", error)
    return null
  }

  return data as unknown as PrizeFulfillment
}

export type ClaimWithDetails = {
  fulfillmentId: string
  status: PrizeFulfillmentStatus
  prizeName: string
  prizeValue: string | null
  hackathonName: string
  hackathonSlug: string
  submissionTitle: string
  teamName: string | null
  recipientName: string | null
  recipientEmail: string | null
  shippingAddress: string | null
  claimedAt: string | null
  expiresAt: string | null
}

export async function getClaimByToken(token: string): Promise<ClaimWithDetails | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: fulfillment, error } = await client
    .from("prize_fulfillments")
    .select(`
      id, status, recipient_name, recipient_email, shipping_address, claimed_at, claim_token_expires_at,
      prize_assignment:prize_assignments!prize_assignment_id(
        prize:prizes!prize_id(name, value),
        submission:submissions!submission_id(title, team_id, hackathon_id)
      )
    `)
    .eq("claim_token", token)
    .single()

  if (error || !fulfillment) return null

  const pa = (fulfillment as Record<string, unknown>).prize_assignment as {
    prize: { name: string; value: string | null }
    submission: { title: string; team_id: string | null; hackathon_id: string }
  }

  const { data: hackathon } = await client
    .from("hackathons")
    .select("name, slug")
    .eq("id", pa.submission.hackathon_id)
    .single()

  let teamName: string | null = null
  if (pa.submission.team_id) {
    const { data: team } = await client
      .from("teams")
      .select("name")
      .eq("id", pa.submission.team_id)
      .single()
    teamName = team?.name ?? null
  }

  return {
    fulfillmentId: fulfillment.id,
    status: fulfillment.status as PrizeFulfillmentStatus,
    prizeName: pa.prize.name,
    prizeValue: pa.prize.value,
    hackathonName: hackathon?.name ?? "Hackathon",
    hackathonSlug: hackathon?.slug ?? "",
    submissionTitle: pa.submission.title,
    teamName,
    recipientName: fulfillment.recipient_name,
    recipientEmail: fulfillment.recipient_email,
    shippingAddress: fulfillment.shipping_address,
    claimedAt: fulfillment.claimed_at,
    expiresAt: fulfillment.claim_token_expires_at,
  }
}

export type ClaimPrizeResult =
  | { success: true }
  | { success: false; error: string; code: string }

export async function claimPrize(
  token: string,
  data: {
    recipientName: string
    recipientEmail: string
    shippingAddress?: string
  }
): Promise<ClaimPrizeResult> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: fulfillment, error } = await client
    .from("prize_fulfillments")
    .select("id, status, hackathon_id, claim_token_expires_at")
    .eq("claim_token", token)
    .single()

  if (error || !fulfillment) {
    return { success: false, error: "Prize claim not found", code: "not_found" }
  }

  if (fulfillment.claim_token_expires_at && new Date(fulfillment.claim_token_expires_at) < new Date()) {
    return { success: false, error: "This claim link has expired. Contact the organizer for a new one.", code: "expired" }
  }

  if (fulfillment.status === "claimed") {
    return { success: false, error: "This prize has already been claimed", code: "already_claimed" }
  }

  const now = new Date().toISOString()
  const updateData: Record<string, unknown> = {
    status: "claimed",
    claimed_at: now,
    updated_at: now,
    recipient_name: data.recipientName,
    recipient_email: data.recipientEmail,
  }
  if (data.shippingAddress) {
    updateData.shipping_address = data.shippingAddress
  }

  const { error: updateError } = await client
    .from("prize_fulfillments")
    .update(updateData)
    .eq("id", fulfillment.id)

  if (updateError) {
    console.error("Failed to claim prize:", updateError)
    return { success: false, error: "Failed to claim prize", code: "update_failed" }
  }

  return { success: true }
}

export async function getClaimTokensForHackathon(
  hackathonId: string
): Promise<Record<string, string>> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("prize_fulfillments")
    .select("prize_assignment_id, claim_token")
    .eq("hackathon_id", hackathonId)
    .not("claim_token", "is", null)

  if (error || !data) return {}

  return Object.fromEntries(
    data.map((d) => [d.prize_assignment_id, d.claim_token as string])
  )
}

export async function getFulfillmentSummary(hackathonId: string): Promise<FulfillmentSummary> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("prize_fulfillments")
    .select("status")
    .eq("hackathon_id", hackathonId)

  const summary: FulfillmentSummary = { assigned: 0, contacted: 0, shipped: 0, claimed: 0 }

  if (error || !data) return summary

  for (const row of data) {
    const s = row.status as PrizeFulfillmentStatus
    if (s in summary) summary[s]++
  }

  return summary
}
