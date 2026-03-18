import { describe, it, expect, beforeEach } from "bun:test"
import type { Hackathon } from "@/lib/db/hackathon-types"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
  mockMultiTableQuery,
} from "../lib/supabase-mock"

const { getPublicHackathon, listPublicHackathons, getHackathonByIdForOrganizer, checkHackathonOrganizer, updateHackathonSettings, deleteHackathon } = await import(
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

describe("Public Hackathons Service", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  describe("getPublicHackathon", () => {
    it("returns hackathon with organizer and sponsors", async () => {
      mockMultiTableQuery({
        hackathons: { data: { ...mockHackathon, organizer: mockOrganizer }, error: null },
        hackathon_sponsors: { data: [{ id: "s1", name: "Sponsor", tier: "gold", tenant: null }], error: null },
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
        error: { message: "Not found", code: "PGRST116" },
      })
      setMockFromImplementation(() => chain)

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
      setMockFromImplementation(() => chain)

      const result = await listPublicHackathons()

      expect(result.hackathons).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.hackathons[0].name).toBe("Test Hackathon")
      expect(result.hackathons[0].organizer.name).toBe("Test Org")
    })

    it("returns empty array on error", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      setMockFromImplementation(() => chain)

      const result = await listPublicHackathons()

      expect(result).toEqual({ hackathons: [], total: 0 })
    })

    it("applies search filter when search option provided", async () => {
      const chain = createChainableMock({
        data: [{ ...mockHackathon, organizer: mockOrganizer }],
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await listPublicHackathons({ search: "test" })

      expect(result.hackathons).toHaveLength(1)
      expect(chain.or).toHaveBeenCalled()
    })

    it("skips search filter for short queries", async () => {
      const chain = createChainableMock({
        data: [{ ...mockHackathon, organizer: mockOrganizer }],
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await listPublicHackathons({ search: "a" })

      expect(result.hackathons).toHaveLength(1)
      expect(chain.or).not.toHaveBeenCalled()
    })

    it("sanitizes special characters in search", async () => {
      const chain = createChainableMock({
        data: [],
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await listPublicHackathons({ search: "%()" })

      expect(result).toEqual({ hackathons: [], total: 0 })
      expect(chain.or).not.toHaveBeenCalled()
    })

    it("paginates results", async () => {
      const items = Array.from({ length: 15 }, (_, i) => ({
        ...mockHackathon,
        id: `id-${i}`,
        name: `Hackathon ${i}`,
        organizer: mockOrganizer,
      }))
      const chain = createChainableMock({ data: items, error: null })
      setMockFromImplementation(() => chain)

      const result = await listPublicHackathons({ page: 2, limit: 9 })

      expect(result.total).toBe(15)
      expect(result.hackathons).toHaveLength(6)
    })
  })

  describe("getHackathonByIdForOrganizer", () => {
    it("returns hackathon when tenant owns it", async () => {
      const chain = createChainableMock({
        data: mockHackathon,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await getHackathonByIdForOrganizer("h1", "t1")

      expect(result).not.toBeNull()
      expect(result?.name).toBe("Test Hackathon")
    })

    it("returns null when hackathon not found", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "Not found" },
      })
      setMockFromImplementation(() => chain)

      const result = await getHackathonByIdForOrganizer("h1", "wrong-tenant")

      expect(result).toBeNull()
    })
  })

  describe("checkHackathonOrganizer", () => {
    it("returns ok with hackathon when tenant owns it", async () => {
      const chain = createChainableMock({
        data: mockHackathon,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await checkHackathonOrganizer("h1", "t1")

      expect(result.status).toBe("ok")
      if (result.status === "ok") {
        expect(result.hackathon.name).toBe("Test Hackathon")
      }
    })

    it("returns not_found when hackathon does not exist", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "Not found", code: "PGRST116" },
      })
      setMockFromImplementation(() => chain)

      const result = await checkHackathonOrganizer("nonexistent", "t1")

      expect(result.status).toBe("not_found")
    })

    it("returns not_authorized when tenant does not own hackathon", async () => {
      const chain = createChainableMock({
        data: mockHackathon,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await checkHackathonOrganizer("h1", "wrong-tenant")

      expect(result.status).toBe("not_authorized")
    })
  })

  describe("updateHackathonSettings", () => {
    it("updates hackathon settings successfully", async () => {
      const chain = createChainableMock({
        data: { ...mockHackathon, name: "Updated Hackathon" },
        error: null,
      })
      setMockFromImplementation(() => chain)

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
      setMockFromImplementation(() => chain)

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
      setMockFromImplementation(() => chain)

      const result = await updateHackathonSettings("h1", "t1", {
        bannerUrl: "https://new.com/banner.png",
      })

      expect(result?.banner_url).toBe("https://new.com/banner.png")
    })

    it("updates team and participant settings", async () => {
      const chain = createChainableMock({
        data: {
          ...mockHackathon,
          max_participants: 200,
          min_team_size: 2,
          max_team_size: 4,
          allow_solo: false,
        },
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await updateHackathonSettings("h1", "t1", {
        maxParticipants: 200,
        minTeamSize: 2,
        maxTeamSize: 4,
        allowSolo: false,
      })

      expect(result).not.toBeNull()
      expect(result?.max_participants).toBe(200)
      expect(result?.min_team_size).toBe(2)
      expect(result?.max_team_size).toBe(4)
      expect(result?.allow_solo).toBe(false)
    })

    it("sets maxParticipants to null for unlimited", async () => {
      const chain = createChainableMock({
        data: { ...mockHackathon, max_participants: null },
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await updateHackathonSettings("h1", "t1", {
        maxParticipants: null,
      })

      expect(result?.max_participants).toBeNull()
    })

    it("updates judging mode", async () => {
      const chain = createChainableMock({
        data: { ...mockHackathon, judging_mode: "subjective" },
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await updateHackathonSettings("h1", "t1", {
        judgingMode: "subjective",
      })

      expect(result?.judging_mode).toBe("subjective")
    })
  })

  describe("deleteHackathon", () => {
    it("returns true on successful delete", async () => {
      const chain = createChainableMock({ data: null, error: null })
      setMockFromImplementation(() => chain)

      const result = await deleteHackathon("h1", "t1")

      expect(result).toBe(true)
    })

    it("returns false on error", async () => {
      const chain = createChainableMock({ data: null, error: { message: "DB error" } })
      setMockFromImplementation(() => chain)

      const result = await deleteHackathon("h1", "t1")

      expect(result).toBe(false)
    })

    it("filters by both hackathon id and tenant id", async () => {
      const chain = createChainableMock({ data: null, error: null })
      setMockFromImplementation(() => chain)

      await deleteHackathon("h1", "t1")

      expect(chain.eq).toHaveBeenCalledWith("id", "h1")
      expect(chain.eq).toHaveBeenCalledWith("tenant_id", "t1")
    })
  })
})
