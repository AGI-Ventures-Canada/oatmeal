import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { PrizeFulfillment, PrizeFulfillmentStatus } from "@/lib/db/hackathon-types"

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

  const rows = newAssignments.map((a) => ({
    prize_assignment_id: a.id,
    hackathon_id: hackathonId,
    status: "assigned" as const,
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
