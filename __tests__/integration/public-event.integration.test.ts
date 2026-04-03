import { describe, expect, it, mock, beforeEach } from "bun:test"

const mockGetPublicHackathon = mock(() => Promise.resolve(null))
const mockBuildPollPayload = mock(() => Promise.resolve(null))

mock.module("@/lib/services/public-hackathons", () => ({
  getPublicHackathon: mockGetPublicHackathon,
}))

mock.module("@/lib/services/polling", () => ({
  buildPollPayload: mockBuildPollPayload,
}))

mock.module("@/lib/services/announcements", () => ({
  listPublishedAnnouncements: mock(() => Promise.resolve([])),
}))

mock.module("@/lib/services/schedule-items", () => ({
  listScheduleItems: mock(() => Promise.resolve([])),
}))

const { Elysia } = await import("elysia")
const { publicEventRoutes } = await import("@/lib/api/routes/public-event")
const { handleRouteError } = await import("@/lib/api/routes/errors")

const app = new Elysia({ prefix: "/api" })
  .onError(({ error, set, path }) => handleRouteError(error, set, path))
  .use(publicEventRoutes)

const mockHackathon = {
  id: "11111111-1111-1111-1111-111111111111",
  slug: "build-os26",
  name: "Build OS26",
  status: "active",
}

const mockPollPayload = {
  ts: Date.now(),
  phase: "build",
  status: "active",
  timers: {
    global: { endsAt: "2026-04-28T17:00:00Z", label: "Build ends" },
    rooms: [],
  },
  challenge: {
    released: true,
    releasedAt: "2026-04-28T10:00:00Z",
    title: "Build an AI tool",
  },
  stats: {
    submissionCount: 5,
    teamCount: 10,
    judgingComplete: 0,
    judgingTotal: 0,
    mentorQueueOpen: 2,
  },
}

describe("Public Event Routes Integration Tests", () => {
  beforeEach(() => {
    mockGetPublicHackathon.mockReset()
    mockBuildPollPayload.mockReset()
  })

  describe("GET /api/public/hackathons/:slug/poll", () => {
    const url = "http://localhost/api/public/hackathons/build-os26/poll"

    it("returns poll payload for a valid hackathon", async () => {
      mockGetPublicHackathon.mockResolvedValue(mockHackathon)
      mockBuildPollPayload.mockResolvedValue(mockPollPayload)

      const res = await app.handle(new Request(url))
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.phase).toBe("build")
      expect(data.status).toBe("active")
      expect(data.timers.global.endsAt).toBe("2026-04-28T17:00:00Z")
      expect(data.stats.submissionCount).toBe(5)
    })

    it("returns 404 when hackathon not found", async () => {
      mockGetPublicHackathon.mockResolvedValue(null)

      const res = await app.handle(new Request(url))
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data.error).toBe("Hackathon not found")
    })

    it("returns 500 when poll payload build fails", async () => {
      mockGetPublicHackathon.mockResolvedValue(mockHackathon)
      mockBuildPollPayload.mockResolvedValue(null)

      const res = await app.handle(new Request(url))
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data.error).toBe("Failed to build poll payload")
    })

    it("sets cache control headers", async () => {
      mockGetPublicHackathon.mockResolvedValue(mockHackathon)
      mockBuildPollPayload.mockResolvedValue(mockPollPayload)

      const res = await app.handle(new Request(url))

      expect(res.headers.get("Cache-Control")).toBe(
        "public, max-age=2, stale-while-revalidate=5"
      )
    })

    it("passes hackathon id to buildPollPayload", async () => {
      mockGetPublicHackathon.mockResolvedValue(mockHackathon)
      mockBuildPollPayload.mockResolvedValue(mockPollPayload)

      await app.handle(new Request(url))

      expect(mockBuildPollPayload).toHaveBeenCalledWith(
        "11111111-1111-1111-1111-111111111111"
      )
    })
  })
})
