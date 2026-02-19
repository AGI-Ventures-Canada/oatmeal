import { describe, it, expect, beforeEach } from "bun:test"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
} from "../lib/supabase-mock"

const { upsertTenantSponsor, updateTenantSponsorLogos, searchTenantSponsors } =
  await import("@/lib/services/tenant-sponsors")

const mockTenantSponsor = {
  id: "ts1",
  tenant_id: "t1",
  name: "Acme Corp",
  logo_url: "https://example.com/logo.png",
  logo_url_dark: "https://example.com/logo-dark.png",
  website_url: "https://acme.com",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

describe("Tenant Sponsors Service", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  describe("upsertTenantSponsor", () => {
    it("upserts and returns a tenant sponsor", async () => {
      const chain = createChainableMock({ data: mockTenantSponsor, error: null })
      setMockFromImplementation(() => chain)

      const result = await upsertTenantSponsor("t1", {
        name: "Acme Corp",
        logoUrl: "https://example.com/logo.png",
        logoUrlDark: "https://example.com/logo-dark.png",
        websiteUrl: "https://acme.com",
      })

      expect(result).not.toBeNull()
      expect(result?.name).toBe("Acme Corp")
      expect(result?.logo_url).toBe("https://example.com/logo.png")
      expect(result?.logo_url_dark).toBe("https://example.com/logo-dark.png")
      expect(result?.website_url).toBe("https://acme.com")
    })

    it("returns null on error", async () => {
      const chain = createChainableMock({ data: null, error: { message: "DB error" } })
      setMockFromImplementation(() => chain)

      const result = await upsertTenantSponsor("t1", { name: "Acme Corp" })

      expect(result).toBeNull()
    })

    it("sets optional fields to null when not provided", async () => {
      const chain = createChainableMock({
        data: { ...mockTenantSponsor, logo_url: null, logo_url_dark: null, website_url: null },
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await upsertTenantSponsor("t1", { name: "Acme Corp" })

      expect(result?.logo_url).toBeNull()
      expect(result?.logo_url_dark).toBeNull()
      expect(result?.website_url).toBeNull()
    })

    it("queries the tenant_sponsors table", async () => {
      const chain = createChainableMock({ data: mockTenantSponsor, error: null })
      let capturedTable = ""
      setMockFromImplementation((table) => {
        capturedTable = table
        return chain
      })

      await upsertTenantSponsor("t1", { name: "Acme Corp" })

      expect(capturedTable).toBe("tenant_sponsors")
    })
  })

  describe("updateTenantSponsorLogos", () => {
    it("updates logo_url successfully", async () => {
      const chain = createChainableMock({ data: null, error: null })
      setMockFromImplementation(() => chain)

      await expect(
        updateTenantSponsorLogos("ts1", "t1", { logoUrl: "https://example.com/new.png" })
      ).resolves.toBeUndefined()
    })

    it("updates logo_url_dark successfully", async () => {
      const chain = createChainableMock({ data: null, error: null })
      setMockFromImplementation(() => chain)

      await expect(
        updateTenantSponsorLogos("ts1", "t1", { logoUrlDark: "https://example.com/dark.png" })
      ).resolves.toBeUndefined()
    })

    it("updates both logo fields simultaneously", async () => {
      const chain = createChainableMock({ data: null, error: null })
      setMockFromImplementation(() => chain)

      await expect(
        updateTenantSponsorLogos("ts1", "t1", {
          logoUrl: "https://example.com/new.png",
          logoUrlDark: "https://example.com/new-dark.png",
        })
      ).resolves.toBeUndefined()

      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          logo_url: "https://example.com/new.png",
          logo_url_dark: "https://example.com/new-dark.png",
        })
      )
    })

    it("does not include undefined fields in update payload", async () => {
      const chain = createChainableMock({ data: null, error: null })
      setMockFromImplementation(() => chain)

      await updateTenantSponsorLogos("ts1", "t1", { logoUrl: "https://example.com/new.png" })

      const updateArg = (chain.update as ReturnType<typeof import("bun:test").mock>).mock.calls[0][0]
      expect(updateArg).not.toHaveProperty("logo_url_dark")
    })

    it("completes without throwing on DB error", async () => {
      const chain = createChainableMock({ data: null, error: { message: "Update failed" } })
      setMockFromImplementation(() => chain)

      await expect(
        updateTenantSponsorLogos("ts1", "t1", { logoUrl: null })
      ).resolves.toBeUndefined()
    })
  })

  describe("searchTenantSponsors", () => {
    it("returns empty array when query is empty", async () => {
      const result = await searchTenantSponsors("t1", "")
      expect(result).toEqual([])
    })

    it("returns empty array when query is 1 character", async () => {
      const result = await searchTenantSponsors("t1", "a")
      expect(result).toEqual([])
    })

    it("returns empty array when sanitized query is too short", async () => {
      const result = await searchTenantSponsors("t1", "%_")
      expect(result).toEqual([])
    })

    it("returns matching results", async () => {
      const searchResult = {
        id: "ts1",
        name: "Acme Corp",
        logo_url: null,
        logo_url_dark: null,
        website_url: null,
      }
      const chain = createChainableMock({ data: [searchResult], error: null })
      setMockFromImplementation(() => chain)

      const result = await searchTenantSponsors("t1", "acme")

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("Acme Corp")
    })

    it("returns empty array on DB error", async () => {
      const chain = createChainableMock({ data: null, error: { message: "DB error" } })
      setMockFromImplementation(() => chain)

      const result = await searchTenantSponsors("t1", "acme")

      expect(result).toEqual([])
    })

    it("returns empty array when no results found", async () => {
      const chain = createChainableMock({ data: [], error: null })
      setMockFromImplementation(() => chain)

      const result = await searchTenantSponsors("t1", "zzz")

      expect(result).toEqual([])
    })

    it("applies excludeNames filter", async () => {
      const chain = createChainableMock({ data: [], error: null })
      setMockFromImplementation(() => chain)

      await searchTenantSponsors("t1", "acme", { excludeNames: ["Acme Corp"] })

      expect(chain.not).toHaveBeenCalledWith("name", "in", expect.stringContaining("Acme Corp"))
    })

    it("does not apply not filter when excludeNames is empty", async () => {
      const chain = createChainableMock({ data: [], error: null })
      setMockFromImplementation(() => chain)

      await searchTenantSponsors("t1", "acme", { excludeNames: [] })

      expect(chain.not).not.toHaveBeenCalled()
    })

    it("respects custom limit option", async () => {
      const chain = createChainableMock({ data: [], error: null })
      setMockFromImplementation(() => chain)

      await searchTenantSponsors("t1", "acme", { limit: 10 })

      expect(chain.limit).toHaveBeenCalledWith(10)
    })

    it("defaults to limit 5", async () => {
      const chain = createChainableMock({ data: [], error: null })
      setMockFromImplementation(() => chain)

      await searchTenantSponsors("t1", "acme")

      expect(chain.limit).toHaveBeenCalledWith(5)
    })
  })
})
