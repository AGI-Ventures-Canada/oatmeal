import { sendEmail } from "./resend"

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export async function sendPrizeShippedEmail(params: {
  recipientEmail: string
  recipientName: string
  prizeName: string
  hackathonName: string
  trackingNumber: string | null
}): Promise<boolean> {
  const { recipientEmail, recipientName, prizeName, hackathonName, trackingNumber } = params

  const trackingBlock = trackingNumber
    ? `<p style="font-size: 14px; background: #f3f4f6; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
        <strong>Tracking number:</strong> ${escapeHtml(trackingNumber)}
      </p>`
    : ""

  const trackingText = trackingNumber
    ? `\nTracking number: ${trackingNumber}\n`
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
        <h1 style="color: white; margin: 0; font-size: 24px;">Your Prize is On Its Way!</h1>
      </div>

      <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; margin-bottom: 16px;">
          Hi ${escapeHtml(recipientName)}, great news! Your prize <strong>${escapeHtml(prizeName)}</strong> from ${escapeHtml(hackathonName)} has been shipped.
        </p>

        ${trackingBlock}

        <p style="font-size: 14px; color: #6b7280;">
          If you have any questions about delivery, contact the event organizer.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
          You're receiving this because you claimed a prize from ${escapeHtml(hackathonName)}.
        </p>
      </div>
    </body>
    </html>
  `

  const text = `Your Prize is On Its Way!

Hi ${recipientName}, great news! Your prize "${prizeName}" from ${hackathonName} has been shipped.
${trackingText}
If you have any questions about delivery, contact the event organizer.

You're receiving this because you claimed a prize from ${hackathonName}.`.trim()

  const result = await sendEmail({
    to: recipientEmail,
    subject: `Your prize is on its way — ${hackathonName}`,
    html,
    text,
    tags: [
      { name: "type", value: "prize_shipped" },
      { name: "hackathon", value: hackathonName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100) },
    ],
  })

  return result !== null
}
