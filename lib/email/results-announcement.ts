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

type AnnouncementInfo = {
  hackathonName: string
  hackathonSlug: string
  participantName: string
}

function buildResultsAnnouncementEmail(info: AnnouncementInfo) {
  const resultsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/e/${info.hackathonSlug}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #18181b; padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Results Are In!</h1>
      </div>

      <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; margin-bottom: 24px;">
          Hi ${escapeHtml(info.participantName)}, the results for <strong>${escapeHtml(info.hackathonName)}</strong> have been published! Check out how everyone did.
        </p>

        <a href="${resultsUrl}"
           style="display: inline-block; background: #18181b; color: white; padding: 14px 28px;
                  text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          View Results
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
Results Are In!

Hi ${info.participantName}, the results for ${info.hackathonName} have been published! Check out how everyone did.

View results: ${resultsUrl}

You're receiving this because you participated in ${info.hackathonName}.
  `.trim()

  return { html, text }
}

export async function sendResultsAnnouncementEmails(hackathonId: string): Promise<number> {
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    console.error("NEXT_PUBLIC_APP_URL not set, skipping results announcement")
    return 0
  }

  const client = getSupabase() as unknown as SupabaseClient

  const { data: hackathon } = await client
    .from("hackathons")
    .select("name, slug, results_announcement_sent_at")
    .eq("id", hackathonId)
    .single()

  if (!hackathon || hackathon.results_announcement_sent_at) return 0

  const { data: winnerResults } = await client
    .from("hackathon_results")
    .select("submission:submissions!submission_id(team_id, participant_id)")
    .eq("hackathon_id", hackathonId)
    .lte("rank", 3)

  const winnerClerkIds = new Set<string>()
  if (winnerResults) {
    const teamIds: string[] = []
    const soloParticipantIds: string[] = []
    for (const r of winnerResults) {
      const sub = (r as Record<string, unknown>).submission as { team_id: string | null; participant_id: string | null } | null
      if (sub?.team_id) teamIds.push(sub.team_id)
      else if (sub?.participant_id) soloParticipantIds.push(sub.participant_id)
    }
    if (teamIds.length > 0) {
      const { data: members } = await client
        .from("hackathon_participants")
        .select("clerk_user_id")
        .in("team_id", teamIds)
      members?.forEach((m) => winnerClerkIds.add(m.clerk_user_id))
    }
    if (soloParticipantIds.length > 0) {
      const { data: solos } = await client
        .from("hackathon_participants")
        .select("clerk_user_id")
        .in("id", soloParticipantIds)
      solos?.forEach((s) => winnerClerkIds.add(s.clerk_user_id))
    }
  }

  const { data: participants } = await client
    .from("hackathon_participants")
    .select("clerk_user_id")
    .eq("hackathon_id", hackathonId)
    .eq("role", "participant")

  if (!participants || participants.length === 0) return 0

  const nonWinnerIds = participants
    .map((p) => p.clerk_user_id)
    .filter((id) => !winnerClerkIds.has(id))

  if (nonWinnerIds.length === 0) return 0

  const clerk = await clerkClient()
  const sanitizedTag = hackathon.name
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100)

  let sent = 0

  for (let i = 0; i < nonWinnerIds.length; i += 100) {
    const batch = nonWinnerIds.slice(i, i + 100)
    const users = await clerk.users.getUserList({ userId: batch })

    const emailPromises = users.data.map((user) => {
      const email = user.primaryEmailAddress?.emailAddress
      if (!email) return null

      const displayName = user.firstName
        ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
        : user.username || email.split("@")[0]

      const { html, text } = buildResultsAnnouncementEmail({
        hackathonName: hackathon.name,
        hackathonSlug: hackathon.slug,
        participantName: displayName,
      })

      return sendEmail({
        to: email,
        subject: `Results Published — ${hackathon.name}`,
        html,
        text,
        tags: [
          { name: "type", value: "results_announcement" },
          { name: "hackathon", value: sanitizedTag },
        ],
      })
    }).filter(Boolean)

    const settled = await Promise.allSettled(emailPromises)
    sent += settled.filter((r) => r.status === "fulfilled" && r.value !== null).length
  }

  if (sent > 0) {
    await client
      .from("hackathons")
      .update({ results_announcement_sent_at: new Date().toISOString() })
      .eq("id", hackathonId)
  }

  return sent
}
