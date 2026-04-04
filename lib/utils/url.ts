export function safeRedirectUrl(url: string | undefined, fallback = "/home"): string {
  if (!url) return fallback
  if (url.startsWith("/") && !url.startsWith("//")) return url
  return fallback
}

export const urlInputProps = {
  type: "text",
  inputMode: "url",
  autoCapitalize: "none",
  spellCheck: false,
} as const

export function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function normalizeUrlFieldValue(input: string): string {
  return normalizeUrl(input)
}

export function normalizeOptionalUrl(
  input: string | null | undefined
): string | null | undefined {
  if (input === undefined || input === null) {
    return input
  }

  const normalized = normalizeUrlFieldValue(input)
  return normalized || null
}

export function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`)

    if (url.protocol !== "https:") return false

    // URL constructor wraps IPv6 in brackets: new URL("https://[::1]/").hostname === "[::1]"
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "")

    if (hostname === "localhost" || hostname === "0.0.0.0") return false

    if (hostname.includes(":")) {
      // IPv6 loopback
      if (hostname === "::1") return false
      // IPv6 link-local: fe80::/10 (fe80 – febf)
      if (/^fe[89ab][0-9a-f]/i.test(hostname)) return false
      // IPv6 unique-local: fc00::/7 (fc__ and fd__)
      if (/^f[cd][0-9a-f]{2}/i.test(hostname)) return false
    }

    const octets = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
    if (octets) {
      const [a, b] = [Number(octets[1]), Number(octets[2])]
      if (a === 127) return false
      if (a === 10) return false
      if (a === 172 && b >= 16 && b <= 31) return false
      if (a === 192 && b === 168) return false
      if (a === 169 && b === 254) return false
      if (a === 100 && b >= 64 && b <= 127) return false
    }

    return true
  } catch {
    return false
  }
}
