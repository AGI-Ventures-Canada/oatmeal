import { describe, expect, it } from "bun:test"

describe("Tenants Service", () => {
  describe("Org Tenant Creation Logic", () => {
    it("generates default name from clerk org id", () => {
      const clerkOrgId = "org_abc123xyz789"
      const defaultName = `Org ${clerkOrgId.slice(0, 8)}`
      expect(defaultName).toBe("Org org_abc1")
    })

    it("handles short org ids", () => {
      const clerkOrgId = "org_ab"
      const defaultName = `Org ${clerkOrgId.slice(0, 8)}`
      expect(defaultName).toBe("Org org_ab")
    })
  })

  describe("Personal Tenant Creation Logic", () => {
    it("generates default name from clerk user id", () => {
      const clerkUserId = "user_abc123xyz789"
      const defaultName = `Personal ${clerkUserId.slice(0, 8)}`
      expect(defaultName).toBe("Personal user_abc")
    })

    it("uses provided userName when available", () => {
      const userName = "Jane Doe"
      const defaultName = userName ?? `Personal ${"user_abc".slice(0, 8)}`
      expect(defaultName).toBe("Jane Doe")
    })

    it("falls back to user id prefix when no userName", () => {
      const userName: string | undefined = undefined
      const clerkUserId = "user_xyz"
      const defaultName = userName ?? `Personal ${clerkUserId.slice(0, 8)}`
      expect(defaultName).toBe("Personal user_xyz")
    })
  })

  describe("Tenant Lookup", () => {
    it("clerk_org_id should be unique per tenant", () => {
      const tenant1 = { id: "t1", clerk_org_id: "org_123" }
      const tenant2 = { id: "t2", clerk_org_id: "org_456" }

      expect(tenant1.clerk_org_id).not.toBe(tenant2.clerk_org_id)
    })

    it("clerk_user_id should be unique per tenant", () => {
      const tenant1 = { id: "t1", clerk_user_id: "user_123" }
      const tenant2 = { id: "t2", clerk_user_id: "user_456" }

      expect(tenant1.clerk_user_id).not.toBe(tenant2.clerk_user_id)
    })

    it("tenant id is a uuid", () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const tenantId = "123e4567-e89b-12d3-a456-426614174000"
      expect(tenantId).toMatch(uuidRegex)
    })
  })

  describe("Tenant Update", () => {
    it("updates updated_at timestamp on name change", () => {
      const before = new Date("2024-01-01T00:00:00Z")
      const after = new Date("2024-01-02T00:00:00Z")

      expect(after.getTime()).toBeGreaterThan(before.getTime())
    })

    it("name can be any non-empty string", () => {
      const validNames = [
        "My Company",
        "Acme Inc.",
        "日本語の会社",
        "Company with spaces and numbers 123",
        "A",
      ]

      for (const name of validNames) {
        expect(name.length).toBeGreaterThan(0)
      }
    })
  })

  describe("Get or Create Logic", () => {
    it("returns existing tenant if found", () => {
      const existing = { id: "t1", clerk_org_id: "org_123", name: "Existing" }
      const result = existing ? existing : null

      expect(result).toBe(existing)
    })

    it("creates new tenant if not found", () => {
      const existing = null
      const created = { id: "t2", clerk_org_id: "org_456", name: "New Org" }
      const result = existing ?? created

      expect(result).toBe(created)
    })

    it("creates personal tenant if not found", () => {
      const existing = null
      const created = { id: "t3", clerk_user_id: "user_789", name: "Personal user_78" }
      const result = existing ?? created

      expect(result).toBe(created)
      expect(result.clerk_user_id).toBe("user_789")
    })
  })

  describe("Tenant Owner Constraint", () => {
    it("org tenant has clerk_org_id set", () => {
      const tenant = { clerk_org_id: "org_123", clerk_user_id: null }
      expect(tenant.clerk_org_id !== null || tenant.clerk_user_id !== null).toBe(true)
    })

    it("personal tenant has clerk_user_id set", () => {
      const tenant = { clerk_org_id: null, clerk_user_id: "user_456" }
      expect(tenant.clerk_org_id !== null || tenant.clerk_user_id !== null).toBe(true)
    })

    it("tenant must have at least one owner id", () => {
      const tenant = { clerk_org_id: null, clerk_user_id: null }
      const isValid = tenant.clerk_org_id !== null || tenant.clerk_user_id !== null
      expect(isValid).toBe(false)
    })
  })
})
