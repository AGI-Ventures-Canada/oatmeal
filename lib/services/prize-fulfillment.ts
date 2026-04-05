import { randomBytes } from "crypto"
import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { PrizeFulfillment, PrizeFulfillmentStatus } from "@/lib/db/hackathon-types"

const CLAIM_TOKEN_EXPIRY_DAYS = 30

export type FulfillmentWithDetails = PrizeFulfillment & {
  prizeName: string
  prizeValue: string | null
  prizeKind: string
  submissionTitle: string
  teamName: string | null
}

export type FulfillmentSummary = Record<PrizeFulfillmentStatus, number>

const VALID_TRANSITIONS: Record<PrizeFulfillmentStatus, PrizeFulfillmentStatus[]> = {
  assigned: ["contacted", "shipped", "claimed"],
  contacted: ["shipped", "claimed"],
  shipped: ["claimed"],
  claimed: ["shipped"],
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
        prize:prizes!prize_id(name, value, kind),
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
      prize: { name: string; value: string | null; kind: string | null }
      submission: { title: string; team_id: string | null }
    }
    const fulfillment = f as unknown as PrizeFulfillment
    return {
      ...fulfillment,
      prizeName: pa.prize.name,
      prizeValue: pa.prize.value,
      prizeKind: pa.prize.kind ?? "other",
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

  const fulfillment = data as unknown as PrizeFulfillment

  if (status === "shipped" && fulfillment.recipient_email) {
    void notifyWinnerOfShipment(fulfillment, hackathonId, client).catch(console.error)
  }

  return fulfillment
}

async function notifyWinnerOfShipment(
  fulfillment: PrizeFulfillment,
  hackathonId: string,
  client: SupabaseClient
): Promise<void> {
  const { data: assignment } = await client
    .from("prize_assignments")
    .select("prize:prizes!prize_id(name)")
    .eq("id", fulfillment.prize_assignment_id)
    .single()

  const { data: hackathon } = await client
    .from("hackathons")
    .select("name")
    .eq("id", hackathonId)
    .single()

  if (!assignment || !hackathon) return

  const pa = assignment as unknown as { prize: { name: string } }
  const { sendPrizeShippedEmail } = await import("@/lib/email/prize-shipped")
  await sendPrizeShippedEmail({
    recipientEmail: fulfillment.recipient_email!,
    recipientName: fulfillment.recipient_name ?? "Winner",
    prizeName: pa.prize.name,
    hackathonName: hackathon.name,
    trackingNumber: fulfillment.tracking_number,
  })
}

