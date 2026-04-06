import { sendEmail } from "./resend"
import { renderEmail, sanitizeTag, resolveEmailsForTenant } from "./utils"
import OrganizerClaimNotificationEmail from "@/emails/organizer-claim-notification"

export async function sendOrganizerClaimNotification(params: {
  prizeName: string
  hackathonName: string
  hackathonSlug: string
  winnerName: string
  hackathonId: string
}): Promise<number> {
  const { prizeName, hackathonName, hackathonSlug, winnerName, hackathonId } = params
  const { supabase: getSupabase } = await import("@/lib/db/client")
  const client = (getSupabase as () => import("@supabase/supabase-js").SupabaseClient)()

  const { data: hackathon } = await client
    .from("hackathons")
    .select("tenant_id")
    .eq("id", hackathonId)
    .single()

  if (!hackathon?.tenant_id) return 0

  const { data: tenant } = await client
    .from("tenants")
    .select("clerk_org_id, clerk_user_id")
    .eq("id", hackathon.tenant_id)
    .single()

  if (!tenant) return 0

  const emails = await resolveEmailsForTenant(tenant)

  if (emails.length === 0) {
    console.warn(`[organizer-notification] No emails resolved for hackathon ${hackathonId}`)
    return 0
  }

  const fulfillmentUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/e/${hackathonSlug}/manage?tab=post-event`
    : null

  const { html, text } = await renderEmail(
    OrganizerClaimNotificationEmail({
      winnerName,
      prizeName,
      hackathonName,
      fulfillmentUrl,
    })
  )

  const tag = sanitizeTag(hackathonName)

  let sent = 0
  for (const email of emails) {
    const result = await sendEmail({
      to: email,
      subject: `Prize claimed: ${prizeName} — ${hackathonName}`,
      html,
      text,
      tags: [
        { name: "type", value: "organizer_claim_notification" },
        { name: "hackathon", value: tag },
      ],
    })
    if (result) sent++
  }

  return sent
}
