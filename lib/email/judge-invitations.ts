import { sendEmail } from "./resend"

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export type SendJudgeInvitationInput = {
  to: string
  hackathonName: string
  inviterName: string
  inviteToken: string
  expiresAt: string
}

export type SendJudgeAddedNotificationInput = {
  to: string
  hackathonName: string
  hackathonSlug: string
  addedByName: string
}

export async function sendJudgeAddedNotification(
  input: SendJudgeAddedNotificationInput
): Promise<{ success: boolean }> {
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    console.error("NEXT_PUBLIC_APP_URL not set, cannot send notification email")
    return { success: false }
  }

  const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL}/e/${input.hackathonSlug}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #18181b; padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">You've Been Added as a Judge</h1>
      </div>

      <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; margin-bottom: 24px;">
          <strong>${escapeHtml(input.addedByName)}</strong> has added you as a judge
          for the <strong>${escapeHtml(input.hackathonName)}</strong> hackathon.
        </p>

        <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #71717a;">Hackathon:</p>
          <p style="margin: 0; font-size: 18px; font-weight: 600;">${escapeHtml(input.hackathonName)}</p>
        </div>

        <a href="${escapeHtml(eventUrl)}"
           style="display: inline-block; background: #18181b; color: white; padding: 14px 28px;
                  text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          View Event
        </a>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
          If you didn't expect this, you can safely ignore this email.
        </p>
      </div>
    </body>
    </html>
  `

  const text = `
You've Been Added as a Judge

${input.addedByName} has added you as a judge for the ${input.hackathonName} hackathon.

View the event: ${eventUrl}

If you didn't expect this, you can safely ignore this email.
  `.trim()

  const sanitizedHackathonTag = input.hackathonName
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100)

  const result = await sendEmail({
    to: input.to,
    subject: `You're a judge for ${input.hackathonName}`,
    html,
    text,
    tags: [
      { name: "type", value: "judge_added" },
      { name: "hackathon", value: sanitizedHackathonTag },
    ],
  })

  return { success: result !== null }
}

export async function sendJudgeInvitationEmail(
  input: SendJudgeInvitationInput
): Promise<{ success: boolean }> {
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    console.error("NEXT_PUBLIC_APP_URL not set, cannot send invitation email")
    return { success: false }
  }

  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/judge-invite/${input.inviteToken}`
  const expiresDate = new Date(input.expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #18181b; padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited to Judge!</h1>
      </div>

      <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; margin-bottom: 24px;">
          <strong>${escapeHtml(input.inviterName)}</strong> has invited you to be a judge
          for the <strong>${escapeHtml(input.hackathonName)}</strong> hackathon.
        </p>

        <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #71717a;">Hackathon:</p>
          <p style="margin: 0; font-size: 18px; font-weight: 600;">${escapeHtml(input.hackathonName)}</p>
        </div>

        <a href="${acceptUrl}"
           style="display: inline-block; background: #18181b; color: white; padding: 14px 28px;
                  text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Accept Invitation
        </a>

        <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
          This invitation expires on ${expiresDate}. If you don't have an account,
          you'll be able to create one when accepting.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    </body>
    </html>
  `

  const text = `
You're Invited to Judge!

${input.inviterName} has invited you to be a judge for the ${input.hackathonName} hackathon.

Accept your invitation: ${acceptUrl}

This invitation expires on ${expiresDate}.

If you didn't expect this invitation, you can safely ignore this email.
  `.trim()

  const sanitizedHackathonTag = input.hackathonName
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100)

  const result = await sendEmail({
    to: input.to,
    subject: `Judge ${input.hackathonName}`,
    html,
    text,
    tags: [
      { name: "type", value: "judge_invitation" },
      { name: "hackathon", value: sanitizedHackathonTag },
    ],
  })

  return { success: result !== null }
}
