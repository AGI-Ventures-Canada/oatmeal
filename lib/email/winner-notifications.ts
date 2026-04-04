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

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

type WinnerPrize = {
  name: string
  value: string | null
  claimToken: string | null
}

type WinnerInfo = {
  email: string
  displayName: string
  hackathonName: string
  hackathonSlug: string
  submissionTitle: string
  rank: number
  prizes: WinnerPrize[]
}

function buildWinnerEmail(info: WinnerInfo) {
  const resultsUrl = `${process.env.NEXT_PUBLIC_APP_URL}/e/${info.hackathonSlug}`

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  const hasClaimablePrizes = info.prizes.some((p) => p.claimToken)

  const prizesHtml =
    info.prizes.length > 0
      ? `
        <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #71717a;">Prizes won:</p>
          ${info.prizes
            .map(
              (p) => {
                const label = `${escapeHtml(p.name)}${p.value ? ` — ${escapeHtml(p.value)}` : ""}`
                const claimLink = p.claimToken
                  ? ` <a href="${baseUrl}/prizes/claim/${p.claimToken}" style="color: #18181b; font-size: 13px; font-weight: 500; text-decoration: underline;">Claim</a>`
                  : ""
                return `<p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${label}${claimLink}</p>`
              }
            )
            .join("")}
        </div>`
      : ""

  const claimHtml = hasClaimablePrizes
    ? `
        <a href="${baseUrl}/prizes/claim/${info.prizes.find((p) => p.claimToken)!.claimToken}"
           style="display: inline-block; background: #18181b; color: white; padding: 14px 28px;
                  text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin-bottom: 12px;">
          Claim Your Prize
        </a>
        <p style="font-size: 13px; color: #71717a; margin: 0 0 16px 0;">
          We just need your name and where to send it.
        </p>`
    : ""

  const prizesText =
    info.prizes.length > 0
      ? `\nPrizes won:\n${info.prizes.map((p) => {
          const label = `  - ${p.name}${p.value ? ` — ${p.value}` : ""}`
          return p.claimToken ? `${label}\n    Claim: ${baseUrl}/prizes/claim/${p.claimToken}` : label
        }).join("\n")}\n`
      : ""

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #18181b; padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Congratulations!</h1>
      </div>

      <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; margin-bottom: 24px;">
          Your submission <strong>"${escapeHtml(info.submissionTitle)}"</strong> placed
          <strong>${ordinal(info.rank)}</strong> in the <strong>${escapeHtml(info.hackathonName)}</strong> hackathon!
        </p>

        ${prizesHtml}

        ${claimHtml}

        <a href="${resultsUrl}"
           style="display: inline-block; background: ${hasClaimablePrizes ? "transparent" : "#18181b"}; color: ${hasClaimablePrizes ? "#18181b" : "white"}; padding: 14px 28px;
                  text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;${hasClaimablePrizes ? " border: 1px solid #e5e7eb;" : ""}">
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

  const claimText = hasClaimablePrizes
    ? `\nClaim your prize: ${baseUrl}/prizes/claim/${info.prizes.find((p) => p.claimToken)!.claimToken}\n`
    : ""

  const text = `
Congratulations!

Your submission "${info.submissionTitle}" placed ${ordinal(info.rank)} in the ${info.hackathonName} hackathon!
${prizesText}${claimText}
View results: ${resultsUrl}

You're receiving this because you participated in ${info.hackathonName}.
  `.trim()

  return { html, text }
}

