import { sendEmail } from "./resend"
import { renderEmail, sanitizeTag } from "./utils"
import PrizeShippedEmail from "@/emails/prize-shipped"

export async function sendPrizeShippedEmail(params: {
  recipientEmail: string
  recipientName: string
  prizeName: string
  hackathonName: string
  trackingNumber: string | null
}): Promise<boolean> {
  const { recipientEmail, recipientName, prizeName, hackathonName, trackingNumber } = params

  const { html, text } = await renderEmail(
    PrizeShippedEmail({
      recipientName,
      prizeName,
      hackathonName,
      trackingNumber,
    })
  )

  const result = await sendEmail({
    to: recipientEmail,
    subject: `Your prize is on its way — ${hackathonName}`,
    html,
    text,
    tags: [
      { name: "type", value: "prize_shipped" },
      { name: "hackathon", value: sanitizeTag(hackathonName) },
    ],
  })

  return result !== null
}
