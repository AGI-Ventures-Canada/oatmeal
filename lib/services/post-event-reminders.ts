import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { PostEventReminder } from "@/lib/db/hackathon-types"

export async function schedulePostEventReminders(hackathonId: string): Promise<number> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: hackathon } = await client
    .from("hackathons")
    .select("id, name, slug, feedback_survey_sent_at, feedback_survey_url")
    .eq("id", hackathonId)
    .single()

  if (!hackathon) return 0

  const now = new Date()
  const reminders: Array<{
    hackathon_id: string
    type: string
    scheduled_for: string
    recipient_filter: string
    metadata: Record<string, unknown>
  }> = []

  const prizeClaimDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  reminders.push({
    hackathon_id: hackathonId,
    type: "prize_claim",
    scheduled_for: prizeClaimDate.toISOString(),
    recipient_filter: "winners",
    metadata: { hackathonName: hackathon.name, hackathonSlug: hackathon.slug },
  })

  const orgReminderDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  reminders.push({
    hackathon_id: hackathonId,
    type: "organizer_fulfillment",
    scheduled_for: orgReminderDate.toISOString(),
    recipient_filter: "organizers",
    metadata: { hackathonName: hackathon.name, hackathonSlug: hackathon.slug },
  })

  // Only schedule feedback_followup if a survey URL is already configured.
  // If the organizer sets a URL after results are published, they can manually
  // send the survey from the Post-Event panel — no automatic backfill occurs.
  if (!hackathon.feedback_survey_sent_at && hackathon.feedback_survey_url) {
    const feedbackDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
    reminders.push({
      hackathon_id: hackathonId,
      type: "feedback_followup",
      scheduled_for: feedbackDate.toISOString(),
      recipient_filter: "all_participants",
      metadata: {
        hackathonName: hackathon.name,
        hackathonSlug: hackathon.slug,
        surveyUrl: hackathon.feedback_survey_url,
      },
    })
  }

  let created = 0
  for (const reminder of reminders) {
    const { error } = await client
      .from("post_event_reminders")
      .upsert(reminder, { onConflict: "hackathon_id,type" })

    if (!error) created++
    else console.error(`Failed to schedule ${reminder.type} reminder:`, error)
  }

  return created
}

export async function listReminders(hackathonId: string): Promise<PostEventReminder[]> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("post_event_reminders")
    .select("*")
    .eq("hackathon_id", hackathonId)
    .order("scheduled_for")

  if (error) {
    console.error("Failed to list reminders:", error)
    return []
  }

  return (data ?? []) as PostEventReminder[]
}

export async function getReminderById(
  reminderId: string,
  hackathonId: string
): Promise<PostEventReminder | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("post_event_reminders")
    .select("*")
    .eq("id", reminderId)
    .eq("hackathon_id", hackathonId)
    .single()

  if (error || !data) return null
  return data as PostEventReminder
}

export async function cancelReminder(
  reminderId: string,
  hackathonId: string
): Promise<boolean> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("post_event_reminders")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("id", reminderId)
    .eq("hackathon_id", hackathonId)
    .is("sent_at", null)
    .is("cancelled_at", null)
    .select("id")

  if (error) {
    console.error("Failed to cancel reminder:", error)
    return false
  }

  return data !== null && data.length > 0
}

export async function getPendingReminders(limit = 50): Promise<PostEventReminder[]> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("post_event_reminders")
    .select("*")
    .lte("scheduled_for", new Date().toISOString())
    .is("sent_at", null)
    .is("cancelled_at", null)
    .order("scheduled_for")
    .limit(limit)

  if (error) {
    console.error("Failed to get pending reminders:", error)
    return []
  }

  return (data ?? []) as PostEventReminder[]
}

export async function markReminderSent(reminderId: string): Promise<void> {
  const client = getSupabase() as unknown as SupabaseClient

  const { error } = await client
    .from("post_event_reminders")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", reminderId)

  if (error) {
    console.error("Failed to mark reminder sent:", error)
  }
}

export async function processReminder(reminder: PostEventReminder): Promise<number> {
  const metadata = reminder.metadata as Record<string, unknown>
  const hackathonName = metadata.hackathonName as string
  const hackathonSlug = metadata.hackathonSlug as string

  const {
    sendReminderEmails,
    buildPrizeClaimReminderContent,
    buildOrganizerFulfillmentReminderContent,
    buildFeedbackFollowupContent,
  } = await import("@/lib/email/post-event-reminders")

  let sent = 0

  if (reminder.type === "prize_claim") {
    const content = buildPrizeClaimReminderContent(hackathonName, hackathonSlug)
    sent = await sendReminderEmails(
      reminder.hackathon_id,
      "prize_claim",
      reminder.recipient_filter,
      (name) => ({ ...content, hackathonName, participantName: name })
    )
  } else if (reminder.type === "organizer_fulfillment") {
    const { getFulfillmentSummary } = await import("@/lib/services/prize-fulfillment")
    const summary = await getFulfillmentSummary(reminder.hackathon_id)
    const unfulfilled = summary.assigned + summary.contacted + summary.shipped
    if (unfulfilled === 0) {
      await markReminderSent(reminder.id)
      return 0
    }
    const content = buildOrganizerFulfillmentReminderContent(hackathonName, hackathonSlug, unfulfilled)
    sent = await sendReminderEmails(
      reminder.hackathon_id,
      "organizer_fulfillment",
      reminder.recipient_filter,
      (name) => ({ ...content, hackathonName, participantName: name })
    )
  } else if (reminder.type === "feedback_followup") {
    const surveyUrl = metadata.surveyUrl as string
    if (!surveyUrl) {
      await markReminderSent(reminder.id)
      return 0
    }
    const content = buildFeedbackFollowupContent(hackathonName, surveyUrl)
    sent = await sendReminderEmails(
      reminder.hackathon_id,
      "feedback_followup",
      reminder.recipient_filter,
      (name) => ({ ...content, hackathonName, participantName: name })
    )
  }

  await markReminderSent(reminder.id)
  return sent
}

export async function processAllPendingReminders(): Promise<{ processed: number; totalSent: number }> {
  const pending = await getPendingReminders()
  let processed = 0
  let totalSent = 0

  for (const reminder of pending) {
    try {
      const sent = await processReminder(reminder)
      totalSent += sent
      processed++
    } catch (err) {
      console.error(`Failed to process reminder ${reminder.id}:`, err)
    }
  }

  return { processed, totalSent }
}
