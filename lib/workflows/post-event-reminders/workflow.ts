"use workflow"

import { sleep } from "workflow"

export type PostEventRemindersInput = {
  hackathonId: string
  hackathonName: string
  hackathonSlug: string
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000

export async function postEventRemindersWorkflow(
  input: PostEventRemindersInput
): Promise<{ day3Sent: number; day7Sent: number; day10Sent: number }> {
  const {
    sendPrizeClaimReminders,
    sendPrizeClaimFollowup,
    sendOrganizerEscalation,
  } = await import("./steps")

  // Day 3: Remind unclaimed winners
  await sleep(THREE_DAYS_MS)
  const day3Sent = await sendPrizeClaimReminders(input)

  // Day 7 (4 more days): More urgent follow-up to still-unclaimed winners
  await sleep(FOUR_DAYS_MS)
  const day7Sent = await sendPrizeClaimFollowup(input)

  // Day 10 (3 more days): Escalate to organizers with unclaimed prize details
  await sleep(THREE_DAYS_MS)
  const day10Sent = await sendOrganizerEscalation(input)

  return { day3Sent, day7Sent, day10Sent }
}
