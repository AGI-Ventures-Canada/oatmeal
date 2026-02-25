import { describe, it, expect, beforeEach, mock } from "bun:test"

const mockFetch = mock(() => Promise.resolve(new Response("")))
globalThis.fetch = mockFetch as unknown as typeof fetch

const { extractLumaEventData } = await import("@/lib/services/luma-import")

const MOCK_HTML_WITH_JSONLD = `
<html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Test Hackathon",
  "description": "A test event description",
  "startDate": "2026-03-15T09:00:00.000-08:00",
  "endDate": "2026-03-16T17:00:00.000-08:00",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "image": ["https://images.lumacdn.com/test-image.png"],
  "location": {
    "@type": "Place",
    "name": "San Francisco, California",
    "geo": { "@type": "GeoCoordinates", "latitude": 37.79, "longitude": -122.4 }
  }
}
</script>
</head><body></body></html>
`

describe("extractLumaEventData", () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it("extracts event data from JSON-LD", async () => {
    mockFetch.mockResolvedValueOnce(new Response(MOCK_HTML_WITH_JSONLD, { status: 200 }))

    const result = await extractLumaEventData("sfagents")
    expect(result).not.toBeNull()
    expect(result!.name).toBe("Test Hackathon")
    expect(result!.description).toBe("A test event description")
    expect(result!.startsAt).toBe("2026-03-15T09:00:00.000-08:00")
    expect(result!.endsAt).toBe("2026-03-16T17:00:00.000-08:00")
    expect(result!.locationType).toBe("in_person")
    expect(result!.locationName).toBe("San Francisco, California")
    expect(result!.imageUrl).toBe("https://images.lumacdn.com/test-image.png")
  })

  it("fetches from https://luma.com/{slug}", async () => {
    mockFetch.mockResolvedValueOnce(new Response(MOCK_HTML_WITH_JSONLD, { status: 200 }))

    await extractLumaEventData("my-hackathon")
    expect(mockFetch).toHaveBeenCalledWith("https://luma.com/my-hackathon")
  })

  it("returns null when fetch fails", async () => {
    mockFetch.mockResolvedValueOnce(new Response("Not Found", { status: 404 }))

    const result = await extractLumaEventData("nonexistent")
    expect(result).toBeNull()
  })

  it("returns null when no JSON-LD found", async () => {
    mockFetch.mockResolvedValueOnce(new Response("<html><body>No data</body></html>", { status: 200 }))

    const result = await extractLumaEventData("empty-page")
    expect(result).toBeNull()
  })

  it("maps OnlineEventAttendanceMode to virtual", async () => {
    const virtualHtml = MOCK_HTML_WITH_JSONLD.replace(
      "OfflineEventAttendanceMode",
      "OnlineEventAttendanceMode"
    )
    mockFetch.mockResolvedValueOnce(new Response(virtualHtml, { status: 200 }))

    const result = await extractLumaEventData("virtual-event")
    expect(result!.locationType).toBe("virtual")
  })

  it("handles script tags with extra attributes (real Luma format)", async () => {
    const realFormatHtml = `
<html><head>
<script data-cfasync="false" type="application/ld+json" data-next-head="">
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Real Luma Event"
}
</script>
</head><body></body></html>`
    mockFetch.mockResolvedValueOnce(new Response(realFormatHtml, { status: 200 }))

    const result = await extractLumaEventData("real-event")
    expect(result).not.toBeNull()
    expect(result!.name).toBe("Real Luma Event")
  })

  it("handles missing optional fields gracefully", async () => {
    const minimalHtml = `
<html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Minimal Hackathon"
}
</script>
</head><body></body></html>`
    mockFetch.mockResolvedValueOnce(new Response(minimalHtml, { status: 200 }))

    const result = await extractLumaEventData("minimal")
    expect(result).not.toBeNull()
    expect(result!.name).toBe("Minimal Hackathon")
    expect(result!.description).toBeNull()
    expect(result!.startsAt).toBeNull()
    expect(result!.imageUrl).toBeNull()
  })
})
