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

  return {
    name,
    description: (data.description as string) ?? null,
    startsAt: (data.startDate as string) ?? null,
    endsAt: (data.endDate as string) ?? null,
    locationType: attendanceMode ? (ATTENDANCE_MODE_MAP[attendanceMode] ?? null) : null,
    locationName: (location?.name as string) ?? null,
    locationUrl: (location?.url as string) ?? null,
    imageUrl: images?.[0] ?? null,
  }
}
