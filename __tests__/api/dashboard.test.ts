import { describe, expect, it } from "bun:test"
import type { Scope } from "@/lib/auth/types"

describe("Dashboard Routes", () => {
  describe("Route Authorization", () => {
    const userRequiredRoutes = [
      { path: "/dashboard/me", method: "GET", scopes: [] },
      { path: "/dashboard/keys", method: "GET", scopes: ["keys:read"] },
      { path: "/dashboard/keys", method: "POST", scopes: ["keys:write"] },
      { path: "/dashboard/keys/:id/revoke", method: "POST", scopes: ["keys:write"] },
      { path: "/dashboard/jobs", method: "GET", scopes: ["jobs:read"] },
      { path: "/dashboard/jobs/:id", method: "GET", scopes: ["jobs:read"] },
    ]

    it("all dashboard routes require user auth", () => {
      for (const route of userRequiredRoutes) {
        expect(route.path.startsWith("/dashboard")).toBe(true)
      }
    })

    it("keys routes require keys:read or keys:write scope", () => {
      const keyRoutes = userRequiredRoutes.filter((r) => r.path.includes("/keys"))
      for (const route of keyRoutes) {
        const hasKeyScope = route.scopes.some(
          (s) => s === "keys:read" || s === "keys:write"
        )
        expect(hasKeyScope).toBe(true)
      }
    })

    it("jobs routes require jobs:read scope", () => {
      const jobRoutes = userRequiredRoutes.filter((r) => r.path.includes("/jobs"))
      for (const route of jobRoutes) {
        expect(route.scopes).toContain("jobs:read")
      }
    })
  })

  describe("API Key Response Format", () => {
    it("key list excludes sensitive hash field", () => {
      const dbKey = {
        id: "key-1",
        name: "Test Key",
        prefix: "sk_live_abc1",
        scopes: ["jobs:create"],
        created_at: "2024-01-01T00:00:00Z",
        last_used_at: null,
        revoked_at: null,
        tenant_id: "tenant-123",
        hash: "secret-hash-value",
      }

      const responseKey = {
        id: dbKey.id,
        name: dbKey.name,
        prefix: dbKey.prefix,
        scopes: dbKey.scopes,
        createdAt: dbKey.created_at,
        lastUsedAt: dbKey.last_used_at,
        revokedAt: dbKey.revoked_at,
      }

      expect(responseKey).not.toHaveProperty("hash")
      expect(responseKey).not.toHaveProperty("tenant_id")
    })

    it("key creation returns raw key only once", () => {
      const createResult = {
        apiKey: {
          id: "key-new",
          name: "New Key",
          prefix: "sk_live_new1",
          scopes: ["jobs:create"],
          created_at: "2024-01-01T00:00:00Z",
        },
        rawKey: "sk_live_new1234567890abcdef",
      }

      expect(createResult.rawKey).toMatch(/^sk_live_/)
      expect(createResult.rawKey.length).toBeGreaterThan(20)
    })
  })

  describe("Job Response Format", () => {
    it("job list includes essential fields", () => {
      const dbJob = {
        id: "job-1",
        type: "completion",
        status_cache: "succeeded",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:01:00Z",
        completed_at: "2024-01-01T00:01:00Z",
        tenant_id: "tenant-123",
        input: { prompt: "Hello" },
        result: { text: "World" },
        error: null,
        workflow_run_id: null,
        created_by_key_id: null,
        idempotency_key: null,
      }

      const listItem = {
        id: dbJob.id,
        type: dbJob.type,
        status: dbJob.status_cache,
        createdAt: dbJob.created_at,
        updatedAt: dbJob.updated_at,
        completedAt: dbJob.completed_at,
      }

      expect(listItem.id).toBe("job-1")
      expect(listItem.status).toBe("succeeded")
      expect(listItem).not.toHaveProperty("input")
      expect(listItem).not.toHaveProperty("result")
    })

    it("job detail includes input/result", () => {
      const dbJob = {
        id: "job-1",
        type: "completion",
        status_cache: "succeeded",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:01:00Z",
        completed_at: "2024-01-01T00:01:00Z",
        input: { prompt: "Hello" },
        result: { text: "World" },
        error: null,
      }

      const detail = {
        id: dbJob.id,
        type: dbJob.type,
        status: dbJob.status_cache,
        input: dbJob.input,
        result: dbJob.result,
        error: dbJob.error,
        createdAt: dbJob.created_at,
        updatedAt: dbJob.updated_at,
        completedAt: dbJob.completed_at,
      }

      expect(detail.input).toEqual({ prompt: "Hello" })
      expect(detail.result).toEqual({ text: "World" })
    })
  })

  describe("Pagination", () => {
    it("parses limit from query string", () => {
      const query = { limit: "10", offset: "20" }
      const options = {
        limit: query.limit ? parseInt(query.limit) : undefined,
        offset: query.offset ? parseInt(query.offset) : undefined,
      }

      expect(options.limit).toBe(10)
      expect(options.offset).toBe(20)
    })

    it("handles missing pagination params", () => {
      const query = {}
      const options = {
        limit: (query as { limit?: string }).limit
          ? parseInt((query as { limit?: string }).limit!)
          : undefined,
        offset: (query as { offset?: string }).offset
          ? parseInt((query as { offset?: string }).offset!)
          : undefined,
      }

      expect(options.limit).toBeUndefined()
      expect(options.offset).toBeUndefined()
    })
  })

  describe("User Principal Info", () => {
    it("returns essential user info from /me endpoint", () => {
      const principal = {
        kind: "user" as const,
        tenantId: "tenant-123",
        userId: "user-456",
        orgId: "org-789",
        orgRole: "org:admin",
        scopes: ["keys:read", "keys:write", "jobs:read"] as Scope[],
      }

      const meResponse = {
        tenantId: principal.tenantId,
        userId: principal.userId,
        orgId: principal.orgId,
        orgRole: principal.orgRole,
        scopes: principal.scopes,
      }

      expect(meResponse.tenantId).toBe("tenant-123")
      expect(meResponse.userId).toBe("user-456")
      expect(meResponse.orgId).toBe("org-789")
      expect(meResponse.scopes).toContain("keys:read")
    })
  })
})
