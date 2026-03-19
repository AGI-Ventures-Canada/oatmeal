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