export async function sendWinnerEmails(hackathonId: string): Promise<number> {
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    console.error("NEXT_PUBLIC_APP_URL not set, skipping winner emails")
    return 0
  }

  const client = getSupabase() as unknown as SupabaseClient

  const { data: hackathon } = await client
    .from("hackathons")
    .select("name, slug")
    .eq("id", hackathonId)
    .single()

  if (!hackathon) return 0

  const { data: results } = await client
    .from("hackathon_results")
    .select(`
      rank,
      submission:submissions!submission_id(id, title, team_id, participant_id)
    `)
    .eq("hackathon_id", hackathonId)
    .lte("rank", 3)
    .order("rank")

  if (!results || results.length === 0) return 0

  const submissionIds = results.map((r: Record<string, unknown>) => {
    const sub = r.submission as unknown as { id: string } | null
    return sub?.id
  }).filter((id): id is string => id !== null)

  const { data: prizeAssignments } = await client
    .from("prize_assignments")
    .select(`
      id,
      submission_id,
      prize:prizes!prize_id(name, value)
    `)
    .in("submission_id", submissionIds)

  let claimTokenMap: Record<string, string> = {}
  try {
    const { getClaimTokensForHackathon } = await import("@/lib/services/prize-fulfillment")
    claimTokenMap = await getClaimTokensForHackathon(hackathonId)
  } catch {
    // Claim tokens unavailable - send emails without claim links
  }

  const prizeMap: Record<string, WinnerPrize[]> = {}
  for (const pa of prizeAssignments ?? []) {
    const prize = (pa as Record<string, unknown>).prize as unknown as { name: string; value: string | null } | null
    if (!prize) continue
    if (!prizeMap[pa.submission_id]) prizeMap[pa.submission_id] = []
    const assignmentId = (pa as Record<string, unknown>).id as string
    prizeMap[pa.submission_id].push({
      ...prize,
      claimToken: claimTokenMap[assignmentId] ?? null,
    })
  }

  const teamIds = results
    .map((r: Record<string, unknown>) => {
      const sub = r.submission as unknown as { team_id: string | null } | null
      return sub?.team_id
    })
    .filter((id): id is string => id !== null)

  const submissionsByUser: Record<string, { title: string; rank: number; submissionId: string }[]> = {}

  if (teamIds.length > 0) {
    const { data: members } = await client
      .from("hackathon_participants")
      .select("clerk_user_id, team_id")
      .in("team_id", teamIds)

    if (members) {
      const teamSubmissionMap: Record<string, { title: string; rank: number; submissionId: string }> = {}
      for (const r of results) {
        const sub = (r as Record<string, unknown>).submission as unknown as { id: string; title: string; team_id: string | null }
        if (sub.team_id) {
          teamSubmissionMap[sub.team_id] = { title: sub.title, rank: r.rank, submissionId: sub.id }
        }
      }

      for (const m of members) {
        if (m.team_id && teamSubmissionMap[m.team_id]) {
          if (!submissionsByUser[m.clerk_user_id]) submissionsByUser[m.clerk_user_id] = []
          submissionsByUser[m.clerk_user_id].push(teamSubmissionMap[m.team_id])
        }
      }
    }
  }

  for (const r of results) {
    const sub = (r as Record<string, unknown>).submission as unknown as {
      id: string; title: string; team_id: string | null; participant_id: string | null
    }
    if (sub.team_id === null && sub.participant_id) {
      const { data: participant } = await client
        .from("hackathon_participants")
        .select("clerk_user_id")
        .eq("id", sub.participant_id)
        .single()

      if (participant) {
        if (!submissionsByUser[participant.clerk_user_id]) submissionsByUser[participant.clerk_user_id] = []
        submissionsByUser[participant.clerk_user_id].push({
          title: sub.title,
          rank: r.rank,
          submissionId: sub.id,
        })
      }
    }
  }

  const memberUserIds = Object.keys(submissionsByUser)
  if (memberUserIds.length === 0) return 0

  const clerk = await clerkClient()
  const users = await clerk.users.getUserList({ userId: memberUserIds })

  const sanitizedHackathonTag = hackathon.name
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100)

  const emailPromises = users.data
    .flatMap((user) => {
      const email = user.primaryEmailAddress?.emailAddress
      if (!email) return []

      const submissions = submissionsByUser[user.id]
      if (!submissions || submissions.length === 0) return []

      const displayName = user.firstName
        ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
        : user.username || email.split("@")[0]

      return submissions.map((info) => {
        const { html, text } = buildWinnerEmail({
          email,
          displayName,
          hackathonName: hackathon.name,
          hackathonSlug: hackathon.slug,
          submissionTitle: info.title,
          rank: info.rank,
          prizes: prizeMap[info.submissionId] ?? [],
        })

        return sendEmail({
          to: email,
          subject: `${ordinal(info.rank)} Place — ${hackathon.name} Results`,
          html,
          text,
          tags: [
            { name: "type", value: "winner_notification" },
            { name: "hackathon", value: sanitizedHackathonTag },
          ],
        })
      })
    })

  const settled = await Promise.allSettled(emailPromises)
  const succeeded = settled.filter((r) => r.status === "fulfilled" && r.value !== null).length
  const failed = settled.length - succeeded
  if (failed > 0) {
    console.error(`Winner emails: ${succeeded} sent, ${failed} failed for hackathon ${hackathonId}`)
  }
  return succeeded
}
