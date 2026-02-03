import { describe, it, expect, mock, beforeEach } from "bun:test"
import type { TenantProfile } from "@/lib/db/hackathon-types"

const mockFrom = mock(() => ({}))

mock.module("@/lib/db/client", () => ({
  supabase: () => ({ from: mockFrom }),
}))

const {
  getPublicTenantBySlug,
  getPublicTenantById,
  updateTenantProfile,
  generateSlug,
  isSlugAvailable,
  getPublicTenantWithHackathons,
} = await import("@/lib/services/tenant-profiles")

const mockTenant: TenantProfile = {
  id: "t1",
  clerk_org_id: "org_123",
  clerk_user_id: null,
  name: "Test Org",
  slug: "test-org",
  logo_url: "https://example.com/logo.png",
  logo_url_dark: "https://example.com/logo-dark.png",
  description: "A test organization",
  website_url: "https://example.com",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

function createChainableMock(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {
    select: mock(() => chain),
    update: mock(() => chain),
    eq: mock(() => chain),
    neq: mock(() => chain),
    in: mock(() => chain),
    order: mock(() => chain),
    single: mock(() => chain),
    maybeSingle: mock(() => chain),
    then: (resolve: (v: unknown) => void) => resolve(resolvedValue),
  }
  return chain
}

describe("Tenant Profiles Service", () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  describe("getPublicTenantBySlug", () => {
    it("returns tenant by slug", async () => {
      const chain = createChainableMock({
        data: mockTenant,
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await getPublicTenantBySlug("test-org")

      expect(result).not.toBeNull()
      expect(result?.name).toBe("Test Org")
      expect(result?.slug).toBe("test-org")
    })

    it("returns null when not found", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "Not found" },
      })
      mockFrom.mockReturnValue(chain)

      const result = await getPublicTenantBySlug("nonexistent")

      expect(result).toBeNull()
    })
  })

  describe("getPublicTenantById", () => {
    it("returns tenant by id", async () => {
      const chain = createChainableMock({
        data: mockTenant,
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await getPublicTenantById("t1")

      expect(result).not.toBeNull()
      expect(result?.id).toBe("t1")
    })

    it("returns null when not found", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "Not found" },
      })
      mockFrom.mockReturnValue(chain)

      const result = await getPublicTenantById("nonexistent")

      expect(result).toBeNull()
    })
  })

  describe("updateTenantProfile", () => {
    it("updates tenant profile successfully", async () => {
      const chain = createChainableMock({
        data: { ...mockTenant, description: "Updated description" },
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await updateTenantProfile("t1", {
        description: "Updated description",
      })

      expect(result).not.toBeNull()
      expect(result?.description).toBe("Updated description")
    })

    it("returns null on error", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      mockFrom.mockReturnValue(chain)

      const result = await updateTenantProfile("t1", { name: "New Name" })

      expect(result).toBeNull()
    })
  })

  describe("generateSlug", () => {
    it("generates slug from name", () => {
      expect(generateSlug("Test Organization")).toBe("test-organization")
    })

    it("removes special characters", () => {
      expect(generateSlug("Test & Organization!")).toBe("test-organization")
    })

    it("handles multiple spaces", () => {
      expect(generateSlug("Test   Organization")).toBe("test-organization")
    })

    it("handles leading/trailing dashes", () => {
      expect(generateSlug(" Test Organization ")).toBe("test-organization")
    })

    it("handles already lowercase", () => {
      expect(generateSlug("test-org")).toBe("test-org")
    })
  })

  describe("isSlugAvailable", () => {
    it("returns true when slug is available", async () => {
      const chain = createChainableMock({
        data: null,
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await isSlugAvailable("available-slug")

      expect(result).toBe(true)
    })

    it("returns false when slug is taken", async () => {
      const chain = createChainableMock({
        data: { id: "t2" },
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await isSlugAvailable("taken-slug")

      expect(result).toBe(false)
    })

    it("excludes specified tenant when checking", async () => {
      const chain = createChainableMock({
        data: null,
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await isSlugAvailable("my-slug", "t1")

      expect(result).toBe(true)
    })

    it("returns false on error", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })
      mockFrom.mockReturnValue(chain)

      const result = await isSlugAvailable("any-slug")

      expect(result).toBe(false)
    })
  })

  describe("getPublicTenantWithHackathons", () => {
    it("returns tenant with hackathons", async () => {
      const tenantChain = createChainableMock({
        data: mockTenant,
        error: null,
      })
      const hackathonsChain = createChainableMock({
        data: [{ id: "h1", name: "Test Hackathon", slug: "test-hackathon" }],
        error: null,
      })

      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) return tenantChain
        return hackathonsChain
      })

      const result = await getPublicTenantWithHackathons("test-org")

      expect(result).not.toBeNull()
      expect(result?.name).toBe("Test Org")
      expect(result?.hackathons).toHaveLength(1)
    })

    it("returns null when tenant not found", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "Not found" },
      })
      mockFrom.mockReturnValue(chain)

      const result = await getPublicTenantWithHackathons("nonexistent")

      expect(result).toBeNull()
    })

    it("returns tenant with empty hackathons array on hackathons error", async () => {
      const tenantChain = createChainableMock({
        data: mockTenant,
        error: null,
      })
      const hackathonsChain = createChainableMock({
        data: null,
        error: { message: "DB error" },
      })

      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) return tenantChain
        return hackathonsChain
      })

      const result = await getPublicTenantWithHackathons("test-org")

      expect(result).not.toBeNull()
      expect(result?.hackathons).toEqual([])
    })
  })
})