export type ClaimWithDetails = {
  fulfillmentId: string
  status: PrizeFulfillmentStatus
  prizeName: string
  prizeValue: string | null
  prizeKind: string
  distributionMethod: string | null
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
        prize:prizes!prize_id(name, value, kind, distribution_method),
        submission:submissions!submission_id(title, team_id, hackathon_id)
      )
    `)
    .eq("claim_token", token)
    .single()

  if (error || !fulfillment) return null

  const pa = (fulfillment as Record<string, unknown>).prize_assignment as {
    prize: { name: string; value: string | null; kind: string; distribution_method: string | null }
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
    prizeKind: pa.prize.kind ?? "other",
    distributionMethod: pa.prize.distribution_method,
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

export type SiblingClaim = {
  token: string
  fulfillmentId: string
  status: PrizeFulfillmentStatus
  prizeName: string
  prizeValue: string | null
  prizeKind: string
  distributionMethod: string | null
  recipientName: string | null
  recipientEmail: string | null
  shippingAddress: string | null
  isExpired: boolean
}

/**
 * Public projection of SiblingClaim for client-side use.
 * `recipientName` is intentionally kept — siblings are teammates who claimed
 * prizes for the same submission, so names are not sensitive in this context.
 * `recipientEmail` and `shippingAddress` are stripped as PII.
 *
 * `token` is intentionally kept — it enables the multi-prize claim queue
 * where a single team member can claim all of their submission's prizes in
 * one session. All tokens belong to the same submission's prize assignments,
 * so cross-member token access is by design (any team member may claim on
 * behalf of the team).
 */
export type SiblingClaimPublic = Omit<SiblingClaim, "recipientEmail" | "shippingAddress">

export async function getSiblingClaims(token: string): Promise<SiblingClaim[]> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: fulfillment } = await client
    .from("prize_fulfillments")
    .select(`
      prize_assignment:prize_assignments!prize_assignment_id(
        submission_id
      )
    `)
    .eq("claim_token", token)
    .single()

  if (!fulfillment) return []

  const pa = (fulfillment as Record<string, unknown>).prize_assignment as { submission_id: string } | null
  if (!pa?.submission_id) return []

  const { data: assignments } = await client
    .from("prize_assignments")
    .select("id")
    .eq("submission_id", pa.submission_id)

  if (!assignments || assignments.length === 0) return []

  const assignmentIds = assignments.map((a) => a.id)

  const { data: siblings } = await client
    .from("prize_fulfillments")
    .select(`
      id, status, claim_token, claim_token_expires_at, recipient_name, recipient_email, shipping_address,
      prize_assignment:prize_assignments!prize_assignment_id(
        prize:prizes!prize_id(name, value, kind, distribution_method)
      )
    `)
    .in("prize_assignment_id", assignmentIds)
    .not("claim_token", "is", null)
    .order("created_at")

  if (!siblings) return []

  const now = new Date()

  return siblings.map((s: Record<string, unknown>) => {
    const spa = s.prize_assignment as {
      prize: { name: string; value: string | null; kind: string; distribution_method: string | null }
    }
    return {
      token: s.claim_token as string,
      fulfillmentId: s.id as string,
      status: s.status as PrizeFulfillmentStatus,
      prizeName: spa.prize.name,
      prizeValue: spa.prize.value,
      prizeKind: spa.prize.kind ?? "other",
      distributionMethod: spa.prize.distribution_method,
      recipientName: s.recipient_name as string | null,
      recipientEmail: s.recipient_email as string | null,
      shippingAddress: s.shipping_address as string | null,
      isExpired: s.claim_token_expires_at
        ? new Date(s.claim_token_expires_at as string) < now
        : false,
    }
  })
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
    paymentMethod?: string
    paymentDetail?: string
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
  if (data.paymentMethod) {
    updateData.payment_method = data.paymentMethod
  }
  if (data.paymentDetail) {
    updateData.payment_detail = data.paymentDetail
  }

  const { error: updateError } = await client
    .from("prize_fulfillments")
    .update(updateData)
    .eq("id", fulfillment.id)

  if (updateError) {
    console.error("Failed to claim prize:", updateError)
    return { success: false, error: "Failed to claim prize", code: "update_failed" }
  }

  void notifySponsorOnClaim(fulfillment.id, data.recipientName, client).catch(console.error)
  void notifyOrganizerOnClaim(fulfillment.id, data.recipientName, client).catch(console.error)

  return { success: true }
}

async function notifySponsorOnClaim(
  fulfillmentId: string,
  winnerName: string,
  client: SupabaseClient
): Promise<void> {
  const { data: fulfillmentRow } = await client
    .from("prize_fulfillments")
    .select("prize_assignment_id, hackathon_id")
    .eq("id", fulfillmentId)
    .single()

  if (!fulfillmentRow) return

  const { data: assignment } = await client
    .from("prize_assignments")
    .select("prize:prizes!prize_id(name, prize_track_id)")
    .eq("id", fulfillmentRow.prize_assignment_id)
    .single()

  if (!assignment) return

  const pa = assignment as unknown as { prize: { name: string; prize_track_id: string | null } }
  if (!pa.prize.prize_track_id) return

  const { data: track } = await client
    .from("prize_tracks")
    .select("sponsor_id")
    .eq("id", pa.prize.prize_track_id)
    .single()

  if (!track?.sponsor_id) return

  const { data: sponsor } = await client
    .from("hackathon_sponsors")
    .select("sponsor_tenant_id")
    .eq("id", track.sponsor_id)
    .single()

  if (!sponsor?.sponsor_tenant_id) return

  const { data: hackathon } = await client
    .from("hackathons")
    .select("name")
    .eq("id", fulfillmentRow.hackathon_id)
    .single()

  if (!hackathon) return

  const { sendSponsorClaimNotification } = await import("@/lib/email/sponsor-notifications")
  await sendSponsorClaimNotification({
    prizeName: pa.prize.name,
    hackathonName: hackathon.name,
    winnerName,
    sponsorTenantId: sponsor.sponsor_tenant_id,
  })
}

async function notifyOrganizerOnClaim(
  fulfillmentId: string,
  winnerName: string,
  client: SupabaseClient
): Promise<void> {
  const { data: fulfillmentRow } = await client
    .from("prize_fulfillments")
    .select("prize_assignment_id, hackathon_id")
    .eq("id", fulfillmentId)
    .single()

  if (!fulfillmentRow) return

  const { data: assignment } = await client
    .from("prize_assignments")
    .select("prize:prizes!prize_id(name)")
    .eq("id", fulfillmentRow.prize_assignment_id)
    .single()

  if (!assignment) return

  const pa = assignment as unknown as { prize: { name: string } }

  const { data: hackathon } = await client
    .from("hackathons")
    .select("name")
    .eq("id", fulfillmentRow.hackathon_id)
    .single()

  if (!hackathon) return

  const { sendOrganizerClaimNotification } = await import("@/lib/email/organizer-notifications")
  await sendOrganizerClaimNotification({
    prizeName: pa.prize.name,
    hackathonName: hackathon.name,
    winnerName,
    hackathonId: fulfillmentRow.hackathon_id,
  })
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
