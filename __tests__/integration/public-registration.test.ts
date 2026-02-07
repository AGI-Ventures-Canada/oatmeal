import { describe, expect, it, mock, beforeEach } from "bun:test"

const mockAuth = mock(() => Promise.resolve({ userId: null }))
const mockGetPublicHackathon = mock(() => Promise.resolve(null))
const mockRegisterForHackathon = mock(() =>
  Promise.resolve({ success: true, participantId: "p1" })
)

mock.module("@clerk/nextjs/server", () => ({
  auth: mockAuth,
  clerkClient: mock(() => Promise.resolve({
    organizations: {
      getOrganization: mock(() => Promise.resolve({ name: "Test Org" })),
    },
  })),
}))

mock.module("@/lib/services/public-hackathons", () => ({
  getPublicHackathon: mockGetPublicHackathon,
  listPublicHackathons: mock(() => Promise.resolve([])),
  getHackathonByIdForOrganizer: mock(() => Promise.resolve(null)),
  getHackathonByIdWithFullData: mock(() => Promise.resolve(null)),
  getHackathonByIdWithAccess: mock(() => Promise.resolve(null)),
  updateHackathonSettings: mock(() => Promise.resolve(null)),
}))

mock.module("@/lib/services/hackathons", () => ({
  registerForHackathon: mockRegisterForHackathon,
}))

mock.module("@/lib/services/tenant-profiles", () => ({
  getPublicTenantWithHackathons: mock(() => Promise.resolve(null)),
}))

mock.module("@/lib/integrations/oauth", () => ({
  exchangeCodeForTokens: mock(() => Promise.resolve(null)),
  saveIntegration: mock(() => Promise.resolve()),
  getProviderConfig: mock(() => null),
}))

const { Elysia } = await import("elysia")
const { publicRoutes } = await import("@/lib/api/routes/public")

const app = new Elysia({ prefix: "/api" }).use(publicRoutes)

const mockHackathon = {
  id: "h1",
  name: "Test Hackathon",
  slug: "test-hackathon",
  description: "A test hackathon",
  rules: null,
  banner_url: null,
  status: "registration_open",
  starts_at: "2026-03-01T00:00:00Z",
  ends_at: "2026-03-02T00:00:00Z",
  registration_opens_at: "2026-01-01T00:00:00Z",
  registration_closes_at: "2026-02-28T00:00:00Z",
  organizer: {
    id: "t1",
    name: "Test Org",
    slug: "test-org",
    logo_url: null,
  },
  sponsors: [],
}

describe("Public Registration Routes", () => {
  beforeEach(() => {
    mockAuth.mockReset()
    mockGetPublicHackathon.mockReset()
    mockRegisterForHackathon.mockReset()
  })

  describe("POST /api/public/hackathons/:slug/register", () => {
    it("returns 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null })

      const res = await app.handle(
        new Request("http://localhost/api/public/hackathons/test-hackathon/register", {
          method: "POST",
        })
      )
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data.code).toBe("not_authenticated")
    })

    it("returns 404 when hackathon not found", async () => {
      mockAuth.mockResolvedValue({ userId: "user_123" })
      mockGetPublicHackathon.mockResolvedValue(null)

      const res = await app.handle(
        new Request("http://localhost/api/public/hackathons/nonexistent/register", {
          method: "POST",
        })
      )
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data.code).toBe("hackathon_not_found")
    })

    it("returns success when registration succeeds", async () => {
      mockAuth.mockResolvedValue({ userId: "user_123" })
      mockGetPublicHackathon.mockResolvedValue(mockHackathon)
      mockRegisterForHackathon.mockResolvedValue({
        success: true,
        participantId: "p123",
      })

      const res = await app.handle(
        new Request("http://localhost/api/public/hackathons/test-hackathon/register", {
          method: "POST",
        })
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.participantId).toBe("p123")
    })

    it("returns 409 when already registered", async () => {
      mockAuth.mockResolvedValue({ userId: "user_123" })
      mockGetPublicHackathon.mockResolvedValue(mockHackathon)
      mockRegisterForHackathon.mockResolvedValue({
        success: false,
        error: "Already registered for this hackathon",
        code: "already_registered",
      })

      const res = await app.handle(
        new Request("http://localhost/api/public/hackathons/test-hackathon/register", {
          method: "POST",
        })
      )
      const data = await res.json()

      expect(res.status).toBe(409)
      expect(data.code).toBe("already_registered")
    })

    it("returns 400 when registration is not open", async () => {
      mockAuth.mockResolvedValue({ userId: "user_123" })
      mockGetPublicHackathon.mockResolvedValue(mockHackathon)
      mockRegisterForHackathon.mockResolvedValue({
        success: false,
        error: "Registration is not open",
        code: "registration_not_open",
      })

      const res = await app.handle(
        new Request("http://localhost/api/public/hackathons/test-hackathon/register", {
          method: "POST",
        })
      )
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.code).toBe("registration_not_open")
    })

    it("returns 400 when at capacity", async () => {
      mockAuth.mockResolvedValue({ userId: "user_123" })
      mockGetPublicHackathon.mockResolvedValue(mockHackathon)
      mockRegisterForHackathon.mockResolvedValue({
        success: false,
        error: "Event is at full capacity",
        code: "at_capacity",
      })

      const res = await app.handle(
        new Request("http://localhost/api/public/hackathons/test-hackathon/register", {
          method: "POST",
        })
      )
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.code).toBe("at_capacity")
    })

    it("returns 400 when registration has closed", async () => {
      mockAuth.mockResolvedValue({ userId: "user_123" })
      mockGetPublicHackathon.mockResolvedValue(mockHackathon)
      mockRegisterForHackathon.mockResolvedValue({
        success: false,
        error: "Registration has closed",
        code: "registration_closed",
      })

      const res = await app.handle(
        new Request("http://localhost/api/public/hackathons/test-hackathon/register", {
          method: "POST",
        })
      )
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.code).toBe("registration_closed")
    })

    it("calls registerForHackathon with correct parameters", async () => {
      mockAuth.mockResolvedValue({ userId: "user_456" })
      mockGetPublicHackathon.mockResolvedValue(mockHackathon)
      mockRegisterForHackathon.mockResolvedValue({
        success: true,
        participantId: "p789",
      })

      await app.handle(
        new Request("http://localhost/api/public/hackathons/test-hackathon/register", {
          method: "POST",
        })
      )

      expect(mockRegisterForHackathon).toHaveBeenCalledWith("h1", "user_456")
    })
  })
})
