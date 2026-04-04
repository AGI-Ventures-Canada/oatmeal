import type { TransitionEvent } from "@/lib/db/hackathon-types"

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function sanitizeTag(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100)
}

type EmailContent = {
  subject: string
  html: string
  text: string
  tag: string
}

function buildEmail(
  heading: string,
  body: string,
  bodyText: string,
  ctaLabel: string,
  ctaUrl: string,
  hackathonName: string,
  tag: string,
  subject: string,
): EmailContent {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #18181b; padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${escapeHtml(heading)}</h1>
      </div>

      <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; margin-bottom: 24px;">${body}</p>

        <div style="background: #f4f4f5; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #71717a;">Hackathon:</p>
          <p style="margin: 0; font-size: 18px; font-weight: 600;">${escapeHtml(hackathonName)}</p>
        </div>

        <a href="${escapeHtml(ctaUrl)}"
           style="display: inline-block; background: #18181b; color: white; padding: 14px 28px;
                  text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          ${escapeHtml(ctaLabel)}
        </a>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
          You received this because you're registered for ${escapeHtml(hackathonName)}.
        </p>
      </div>
    </body>
    </html>
  `

  const text = `
${heading}

${bodyText}

${ctaLabel}: ${ctaUrl}

You received this because you're registered for ${hackathonName}.
  `.trim()

  return { subject, html, text, tag }
}

export function buildTransitionEmail(
  event: TransitionEvent,
  hackathonName: string,
  hackathonSlug: string
): EmailContent {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://getoatmeal.com"
  const eventUrl = `${appUrl}/e/${hackathonSlug}`
  const tag = sanitizeTag(hackathonName)

  switch (event) {
    case "hackathon_started":
      return buildEmail(
        `${hackathonName} Is Live!`,
        `<strong>${escapeHtml(hackathonName)}</strong> has started. Head to the event page to get hacking!`,
        `${hackathonName} has started. Head to the event page to get hacking!`,
        "Go to Event",
        eventUrl,
        hackathonName,
        tag,
        `${hackathonName} is now live`,
      )

    case "judging_started":
      return buildEmail(
        "Judging Has Begun",
        `Judging is now underway for <strong>${escapeHtml(hackathonName)}</strong>. Check the event page for updates.`,
        `Judging is now underway for ${hackathonName}. Check the event page for updates.`,
        "View Event",
        eventUrl,
        hackathonName,
        tag,
        `Judging has started for ${hackathonName}`,
      )

    case "results_published":
      return buildEmail(
        "Results Are In!",
        `Results have been published for <strong>${escapeHtml(hackathonName)}</strong>. See how you did!`,
        `Results have been published for ${hackathonName}. See how you did!`,
        "View Results",
        eventUrl,
        hackathonName,
        tag,
        `Results for ${hackathonName}`,
      )

    case "registration_opened":
      return buildEmail(
        "Registration Is Open",
        `Registration is now open for <strong>${escapeHtml(hackathonName)}</strong>. Sign up before spots fill up!`,
        `Registration is now open for ${hackathonName}. Sign up before spots fill up!`,
        "Register Now",
        eventUrl,
        hackathonName,
        tag,
        `Registration open for ${hackathonName}`,
      )
  }
}
