import { cache } from "react"

export type LumaEventData = {
  name: string
  description: string | null
  startsAt: string | null
  endsAt: string | null
  locationType: "in_person" | "virtual" | null
  locationName: string | null
  locationUrl: string | null
  imageUrl: string | null
}

export function normalizeEventDate(isoString: string | null): string | null {
  if (!isoString) return null

  const match = isoString.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/
  )
  if (!match) return isoString

  const [, year, month, day, hour, minute, second] = match

  return `${year}-${month}-${day}T${hour}:${minute}:${second}`
}

const ATTENDANCE_MODE_MAP: Record<string, "in_person" | "virtual"> = {
  "https://schema.org/OfflineEventAttendanceMode": "in_person",
  "https://schema.org/OnlineEventAttendanceMode": "virtual",
  "https://schema.org/MixedEventAttendanceMode": "in_person",
}

export const extractLumaEventData = cache(async function extractLumaEventData(
  slug: string
): Promise<LumaEventData | null> {
  const url = `https://luma.com/${slug}`

  let response: Response
  try {
    response = await fetch(url)
  } catch (err) {
    console.error(`Failed to fetch Luma event from ${url}:`, err)
    return null
  }

  if (!response.ok) return null

  const html = await response.text()
  return parseJsonLd(html)
})

function parseJsonLd(html: string): LumaEventData | null {
  const jsonLdMatch = html.match(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/
  )
  if (!jsonLdMatch) return null

  let data: Record<string, unknown>
  try {
    data = JSON.parse(jsonLdMatch[1])
  } catch (err) {
    console.error("Failed to parse JSON-LD from Luma page:", err)
    return null
  }

  if (data["@type"] !== "Event") return null

  const name = data.name as string | undefined
  if (!name) return null

  const location = data.location as Record<string, unknown> | undefined
  const images = data.image as string[] | undefined
  const attendanceMode = data.eventAttendanceMode as string | undefined
  const locationType = attendanceMode ? (ATTENDANCE_MODE_MAP[attendanceMode] ?? null) : null

  return {
    name,
    description: (data.description as string) ?? null,
    startsAt: normalizeEventDate((data.startDate as string) ?? null),
    endsAt: normalizeEventDate((data.endDate as string) ?? null),
    locationType,
    locationName: buildLocationName(location),
    locationUrl: locationType === "virtual" ? null : (location?.url as string) ?? null,
    imageUrl: images?.[0] ?? null,
  }
}

const PLACEHOLDER_ADDRESS_PATTERNS = [
  /register to see/i,
  /rsvp to see/i,
  /sign up to see/i,
]

function isPlaceholderAddress(address: string): boolean {
  return PLACEHOLDER_ADDRESS_PATTERNS.some((p) => p.test(address))
}

function buildLocationName(
  location: Record<string, unknown> | undefined
): string | null {
  if (!location) return null

  const locationName = (location.name as string) ?? null
  const rawAddress = location.address

  let addressStr: string | null = null

  if (typeof rawAddress === "string" && rawAddress.trim()) {
    if (!isPlaceholderAddress(rawAddress)) {
      addressStr = rawAddress.trim()
    }
  } else if (rawAddress && typeof rawAddress === "object") {
    const postal = rawAddress as Record<string, unknown>
    const parts = [
      postal.streetAddress,
      postal.addressLocality,
      postal.addressRegion,
    ].filter((p): p is string => typeof p === "string" && p.trim().length > 0)

    if (parts.length > 0) {
      addressStr = parts.join(", ")
    }
  }

  if (locationName && addressStr) {
    if (addressStr.includes(locationName)) return addressStr
    if (locationName.includes(addressStr)) return locationName
    return `${locationName} (${addressStr})`
  }

  return locationName ?? addressStr ?? null
}
