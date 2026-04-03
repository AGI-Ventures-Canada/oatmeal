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

type FeedbackInfo = {
  hackathonName: string
  participantName: string
  surveyUrl: string
}

function buildFeedbackSurveyEmail(info: FeedbackInfo) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #18181b; padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Share Your Feedback</h1>
      </div>

      <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; margin-bottom: 24px;">
          Hi ${escapeHtml(info.participantName)}, thanks for participating in <strong>${escapeHtml(info.hackathonName)}</strong>! We'd love to hear your thoughts so we can make future events even better.
        </p>

        <a href="${escapeHtml(info.surveyUrl)}"
           style="display: inline-block; background: #18181b; color: white; padding: 14px 28px;
                  text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Share Your Feedback
        </a>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
          You're receiving this because you participated in ${escapeHtml(info.hackathonName)}.
        </p>
      </div>
    </body>
    </html>
  `

  const text = `
Share Your Feedback

Hi ${info.participantName}, thanks for participating in ${info.hackathonName}! We'd love to hear your thoughts so we can make future events even better.

Take the survey: ${info.surveyUrl}

You're receiving this because you participated in ${info.hackathonName}.
  `.trim()

  return { html, text }
}

export async function sendFeedbackSurveyEmails(
  hackathonId: string,
  surveyUrl: string
): Promise<{ sent: number; failed: number }> {
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    console.error("NEXT_PUBLIC_APP_URL not set, skipping feedback survey")
    return { sent: 0, failed: 0 }
  }

  const client = getSupabase() as unknown as SupabaseClient

  const { data: hackathon } = await client
    .from("hackathons")
    .select("name, slug, feedback_survey_sent_at")
    .eq("id", hackathonId)
    .single()

  if (!hackathon || hackathon.feedback_survey_sent_at) {
    return { sent: 0, failed: 0 }
  }

  const { data: participants } = await client
    .from("hackathon_participants")
    .select("clerk_user_id")
    .eq("hackathon_id", hackathonId)
    .eq("role", "participant")

  if (!participants || participants.length === 0) {
    return { sent: 0, failed: 0 }
  }

  const clerkUserIds = participants.map((p) => p.clerk_user_id)
  const clerk = await clerkClient()
  const sanitizedTag = hackathon.name
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100)

  let sent = 0
  let failed = 0

  for (let i = 0; i < clerkUserIds.length; i += 100) {
    const batch = clerkUserIds.slice(i, i + 100)
    const users = await clerk.users.getUserList({ userId: batch })

    for (const user of users.data) {
      const email = user.primaryEmailAddress?.emailAddress
      if (!email) continue

      const displayName = user.firstName
        ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
        : user.username || email.split("@")[0]

      const { html, text } = buildFeedbackSurveyEmail({
        hackathonName: hackathon.name,
        participantName: displayName,
        surveyUrl,
      })

      const result = await sendEmail({
        to: email,
        subject: `Share Your Feedback — ${hackathon.name}`,
        html,
        text,
        tags: [
          { name: "type", value: "feedback_survey" },
          { name: "hackathon", value: sanitizedTag },
        ],
      })

      if (result) sent++
      else failed++
    }
  }

  if (sent > 0) {
    await client
      .from("hackathons")
      .update({
        feedback_survey_sent_at: new Date().toISOString(),
        feedback_survey_url: surveyUrl,
      })
      .eq("id", hackathonId)
  }

  return { sent, failed }
}
