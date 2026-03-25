import { describe, it, expect } from "bun:test"
import type { Principal, AdminPrincipal, ApiKeyPrincipal } from "@/lib/auth/types"
import { ADMIN_SCOPES } from "@/lib/auth/types"
import { requireAdmin, requireAdminScopes, AuthError } from "@/lib/auth/principal"

const originalAdminEnabled = process.env.ADMIN_ENABLED

function withAdminEnabled(fn: () => void) {
  process.env.ADMIN_ENABLED = "true"
  try {
    fn()
  } finally {
    if (originalAdminEnabled === undefined) {
      delete process.env.ADMIN_ENABLED
    } else {
      process.env.ADMIN_ENABLED = originalAdminEnabled
    }
  }
}

const adminPrincipal: AdminPrincipal = {
  kind: "admin",
  userId: "user-123",
  tenantId: "tenant-123",
  orgId: null,
  scopes: ADMIN_SCOPES,
}

const adminApiKeyPrincipal: ApiKeyPrincipal = {
  kind: "api_key",
  tenantId: "tenant-123",
  keyId: "key-admin",
  scopes: ["admin:read", "admin:write", "admin:scenarios", "hackathons:read"],
}

const readOnlyAdminApiKeyPrincipal: ApiKeyPrincipal = {
  kind: "api_key",
  tenantId: "tenant-123",
  keyId: "key-readonly",
  scopes: ["admin:read"],
}

const regularApiKeyPrincipal: ApiKeyPrincipal = {
  kind: "api_key",
  tenantId: "tenant-123",
  keyId: "key-regular",
  scopes: ["hackathons:read", "hackathons:write"],
}

const anonPrincipal: Principal = { kind: "anon" }

describe("requireAdmin", () => {
  describe("when admin is disabled", () => {
    it("throws 404 for admin principal", () => {
      process.env.ADMIN_ENABLED = undefined as unknown as string
      delete process.env.ADMIN_ENABLED
      expect(() => requireAdmin(adminPrincipal)).toThrow(AuthError)
      try {
        requireAdmin(adminPrincipal)
      } catch (e) {
        expect((e as AuthError).statusCode).toBe(404)
      }
    })

    it("throws 404 for API key with admin scopes", () => {
      delete process.env.ADMIN_ENABLED
      expect(() => requireAdmin(adminApiKeyPrincipal)).toThrow(AuthError)
    })
  })

  describe("when admin is enabled", () => {
    it("passes for admin principal (Clerk session)", () => {
      withAdminEnabled(() => {
        expect(() => requireAdmin(adminPrincipal)).not.toThrow()
      })
    })

    it("passes for API key with all admin scopes", () => {
      withAdminEnabled(() => {
        expect(() => requireAdmin(adminApiKeyPrincipal)).not.toThrow()
      })
    })

    it("passes for API key with any admin scope (gate check)", () => {
      withAdminEnabled(() => {
        expect(() => requireAdmin(readOnlyAdminApiKeyPrincipal)).not.toThrow()
      })
    })

    it("rejects regular API key without admin scopes", () => {
      withAdminEnabled(() => {
        expect(() => requireAdmin(regularApiKeyPrincipal)).toThrow(AuthError)
      })
    })

    it("rejects anon principal", () => {
      withAdminEnabled(() => {
        expect(() => requireAdmin(anonPrincipal)).toThrow(AuthError)
      })
    })
  })
})

describe("requireAdminScopes", () => {
  it("always passes for admin principal (Clerk session)", () => {
    expect(() => requireAdminScopes(adminPrincipal, ["admin:write"])).not.toThrow()
    expect(() => requireAdminScopes(adminPrincipal, ["admin:read", "admin:write", "admin:scenarios"])).not.toThrow()
  })

  it("passes for API key with matching scopes", () => {
    expect(() => requireAdminScopes(adminApiKeyPrincipal, ["admin:read"])).not.toThrow()
    expect(() => requireAdminScopes(adminApiKeyPrincipal, ["admin:write"])).not.toThrow()
    expect(() => requireAdminScopes(adminApiKeyPrincipal, ["admin:scenarios"])).not.toThrow()
  })

  it("rejects API key missing required scope", () => {
    expect(() => requireAdminScopes(readOnlyAdminApiKeyPrincipal, ["admin:write"])).toThrow(AuthError)
    try {
      requireAdminScopes(readOnlyAdminApiKeyPrincipal, ["admin:write"])
    } catch (e) {
      expect((e as AuthError).statusCode).toBe(403)
      expect((e as AuthError).message).toContain("admin:write")
    }
  })

  it("rejects when any of multiple required scopes is missing", () => {
    expect(() => requireAdminScopes(readOnlyAdminApiKeyPrincipal, ["admin:read", "admin:write"])).toThrow(AuthError)
  })
})
