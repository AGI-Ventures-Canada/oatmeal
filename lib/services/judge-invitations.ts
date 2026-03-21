import { supabase as getSupabase } from "@/lib/db/client"
import type { JudgeInvitation } from "@/lib/db/hackathon-types"
import type { SupabaseClient } from "@supabase/supabase-js"
import { randomBytes } from "crypto"

const INVITATION_EXPIRY_DAYS = 7
const INVITATION_EXPIRY_MS = INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000

export type CreateJudgeInvitationInput = {
  hackathonId: string
  email: string
  invitedByClerkUserId: string
}

export type CreateJudgeInvitationResult =
  | { success: true; invitation: JudgeInvitation }
  | { success: false; error: string; code: string }

export async function createJudgeInvitation(
  input: CreateJudgeInvitationInput
): Promise<CreateJudgeInvitationResult> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: existing } = await client
    .from("judge_invitations")
    .select("id")
    .eq("hackathon_id", input.hackathonId)
    .eq("email", input.email.toLowerCase())
    .eq("status", "pending")
    .maybeSingle()

  if (existing) {
    return { success: false, error: "Invitation already sent to this email", code: "already_invited" }
  }

  const token = randomBytes(32).toString("base64url")

  const { data: invitation, error: insertError } = await client
    .from("judge_invitations")
    .insert({
      hackathon_id: input.hackathonId,
      email: input.email.toLowerCase(),
      token,
      invited_by_clerk_user_id: input.invitedByClerkUserId,
      status: "pending",
      expires_at: new Date(Date.now() + INVITATION_EXPIRY_MS).toISOString(),
    })
    .select()
    .single()

  if (insertError) {
    console.error("Failed to create judge invitation:", insertError)
    return { success: false, error: "Failed to create invitation", code: "insert_failed" }
  }

  return { success: true, invitation: invitation as JudgeInvitation }
}

export type JudgeInvitationWithDetails = JudgeInvitation & {
  hackathon: { name: string; slug: string; status: string }
}

export async function getJudgeInvitationByToken(
  token: string
): Promise<JudgeInvitationWithDetails | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("judge_invitations")
    .select(`
      *,
      hackathons!inner(name, slug, status)
    `)
    .eq("token", token)
    .single()

  if (error || !data) {
    return null
  }

  const hackathon = data.hackathons as unknown as { name: string; slug: string; status: string }

  return {
    ...data,
    hackathon: {
      name: hackathon.name,
      slug: hackathon.slug,
      status: hackathon.status,
    },
  } as JudgeInvitationWithDetails
}

export type AcceptJudgeInvitationResult =
  | { success: true; hackathonId: string; hackathonSlug: string }
  | { success: false; error: string; code: string }

export async function acceptJudgeInvitation(
  token: string,
  clerkUserId: string,
  userEmails: string | string[]
): Promise<AcceptJudgeInvitationResult> {
  const client = getSupabase() as unknown as SupabaseClient

  const invitation = await getJudgeInvitationByToken(token)

  if (!invitation) {
    return { success: false, error: "Invitation not found", code: "not_found" }
  }

  if (invitation.status !== "pending") {
    return { success: false, error: `Invitation is ${invitation.status}`, code: "not_pending" }
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return { success: false, error: "Invitation has expired", code: "expired" }
  }

  const emails = Array.isArray(userEmails) ? userEmails : [userEmails]
  const matchesInvitation = emails.some(
    (e) => e.toLowerCase() === invitation.email.toLowerCase()
  )

  if (!matchesInvitation) {
    return { success: false, error: "Your email does not match the invitation", code: "email_mismatch" }
  }

  const { addJudge } = await import("@/lib/services/judging")
  const addResult = await addJudge(invitation.hackathon_id, clerkUserId)

  if (!addResult.success) {
    if (addResult.code === "already_judge") {
      await client
        .from("judge_invitations")
        .update({
          status: "accepted",
          accepted_by_clerk_user_id: clerkUserId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invitation.id)

      return {
        success: true,
        hackathonId: invitation.hackathon_id,
        hackathonSlug: invitation.hackathon.slug,
      }
    }
    return { success: false, error: addResult.error, code: addResult.code }
  }

  const { error: updateError } = await client
    .from("judge_invitations")
    .update({
      status: "accepted",
      accepted_by_clerk_user_id: clerkUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invitation.id)

  if (updateError) {
    console.error("Failed to update judge invitation status:", updateError)
  }

  return {
    success: true,
    hackathonId: invitation.hackathon_id,
    hackathonSlug: invitation.hackathon.slug,
  }
}

export async function cancelJudgeInvitation(
  invitationId: string,
  hackathonId: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: invitation } = await client
    .from("judge_invitations")
    .select("id, status")
    .eq("id", invitationId)
    .eq("hackathon_id", hackathonId)
    .single()

  if (!invitation || invitation.status !== "pending") {
    return { success: false, error: "Invitation not found or not pending" }
  }

  const { error } = await client
    .from("judge_invitations")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", invitationId)

  return { success: !error }
}

export async function sendPendingJudgeInvitationEmails(
  hackathonId: string,
  hackathonName: string,
  inviterName: string
): Promise<{ sent: number }> {
  // Known edge case: if a hackathon cycles draft→active→draft→active, pending invitations
  // will be emailed again on each transition. An emailed_at column would prevent duplicates.
  const pending = await listJudgeInvitations(hackathonId, "pending")

  if (pending.length === 0) return { sent: 0 }

  const { sendJudgeInvitationEmail } = await import("@/lib/email/judge-invitations")

  const results = await Promise.allSettled(
    pending.map((invitation) =>
      sendJudgeInvitationEmail({
        to: invitation.email,
        hackathonName,
        inviterName,
        inviteToken: invitation.token,
        expiresAt: invitation.expires_at,
      })
    )
  )

  const sent = results.filter(
    (r) => r.status === "fulfilled" && r.value.success
  ).length

  return { sent }
}

export async function listJudgeInvitations(
  hackathonId: string,
  status?: string
): Promise<JudgeInvitation[]> {
  const client = getSupabase() as unknown as SupabaseClient

  let query = client
    .from("judge_invitations")
    .select("*")
    .eq("hackathon_id", hackathonId)
    .order("created_at", { ascending: false })

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) {
    console.error("Failed to list judge invitations:", error)
    return []
  }

  return data as JudgeInvitation[]
}
