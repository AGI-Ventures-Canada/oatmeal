import { describe, it, expect, mock, beforeEach } from "bun:test"
import type { Hackathon, HackathonParticipant } from "@/lib/db/hackathon-types"

const mockFrom = mock(() => ({}))

mock.module("@/lib/db/client", () => ({
  supabase: () => ({ from: mockFrom }),
}))

const {
  listParticipatingHackathons,
  listOrganizedHackathons,
  isUserRegistered,
  getParticipantCount,
  registerForHackathon,
} = await import("@/lib/services/hackathons")

const mockHackathon: Hackathon = {
  id: "h1",
  tenant_id: "t1",
  name: "Test Hackathon",
  slug: "test-hackathon",
  description: "A test hackathon",
  rules: null,
  starts_at: null,
  ends_at: null,
  registration_opens_at: null,
  registration_closes_at: null,
  max_participants: null,
  min_team_size: 1,
  max_team_size: 5,
  allow_solo: true,
  status: "published",
  banner_url: null,
  metadata: {},
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

function createChainableMock(
  resolvedValue: { data: unknown; error: unknown; count?: number | null }
) {
  const chain = {
    select: mock(() => chain),
    eq: mock(() => chain),
    order: mock(() => chain),
    maybeSingle: mock(() => chain),
    single: mock(() => chain),
    insert: mock(() => chain),
    then: (resolve: (v: unknown) => void) => resolve(resolvedValue),
  }
  return chain
}

describe("Hackathons Service", () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  describe("listParticipatingHackathons", () => {
    it("returns hackathons the user participates in", async () => {
      const chain = createChainableMock({
        data: [
          {
            hackathon_id: "h1",
            role: "participant",
            hackathons: mockHackathon,
          },
        ],
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await listParticipatingHackathons("user_123")

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("Test Hackathon")
      expect(result[0].role).toBe("participant")
    })

    it("returns empty array when user has no hackathons", async () => {
      const chain = createChainableMock({ data: [], error: null })
      mockFrom.mockReturnValue(chain)

      const result = await listParticipatingHackathons("user_empty")

      expect(result).toEqual([])
    })

    it("returns empty array on error", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      mockFrom.mockReturnValue(chain)

      const result = await listParticipatingHackathons("user_err")

      expect(result).toEqual([])
    })

    it("filters out rows where hackathons is null", async () => {
      const chain = createChainableMock({
        data: [
          { hackathon_id: "h1", role: "participant", hackathons: null },
          {
            hackathon_id: "h2",
            role: "judge",
            hackathons: { ...mockHackathon, id: "h2", name: "Second" },
          },
        ],
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await listParticipatingHackathons("user_mixed")

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("Second")
      expect(result[0].role).toBe("judge")
    })
  })

  describe("listOrganizedHackathons", () => {
    it("returns hackathons for the tenant", async () => {
      const chain = createChainableMock({
        data: [mockHackathon],
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await listOrganizedHackathons("t1")

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("Test Hackathon")
    })

    it("returns empty array when tenant has no hackathons", async () => {
      const chain = createChainableMock({ data: [], error: null })
      mockFrom.mockReturnValue(chain)

      const result = await listOrganizedHackathons("t_empty")

      expect(result).toEqual([])
    })

    it("returns empty array on error", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      mockFrom.mockReturnValue(chain)

      const result = await listOrganizedHackathons("t_err")

      expect(result).toEqual([])
    })
  })

  describe("isUserRegistered", () => {
    it("returns true when user is registered", async () => {
      const chain = createChainableMock({
        data: { id: "p1" },
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await isUserRegistered("h1", "user_123")

      expect(result).toBe(true)
    })

    it("returns false when user is not registered", async () => {
      const chain = createChainableMock({
        data: null,
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await isUserRegistered("h1", "user_new")

      expect(result).toBe(false)
    })

    it("returns false on error", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      mockFrom.mockReturnValue(chain)

      const result = await isUserRegistered("h1", "user_err")

      expect(result).toBe(false)
    })
  })

  describe("getParticipantCount", () => {
    it("returns correct count", async () => {
      const chain = createChainableMock({
        data: null,
        error: null,
        count: 42,
      })
      mockFrom.mockReturnValue(chain)

      const result = await getParticipantCount("h1")

      expect(result).toBe(42)
    })

    it("returns 0 when no participants", async () => {
      const chain = createChainableMock({
        data: null,
        error: null,
        count: 0,
      })
      mockFrom.mockReturnValue(chain)

      const result = await getParticipantCount("h_empty")

      expect(result).toBe(0)
    })

    it("returns 0 on error", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
        count: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await getParticipantCount("h_err")

      expect(result).toBe(0)
    })
  })

  describe("registerForHackathon", () => {
    it("returns error when hackathon not found", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "Not found" },
      })
      mockFrom.mockReturnValue(chain)

      const result = await registerForHackathon("h_missing", "user_123")

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe("hackathon_not_found")
      }
    })

    it("returns error when registration is not open", async () => {
      const chain = createChainableMock({
        data: {
          id: "h1",
          status: "draft",
          registration_opens_at: null,
          registration_closes_at: null,
          max_participants: null,
        },
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await registerForHackathon("h1", "user_123")

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe("registration_not_open")
      }
    })
  })
})
