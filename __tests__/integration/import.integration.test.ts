import { describe, it, expect, mock, beforeEach } from "bun:test"

const mockExtractLumaEventData = mock(() => Promise.resolve(null))

mock.module("@/lib/services/luma-import", () => ({
  extractLumaEventData: mockExtractLumaEventData,
  normalizeEventDate: (s: string | null) => {
    if (!s) return null
    const match = s.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/)
    return match ? match[1] : s
  },
}))

const { api } = await import("@/lib/api")

describe("POST /api/public/import/luma", () => {
  beforeEach(() => {
    mockExtractLumaEventData.mockClear()
  })

  it("returns extracted event data for valid slug", async () => {
    mockExtractLumaEventData.mockResolvedValueOnce({
      name: "Test Hackathon",
      description: "A test event",
      startsAt: "2026-03-15T09:00:00.000-08:00",
      endsAt: "2026-03-16T17:00:00.000-08:00",
      locationType: "in_person",
      locationName: "San Francisco",
      locationUrl: null,
      imageUrl: "https://images.lumacdn.com/test.png",
    })

    const res = await api.handle(
      new Request("http://localhost/api/public/import/luma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "sfagents" }),
      })
    )

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe("Test Hackathon")
    expect(data.imageUrl).toBe("https://images.lumacdn.com/test.png")
  })

  it("returns 404 when event not found", async () => {
    mockExtractLumaEventData.mockResolvedValueOnce(null)

    const res = await api.handle(
      new Request("http://localhost/api/public/import/luma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "nonexistent" }),
      })
    )

    expect(res.status).toBe(404)
  })

  it("returns 422 when slug is missing", async () => {
    const res = await api.handle(
      new Request("http://localhost/api/public/import/luma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    )

    expect(res.status).toBe(422)
  })
})
