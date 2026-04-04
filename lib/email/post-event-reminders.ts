import { sendEmail } from "./resend"
import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import { clerkClient } from "@clerk/nextjs/server"

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

type ReminderEmailInfo = {
  hackathonName: string
  participantName: string
  ctaUrl: string
  subject: string
  heading: string
  body: string
  ctaLabel: string
}

function buildReminderEmail(info: ReminderEmailInfo) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #18181b; padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${escapeHtml(info.heading)}</h1>
      </div>

      <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; margin-bottom: 24px;">
          Hi ${escapeHtml(info.participantName)}, ${escapeHtml(info.body)}
        </p>

        <a href="${escapeHtml(info.ctaUrl)}"
           style="display: inline-block; background: #18181b; color: white; padding: 14px 28px;
                  text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          ${escapeHtml(info.ctaLabel)}
        </a>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
          You're receiving this because of your involvement in ${escapeHtml(info.hackathonName)}.
        </p>
      </div>
    </body>
    </html>
  `

  const text = `
${info.heading}

Hi ${info.participantName}, ${info.body}

${info.ctaLabel}: ${info.ctaUrl}

You're receiving this because of your involvement in ${info.hackathonName}.
  `.trim()

  return { html, text }
}

export function buildPrizeClaimReminderContent(hackathonName: string, hackathonSlug: string) {
  return {
    subject: `Claim Your Prize — ${hackathonName}`,
    heading: "Don't Forget Your Prize!",
    body: `you won a prize in ${hackathonName} but haven't claimed it yet. Visit the results page to see your prizes and follow up with the organizers.`,
    ctaLabel: "View Results",
    ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL}/e/${hackathonSlug}`,
  }
}

export function buildOrganizerFulfillmentReminderContent(
  hackathonName: string,
  hackathonSlug: string,
  unfulfilledCount: number
) {
  return {
    subject: `${unfulfilledCount} prizes awaiting fulfillment — ${hackathonName}`,
    heading: "Prizes Awaiting Fulfillment",
    body: `you have ${unfulfilledCount} prize${unfulfilledCount === 1 ? "" : "s"} still awaiting fulfillment for ${hackathonName}. Keep your winners happy by completing prize delivery.`,
    ctaLabel: "Manage Fulfillment",
    ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL}/e/${hackathonSlug}/manage?tab=prizes&ptab=fulfillment`,
  }
}

export function buildFeedbackFollowupContent(hackathonName: string, surveyUrl: string) {
  return {
    subject: `We still want to hear from you — ${hackathonName}`,
    heading: "Your Feedback Matters",
    body: `we'd still love to hear your thoughts on ${hackathonName}. Your feedback helps make future events even better.`,
    ctaLabel: "Share Feedback",
    ctaUrl: surveyUrl,
  }
}

export async function sendReminderEmails(
  hackathonId: string,
  reminderType: string,
  recipientFilter: string,
  contentBuilder: (name: string, email: string) => ReminderEmailInfo
): Promise<number> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: hackathon } = await client
    .from("hackathons")
    .select("name, slug")
    .eq("id", hackathonId)
    .single()

  if (!hackathon) return 0

  let clerkUserIds: string[] = []

  if (recipientFilter === "winners") {
    const { data: results } = await client
      .from("hackathon_results")
      .select("submission:submissions!submission_id(team_id, participant_id)")
      .eq("hackathon_id", hackathonId)
      .lte("rank", 3)

    if (results) {
      const teamIds: string[] = []
      const soloIds: string[] = []
      for (const r of results) {
        const sub = (r as Record<string, unknown>).submission as { team_id: string | null; participant_id: string | null } | null
        if (sub?.team_id) teamIds.push(sub.team_id)
        else if (sub?.participant_id) soloIds.push(sub.participant_id)
      }
      if (teamIds.length > 0) {
        const { data: members } = await client
          .from("hackathon_participants")
          .select("clerk_user_id")
          .in("team_id", teamIds)
        clerkUserIds.push(...(members?.map((m) => m.clerk_user_id) ?? []))
      }
      if (soloIds.length > 0) {
        const { data: solos } = await client
          .from("hackathon_participants")
          .select("clerk_user_id")
          .in("id", soloIds)
        clerkUserIds.push(...(solos?.map((s) => s.clerk_user_id) ?? []))
      }
    }
  } else if (recipientFilter === "organizers") {
    const { data: organizers } = await client
      .from("hackathon_participants")
      .select("clerk_user_id")
      .eq("hackathon_id", hackathonId)
      .eq("role", "organizer")
    clerkUserIds = organizers?.map((o) => o.clerk_user_id) ?? []
  } else {
    const { data: participants } = await client
      .from("hackathon_participants")
      .select("clerk_user_id")
      .eq("hackathon_id", hackathonId)
      .eq("role", "participant")
    clerkUserIds = participants?.map((p) => p.clerk_user_id) ?? []
  }

  clerkUserIds = [...new Set(clerkUserIds)]
  if (clerkUserIds.length === 0) return 0

  const clerk = await clerkClient()
  const sanitizedTag = hackathon.name
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100)

  let sent = 0

  for (let i = 0; i < clerkUserIds.length; i += 100) {
    const batch = clerkUserIds.slice(i, i + 100)
    const users = await clerk.users.getUserList({ userId: batch })

    for (const user of users.data) {
      const email = user.primaryEmailAddress?.emailAddress
      if (!email) continue

      const displayName = user.firstName
        ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
        : user.username || email.split("@")[0]

      const content = contentBuilder(displayName, email)
      const { html, text } = buildReminderEmail(content)

      const result = await sendEmail({
        to: email,
        subject: content.subject,
        html,
        text,
        tags: [
          { name: "type", value: `reminder_${reminderType}` },
          { name: "hackathon", value: sanitizedTag },
        ],
      })

      if (result) sent++
    }
  }

  return sent
}
