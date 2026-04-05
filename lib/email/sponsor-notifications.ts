import { sendEmail } from "./resend"
import { escapeHtml, resolveEmailsForTenant } from "./utils"

export async function sendSponsorClaimNotification(params: {
  prizeName: string
  hackathonName: string
  winnerName: string
  sponsorTenantId: string
}): Promise<number> {
  const { prizeName, hackathonName, winnerName, sponsorTenantId } = params
  const { supabase: getSupabase } = await import("@/lib/db/client")
  const client = (getSupabase as () => import("@supabase/supabase-js").SupabaseClient)()

  const { data: tenant } = await client
    .from("tenants")
    .select("clerk_org_id, clerk_user_id")
    .eq("id", sponsorTenantId)
    .single()

  if (!tenant) return 0

  const emails = await resolveEmailsForTenant(tenant)

  if (emails.length === 0) {
    console.warn(`[sponsor-notification] No emails resolved for tenant ${sponsorTenantId}`)
    return 0
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #18181b; padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Winner Info Ready</h1>
      </div>

      <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; margin-bottom: 16px;">
          <strong>${escapeHtml(winnerName)}</strong> has claimed the <strong>${escapeHtml(prizeName)}</strong> prize from ${escapeHtml(hackathonName)}.
        </p>

        <p style="font-size: 14px; color: #6b7280;">
          Their contact and delivery details are now available. The event organizer will coordinate fulfillment.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
          You're receiving this because your organization sponsors a prize in ${escapeHtml(hackathonName)}.
        </p>
      </div>
    </body>
    </html>
  `

  const text = `Winner Info Ready

${winnerName} has claimed the ${prizeName} prize from ${hackathonName}.

Their contact and delivery details are now available. The event organizer will coordinate fulfillment.

You're receiving this because your organization sponsors a prize in ${hackathonName}.`.trim()

  const sanitizedTag = hackathonName
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 100)

  let sent = 0
  for (const email of emails) {
    const result = await sendEmail({
      to: email,
      subject: `Winner claimed ${prizeName} — ${hackathonName}`,
      html,
      text,
      tags: [
        { name: "type", value: "sponsor_claim_notification" },
        { name: "hackathon", value: sanitizedTag },
      ],
    })
    if (result) sent++
  }

  return sent
}
