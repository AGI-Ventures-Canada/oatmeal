import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { PrizeFulfillmentStatus } from "@/lib/db/hackathon-types"

export type SponsorFulfillmentView = {
  fulfillmentId: string
  prizeName: string
  prizeValue: string | null
  submissionTitle: string
  teamName: string | null
  status: PrizeFulfillmentStatus
  recipientName: string | null
  recipientEmail: string | null
  shippingAddress: string | null
  paymentMethod: string | null
  paymentDetail: string | null
  trackingNumber: string | null
  claimedAt: string | null
}

export async function listSponsorFulfillments(
  tenantId: string,
  hackathonId: string
): Promise<SponsorFulfillmentView[]> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: sponsor } = await client
    .from("hackathon_sponsors")
    .select("id")
    .eq("sponsor_tenant_id", tenantId)
    .eq("hackathon_id", hackathonId)
    .single()

  if (!sponsor) return []

  const { data: tracks } = await client
    .from("prize_tracks")
    .select("id")
    .eq("sponsor_id", sponsor.id)

  if (!tracks || tracks.length === 0) return []

  const trackIds = tracks.map((t) => t.id)

  const { data: prizes } = await client
    .from("prizes")
    .select("id")
    .in("prize_track_id", trackIds)

  if (!prizes || prizes.length === 0) return []

  const prizeIds = prizes.map((p) => p.id)

  const { data: assignments } = await client
    .from("prize_assignments")
    .select("id")
    .in("prize_id", prizeIds)

  if (!assignments || assignments.length === 0) return []

  const assignmentIds = assignments.map((a) => a.id)

  const { data: fulfillments, error } = await client
    .from("prize_fulfillments")
    .select(`
      id, status, recipient_name, recipient_email, shipping_address,
      payment_method, payment_detail, tracking_number, claimed_at,
      prize_assignment:prize_assignments!prize_assignment_id(
        prize:prizes!prize_id(name, value),
        submission:submissions!submission_id(title, team_id)
      )
    `)
    .in("prize_assignment_id", assignmentIds)
    .order("created_at")

  if (error || !fulfillments) return []

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
    const isClaimed = (f.status as string) === "claimed" || (f.status as string) === "shipped"
    return {
      fulfillmentId: f.id as string,
      prizeName: pa.prize.name,
      prizeValue: pa.prize.value,
      submissionTitle: pa.submission.title,
      teamName: pa.submission.team_id ? teamsMap[pa.submission.team_id] ?? null : null,
      status: f.status as PrizeFulfillmentStatus,
      recipientName: isClaimed ? (f.recipient_name as string | null) : null,
      recipientEmail: isClaimed ? (f.recipient_email as string | null) : null,
      shippingAddress: isClaimed ? (f.shipping_address as string | null) : null,
      paymentMethod: isClaimed ? (f.payment_method as string | null) : null,
      paymentDetail: isClaimed ? (f.payment_detail as string | null) : null,
      trackingNumber: f.tracking_number as string | null,
      claimedAt: f.claimed_at as string | null,
    }
  })
}

export async function markSponsorFulfilled(
  tenantId: string,
  hackathonId: string,
  fulfillmentId: string,
  trackingNumber?: string
): Promise<boolean> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: sponsor } = await client
    .from("hackathon_sponsors")
    .select("id")
    .eq("sponsor_tenant_id", tenantId)
    .eq("hackathon_id", hackathonId)
    .single()

  if (!sponsor) return false

  const { data: fulfillment } = await client
    .from("prize_fulfillments")
    .select(`
      id, status,
      prize_assignment:prize_assignments!prize_assignment_id(
        prize:prizes!prize_id(prize_track_id)
      )
    `)
    .eq("id", fulfillmentId)
    .single()

  if (!fulfillment) return false

  const pa = (fulfillment as Record<string, unknown>).prize_assignment as {
    prize: { prize_track_id: string | null }
  }
  if (!pa.prize.prize_track_id) return false

  const { data: track } = await client
    .from("prize_tracks")
    .select("sponsor_id")
    .eq("id", pa.prize.prize_track_id)
    .single()

  if (!track || track.sponsor_id !== sponsor.id) return false

  if ((fulfillment.status as string) !== "claimed") return false

  const { updateFulfillmentStatus } = await import("./prize-fulfillment")
  const result = await updateFulfillmentStatus(fulfillmentId, hackathonId, "shipped", {
    trackingNumber,
  })

  return result !== null
}
