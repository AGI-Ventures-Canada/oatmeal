import { describe, it, expect, mock, beforeEach } from "bun:test"
import type { Hackathon } from "@/lib/db/hackathon-types"

const mockFrom = mock(() => ({}))

mock.module("@/lib/db/client", () => ({
  supabase: () => ({ from: mockFrom }),
}))

const { getPublicHackathon, listPublicHackathons, getHackathonByIdForOrganizer, updateHackathonSettings } = await import(
  "@/lib/services/public-hackathons"
)

const mockHackathon: Hackathon = {
  id: "h1",
  tenant_id: "t1",
  name: "Test Hackathon",
  slug: "test-hackathon",
  description: "A test hackathon",
  rules: "Some rules",
  starts_at: "2026-02-15T09:00:00Z",
  ends_at: "2026-02-17T18:00:00Z",
  registration_opens_at: "2026-02-01T00:00:00Z",
  registration_closes_at: "2026-02-14T23:59:59Z",
  max_participants: 100,
  min_team_size: 1,
  max_team_size: 5,
  allow_solo: true,
  status: "registration_open",
  banner_url: "https://example.com/banner.png",
  metadata: {},
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

const mockOrganizer = {
  id: "t1",
  name: "Test Org",
  slug: "test-org",
  logo_url: null,
}

function createChainableMock(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {
    select: mock(() => chain),
    insert: mock(() => chain),
    update: mock(() => chain),
    eq: mock(() => chain),
    in: mock(() => chain),
    order: mock(() => chain),
    single: mock(() => chain),
    then: (resolve: (v: unknown) => void) => resolve(resolvedValue),
  }
  return chain
}

describe("Public Hackathons Service", () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  describe("getPublicHackathon", () => {
    it("returns hackathon with organizer and sponsors", async () => {
      const hackathonChain = createChainableMock({
        data: { ...mockHackathon, organizer: mockOrganizer },
        error: null,
      })
      const sponsorsChain = createChainableMock({
        data: [{ id: "s1", name: "Sponsor", tier: "gold", tenant: null }],
        error: null,
      })

      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) return hackathonChain
        return sponsorsChain
      })

      const result = await getPublicHackathon("test-hackathon")

      expect(result).not.toBeNull()
      expect(result?.name).toBe("Test Hackathon")
      expect(result?.organizer.name).toBe("Test Org")
      expect(result?.sponsors).toHaveLength(1)
    })

    it("returns null when hackathon not found", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "Not found" },
      })
      mockFrom.mockReturnValue(chain)

      const result = await getPublicHackathon("nonexistent")

      expect(result).toBeNull()
    })
  })

  describe("listPublicHackathons", () => {
    it("returns list of public hackathons", async () => {
      const chain = createChainableMock({
        data: [{ ...mockHackathon, organizer: mockOrganizer }],
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await listPublicHackathons()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("Test Hackathon")
      expect(result[0].organizer.name).toBe("Test Org")
    })

    it("returns empty array on error", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      mockFrom.mockReturnValue(chain)

      const result = await listPublicHackathons()

      expect(result).toEqual([])
    })
  })

  describe("getHackathonByIdForOrganizer", () => {
    it("returns hackathon when tenant owns it", async () => {
      const chain = createChainableMock({
        data: mockHackathon,
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await getHackathonByIdForOrganizer("h1", "t1")

      expect(result).not.toBeNull()
      expect(result?.name).toBe("Test Hackathon")
    })

    it("returns null when hackathon not found", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "Not found" },
      })
      mockFrom.mockReturnValue(chain)

      const result = await getHackathonByIdForOrganizer("h1", "wrong-tenant")

      expect(result).toBeNull()
    })
  })

  describe("updateHackathonSettings", () => {
    it("updates hackathon settings successfully", async () => {
      const chain = createChainableMock({
        data: { ...mockHackathon, name: "Updated Hackathon" },
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await updateHackathonSettings("h1", "t1", {
        name: "Updated Hackathon",
      })

      expect(result).not.toBeNull()
      expect(result?.name).toBe("Updated Hackathon")
    })

    it("returns null on error", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      mockFrom.mockReturnValue(chain)

      const result = await updateHackathonSettings("h1", "t1", {
        name: "Test",
      })

      expect(result).toBeNull()
    })

    it("handles partial updates", async () => {
      const chain = createChainableMock({
        data: { ...mockHackathon, banner_url: "https://new.com/banner.png" },
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await updateHackathonSettings("h1", "t1", {
        bannerUrl: "https://new.com/banner.png",
      })

      expect(result?.banner_url).toBe("https://new.com/banner.png")
    })
  })
})
