import { describe, expect, it, beforeEach } from "bun:test"
import type { UserPrincipal, ApiKeyPrincipal, AdminPrincipal } from "@/lib/auth/types"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
} from "../lib/supabase-mock"

const { logAudit, listAuditLogs } = await import("@/lib/services/audit")

const mockUserPrincipal: UserPrincipal = {
  kind: "user",
  tenantId: "tenant-123",
  userId: "user-456",
  orgId: "org-789",
  orgRole: "org:admin",
  scopes: ["keys:read", "keys:write"],
}

const mockApiKeyPrincipal: ApiKeyPrincipal = {
  kind: "api_key",
  tenantId: "tenant-123",
  keyId: "key-456",
  scopes: ["hackathons:read", "hackathons:write"],
}

const mockAdminPrincipal: AdminPrincipal = {
  kind: "admin",
  userId: "admin-789",
  tenantId: "tenant-123",
  orgId: null,
  scopes: ["admin:read", "admin:write", "admin:scenarios"],
}

describe("Audit Service", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  describe("logAudit", () => {
    it("creates audit log for user principal", async () => {
      const mockAuditLog = {
        id: "audit-1",
        tenant_id: "tenant-123",
        action: "api_key.created",
        actor_type: "user",
        actor_id: "user-456",
        resource_type: "api_key",
        resource_id: "key-789",
        metadata: { name: "My API Key" },
        created_at: "2024-01-01T00:00:00Z",
      }

      const chain = createChainableMock({
        data: mockAuditLog,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await logAudit({
        principal: mockUserPrincipal,
        action: "api_key.created",
        resourceType: "api_key",
        resourceId: "key-789",
        metadata: { name: "My API Key" },
      })

      expect(result).not.toBeNull()
      expect(result?.action).toBe("api_key.created")
      expect(result?.actor_type).toBe("user")
      expect(result?.actor_id).toBe("user-456")
    })

    it("creates audit log for api_key principal", async () => {
      const mockAuditLog = {
        id: "audit-2",
        tenant_id: "tenant-123",
        action: "job.created",
        actor_type: "api_key",
        actor_id: "key-456",
        resource_type: "job",
        resource_id: "job-789",
        metadata: { type: "completion" },
        created_at: "2024-01-01T00:00:00Z",
      }

      const chain = createChainableMock({
        data: mockAuditLog,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await logAudit({
        principal: mockApiKeyPrincipal,
        action: "job.created",
        resourceType: "job",
        resourceId: "job-789",
        metadata: { type: "completion" },
      })

      expect(result).not.toBeNull()
      expect(result?.action).toBe("job.created")
      expect(result?.actor_type).toBe("api_key")
      expect(result?.actor_id).toBe("key-456")
    })

    it("handles optional resource_id", async () => {
      const mockAuditLog = {
        id: "audit-3",
        tenant_id: "tenant-123",
        action: "hackathon.created",
        actor_type: "user",
        actor_id: "user-456",
        resource_type: "hackathon",
        resource_id: null,
        metadata: null,
        created_at: "2024-01-01T00:00:00Z",
      }

      const chain = createChainableMock({
        data: mockAuditLog,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await logAudit({
        principal: mockUserPrincipal,
        action: "hackathon.created",
        resourceType: "hackathon",
      })

      expect(result).not.toBeNull()
      expect(result?.resource_id).toBeNull()
    })

    it("handles optional metadata", async () => {
      const mockAuditLog = {
        id: "audit-4",
        tenant_id: "tenant-123",
        action: "api_key.revoked",
        actor_type: "user",
        actor_id: "user-456",
        resource_type: "api_key",
        resource_id: "key-123",
        metadata: null,
        created_at: "2024-01-01T00:00:00Z",
      }

      const chain = createChainableMock({
        data: mockAuditLog,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await logAudit({
        principal: mockUserPrincipal,
        action: "api_key.revoked",
        resourceType: "api_key",
        resourceId: "key-123",
      })

      expect(result).not.toBeNull()
      expect(result?.metadata).toBeNull()
    })

    it("creates audit log for admin principal with targetTenantId", async () => {
      const mockAuditLog = {
        id: "audit-admin-1",
        tenant_id: "target-tenant-123",
        action: "admin.hackathon.updated",
        actor_type: "user",
        actor_id: "admin-789",
        resource_type: "hackathon",
        resource_id: "h-123",
        metadata: { is_admin_action: true, admin_user_id: "admin-789", fields: ["status"] },
        created_at: "2024-01-01T00:00:00Z",
      }

      const chain = createChainableMock({
        data: mockAuditLog,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await logAudit({
        principal: mockAdminPrincipal,
        action: "admin.hackathon.updated",
        resourceType: "hackathon",
        resourceId: "h-123",
        targetTenantId: "target-tenant-123",
        metadata: { fields: ["status"] },
      })

      expect(result).not.toBeNull()
      expect(result?.action).toBe("admin.hackathon.updated")
      expect(result?.actor_id).toBe("admin-789")
    })

    it("throws for admin principal without targetTenantId and no principal tenantId", async () => {
      const noTenantAdminPrincipal: AdminPrincipal = {
        kind: "admin",
        userId: "admin-789",
        tenantId: null,
        orgId: null,
        scopes: ["admin:read", "admin:write", "admin:scenarios"],
      }
      expect(
        logAudit({
          principal: noTenantAdminPrincipal,
          action: "admin.hackathon.updated",
          resourceType: "hackathon",
          resourceId: "h-123",
        })
      ).rejects.toThrow("Admin audit log requires targetTenantId")
    })

    it("returns null on database error", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "Database error" },
      })
      setMockFromImplementation(() => chain)

      const result = await logAudit({
        principal: mockUserPrincipal,
        action: "api_key.created",
        resourceType: "api_key",
        resourceId: "key-789",
      })

      expect(result).toBeNull()
    })

    it("handles complex metadata objects", async () => {
      const complexMetadata = {
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
        string: "test",
      }

      const mockAuditLog = {
        id: "audit-5",
        tenant_id: "tenant-123",
        action: "hackathon.updated",
        actor_type: "api_key",
        actor_id: "key-456",
        resource_type: "hackathon",
        resource_id: "h-123",
        metadata: complexMetadata,
        created_at: "2024-01-01T00:00:00Z",
      }

      const chain = createChainableMock({
        data: mockAuditLog,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await logAudit({
        principal: mockApiKeyPrincipal,
        action: "hackathon.updated",
        resourceType: "hackathon",
        resourceId: "h-123",
        metadata: complexMetadata,
      })

      expect(result).not.toBeNull()
      expect(result?.metadata).toEqual(complexMetadata)
    })
  })

  describe("listAuditLogs", () => {
    it("returns audit logs for tenant", async () => {
      const mockLogs = [
        {
          id: "audit-1",
          tenant_id: "tenant-123",
          action: "api_key.created",
          actor_type: "user",
          actor_id: "user-456",
          resource_type: "api_key",
          resource_id: "key-1",
          metadata: null,
          created_at: "2024-01-03T00:00:00Z",
        },
        {
          id: "audit-2",
          tenant_id: "tenant-123",
          action: "job.created",
          actor_type: "api_key",
          actor_id: "key-456",
          resource_type: "job",
          resource_id: "job-1",
          metadata: null,
          created_at: "2024-01-02T00:00:00Z",
        },
      ]

      const chain = createChainableMock({
        data: mockLogs,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await listAuditLogs("tenant-123")

      expect(result).toHaveLength(2)
      expect(result[0].action).toBe("api_key.created")
      expect(result[1].action).toBe("job.created")
    })

    it("returns empty array when no logs exist", async () => {
      const chain = createChainableMock({
        data: [],
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await listAuditLogs("tenant-empty")

      expect(result).toEqual([])
    })

    it("returns empty array on error", async () => {
      const chain = createChainableMock({
        data: null,
        error: { message: "Database error" },
      })
      setMockFromImplementation(() => chain)

      const result = await listAuditLogs("tenant-error")

      expect(result).toEqual([])
    })

    it("respects limit option", async () => {
      const mockLogs = [
        {
          id: "audit-1",
          tenant_id: "tenant-123",
          action: "api_key.created",
          actor_type: "user",
          actor_id: "user-456",
          resource_type: "api_key",
          resource_id: "key-1",
          metadata: null,
          created_at: "2024-01-01T00:00:00Z",
        },
      ]

      const chain = createChainableMock({
        data: mockLogs,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await listAuditLogs("tenant-123", { limit: 1 })

      expect(result).toHaveLength(1)
    })

    it("respects offset option for pagination", async () => {
      const mockLogs = [
        {
          id: "audit-3",
          tenant_id: "tenant-123",
          action: "job.canceled",
          actor_type: "api_key",
          actor_id: "key-456",
          resource_type: "job",
          resource_id: "job-3",
          metadata: null,
          created_at: "2024-01-01T00:00:00Z",
        },
      ]

      const chain = createChainableMock({
        data: mockLogs,
        error: null,
      })
      setMockFromImplementation(() => chain)

      const result = await listAuditLogs("tenant-123", { limit: 10, offset: 20 })

      expect(result).toHaveLength(1)
    })
  })

  describe("Audit Actions", () => {
    const testCases: Array<{ action: string; resourceType: string }> = [
      { action: "api_key.created", resourceType: "api_key" },
      { action: "api_key.revoked", resourceType: "api_key" },
      { action: "job.created", resourceType: "job" },
      { action: "job.canceled", resourceType: "job" },
      { action: "webhook.created", resourceType: "webhook" },
      { action: "webhook.deleted", resourceType: "webhook" },
      { action: "hackathon.created", resourceType: "hackathon" },
      { action: "hackathon.updated", resourceType: "hackathon" },
    ]

    for (const { action, resourceType } of testCases) {
      it(`logs ${action} action correctly`, async () => {
        const mockAuditLog = {
          id: "audit-test",
          tenant_id: "tenant-123",
          action,
          actor_type: "user",
          actor_id: "user-456",
          resource_type: resourceType,
          resource_id: "resource-123",
          metadata: null,
          created_at: "2024-01-01T00:00:00Z",
        }

        const chain = createChainableMock({
          data: mockAuditLog,
          error: null,
        })
        setMockFromImplementation(() => chain)

        const result = await logAudit({
          principal: mockUserPrincipal,
          action: action as Parameters<typeof logAudit>[0]["action"],
          resourceType,
          resourceId: "resource-123",
        })

        expect(result).not.toBeNull()
        expect(result?.action).toBe(action)
        expect(result?.resource_type).toBe(resourceType)
      })
    }
  })
})
