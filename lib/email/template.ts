export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

// Brand colors — hex approximations of the OKLCH theme in globals.css
const c = {
  primary: "#C27D2A",
  primaryFg: "#FFFFFF",
  foreground: "#1C1917",
  background: "#FFFFFF",
  muted: "#F5F5F4",
  mutedFg: "#78716C",
  border: "#E7E5E4",
  subtle: "#A8A29E",
  headerBg: "#1C1917",
  headerFg: "#FFFFFF",
  pageBg: "#F0EFED",
} as const

const font =
  "'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', 'Courier New', monospace"

export function emailLayout(
  heading: string,
  content: string,
  footerNote: string
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: ${font}; line-height: 1.6; color: ${c.foreground}; max-width: 600px; margin: 0 auto; padding: 20px; background-color: ${c.pageBg};">
  <div style="border-top: 3px solid ${c.primary};">
    <div style="background: ${c.headerBg}; padding: 32px;">
      <h1 style="color: ${c.headerFg}; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.025em;">${heading}</h1>
    </div>

    <div style="background: ${c.background}; padding: 32px; border: 1px solid ${c.border}; border-top: none;">
      ${content}

      <hr style="border: none; border-top: 1px solid ${c.border}; margin: 24px 0;">

      <p style="font-size: 11px; color: ${c.subtle}; margin: 0; line-height: 1.5;">
        ${footerNote}
      </p>
    </div>
  </div>

  <p style="font-size: 11px; color: ${c.subtle}; text-align: center; margin: 16px 0 0 0; letter-spacing: 0.05em; text-transform: uppercase;">
    Oatmeal
  </p>
</body>
</html>`
}

export function emailButton(
  label: string,
  url: string,
  variant: "primary" | "outline" = "primary"
): string {
  const btnStyle = variant === "outline"
    ? `background: transparent; color: ${c.foreground}; border: 1px solid ${c.border};`
    : `background: ${c.primary}; color: ${c.primaryFg};`
  return `<div style="text-align: center;"><a href="${url}" style="display: inline-block; ${btnStyle} padding: 12px 24px; text-decoration: none; font-weight: 600; font-size: 14px;">${label}</a></div>`
}

export function emailInfoBox(label: string, value: string): string {
  return `<div style="background: ${c.muted}; padding: 16px 20px; margin-bottom: 24px;">
  <p style="margin: 0 0 4px 0; font-size: 11px; color: ${c.mutedFg}; text-transform: uppercase; letter-spacing: 0.05em;">${label}</p>
  <p style="margin: 0; font-size: 16px; font-weight: 600;">${value}</p>
</div>`
}

export function emailText(html: string): string {
  return `<p style="font-size: 14px; margin-bottom: 24px; line-height: 1.6;">${html}</p>`
}

export function emailSmallText(html: string): string {
  return `<p style="font-size: 12px; color: ${c.mutedFg}; margin-top: 24px; line-height: 1.5;">${html}</p>`
}

export { c as emailColors }
