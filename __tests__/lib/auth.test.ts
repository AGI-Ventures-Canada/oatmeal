import { describe, expect, it } from "bun:test"
import {
  scopesForRole,
  hasScope,
  hasAllScopes,
  ALL_SCOPES,
  DEFAULT_API_KEY_SCOPES,
} from "@/lib/auth/types"
import type { UserPrincipal, ApiKeyPrincipal, AnonPrincipal } from "@/lib/auth/types"

describe("Auth Types", () => {
  describe("scopesForRole", () => {
    it("returns all scopes for org:admin", () => {
      const scopes = scopesForRole("org:admin")
      expect(scopes).toEqual(ALL_SCOPES)
    })

    it("returns read-only scopes for org:member", () => {
      const scopes = scopesForRole("org:member")
      expect(scopes).toContain("jobs:read")
      expect(scopes).toContain("keys:read")
      expect(scopes).not.toContain("jobs:create")
      expect(scopes).not.toContain("keys:write")
    })

    it("returns read-only scopes for unknown roles", () => {
      const scopes = scopesForRole("unknown")
      expect(scopes).toEqual(["jobs:read", "keys:read"])
    })
  })

  describe("hasScope", () => {
    const userPrincipal: UserPrincipal = {
      kind: "user",
      tenantId: "tenant-1",
      userId: "user-1",
      orgId: "org-1",
      orgRole: "org:admin",
      scopes: ["jobs:create", "jobs:read"],
    }

    const apiKeyPrincipal: ApiKeyPrincipal = {
      kind: "api_key",
      tenantId: "tenant-1",
      keyId: "key-1",
      scopes: ["jobs:create", "jobs:read"],
    }

    const anonPrincipal: AnonPrincipal = {
      kind: "anon",
    }

    it("returns true if user has scope", () => {
      expect(hasScope(userPrincipal, "jobs:create")).toBe(true)
      expect(hasScope(userPrincipal, "jobs:read")).toBe(true)
    })

    it("returns false if user lacks scope", () => {
      expect(hasScope(userPrincipal, "keys:write")).toBe(false)
    })

    it("returns true if api_key has scope", () => {
      expect(hasScope(apiKeyPrincipal, "jobs:create")).toBe(true)
    })

    it("returns false for anon principal", () => {
      expect(hasScope(anonPrincipal, "jobs:create")).toBe(false)
      expect(hasScope(anonPrincipal, "jobs:read")).toBe(false)
    })
  })

  describe("hasAllScopes", () => {
    const principal: UserPrincipal = {
      kind: "user",
      tenantId: "tenant-1",
      userId: "user-1",
      orgId: "org-1",
      orgRole: "org:admin",
      scopes: ["jobs:create", "jobs:read", "keys:read"],
    }

    it("returns true if principal has all scopes", () => {
      expect(hasAllScopes(principal, ["jobs:create", "jobs:read"])).toBe(true)
    })

    it("returns false if principal lacks any scope", () => {
      expect(hasAllScopes(principal, ["jobs:create", "keys:write"])).toBe(false)
    })

    it("returns true for empty scopes array", () => {
      expect(hasAllScopes(principal, [])).toBe(true)
    })
  })

  describe("DEFAULT_API_KEY_SCOPES", () => {
    it("includes jobs:create and jobs:read", () => {
      expect(DEFAULT_API_KEY_SCOPES).toContain("jobs:create")
      expect(DEFAULT_API_KEY_SCOPES).toContain("jobs:read")
    })

    it("does not include admin scopes", () => {
      expect(DEFAULT_API_KEY_SCOPES).not.toContain("keys:write")
    })
  })
})
