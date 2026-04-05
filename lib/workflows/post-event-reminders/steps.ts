"use step"

import type { PostEventRemindersInput } from "./workflow"

export async function sendPrizeClaimReminders(
  input: PostEventRemindersInput
): Promise<number> {
  const {
    sendReminderEmails,
    buildPrizeClaimReminderContent,
  } = await import("@/lib/email/post-event-reminders")

  const content = buildPrizeClaimReminderContent(input.hackathonName, input.hackathonSlug)
  const sent = await sendReminderEmails(
    input.hackathonId,
    "prize_claim",
    "unclaimed_winners",
    (name) => ({ ...content, hackathonName: input.hackathonName, participantName: name })
  )

  return sent
}

export async function sendPrizeClaimFollowup(
  input: PostEventRemindersInput
): Promise<number> {
  const {
    sendReminderEmails,
    buildPrizeClaimFollowupContent,
  } = await import("@/lib/email/post-event-reminders")
  const { getFulfillmentSummary } = await import("@/lib/services/prize-fulfillment")

  const summary = await getFulfillmentSummary(input.hackathonId)
  const unclaimed = summary.assigned + summary.contacted + summary.shipped
  if (unclaimed === 0) return 0

  const content = buildPrizeClaimFollowupContent(input.hackathonName, input.hackathonSlug)
  const sent = await sendReminderEmails(
    input.hackathonId,
    "prize_claim_followup",
    "unclaimed_winners",
    (name) => ({ ...content, hackathonName: input.hackathonName, participantName: name })
  )

  return sent
}

export async function sendOrganizerEscalation(
  input: PostEventRemindersInput
): Promise<number> {
  const {
    sendReminderEmails,
    buildWinnerUnresponsiveContent,
  } = await import("@/lib/email/post-event-reminders")
  const { listFulfillments } = await import("@/lib/services/prize-fulfillment")

  const fulfillments = await listFulfillments(input.hackathonId)
  const unclaimed = fulfillments.filter((f) => f.status !== "claimed")
  if (unclaimed.length === 0) return 0

  const unclaimedDetails = unclaimed
    .map((f) => `${f.prizeName} (${f.submissionTitle})`)
    .join(", ")

  const content = buildWinnerUnresponsiveContent(
    input.hackathonName,
    input.hackathonSlug,
    unclaimed.length,
    unclaimedDetails
  )

  const sent = await sendReminderEmails(
    input.hackathonId,
    "winner_unresponsive",
    "organizers",
    (name) => ({ ...content, hackathonName: input.hackathonName, participantName: name })
  )

  return sent
}
