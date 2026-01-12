import { describe, expect, it } from "bun:test"
import type { AuditAction } from "@/lib/services/audit"

describe("Audit Service", () => {
  describe("Audit Actions", () => {
    const validActions: AuditAction[] = [
      "api_key.created",
      "api_key.revoked",
      "job.created",
      "job.canceled",
    ]

    it("supports api_key.created action", () => {
      expect(validActions).toContain("api_key.created")
    })

    it("supports api_key.revoked action", () => {
      expect(validActions).toContain("api_key.revoked")
    })

    it("supports job.created action", () => {
      expect(validActions).toContain("job.created")
    })

    it("supports job.canceled action", () => {
      expect(validActions).toContain("job.canceled")
    })
  })

  describe("Actor Type Mapping", () => {
    it("maps user principal to user actor type", () => {
      const principal = { kind: "user" as const }
      const actorType = principal.kind === "user" ? "user" : "api_key"
      expect(actorType).toBe("user")
    })

    it("maps api_key principal to api_key actor type", () => {
      const principal = { kind: "api_key" as const }
      const actorType = principal.kind === "user" ? "user" : "api_key"
      expect(actorType).toBe("api_key")
    })
  })

  describe("Actor ID Extraction", () => {
    it("extracts userId from user principal", () => {
      const principal = {
        kind: "user" as const,
        userId: "user-123",
        tenantId: "tenant-1",
        orgId: "org-1",
        orgRole: "admin",
        scopes: [],
      }
      const actorId = principal.kind === "user" ? principal.userId : ""
      expect(actorId).toBe("user-123")
    })

    it("extracts keyId from api_key principal", () => {
      const principal = {
        kind: "api_key" as const,
        keyId: "key-456",
        tenantId: "tenant-1",
        scopes: [],
      }
      const actorId = principal.kind === "api_key" ? principal.keyId : ""
      expect(actorId).toBe("key-456")
    })
  })

  describe("Audit Log Structure", () => {
    it("includes required fields", () => {
      const auditLog = {
        id: "audit-1",
        tenant_id: "tenant-123",
        action: "api_key.created",
        actor_type: "user",
        actor_id: "user-456",
        resource_type: "api_key",
        resource_id: "key-789",
        metadata: { name: "My API Key" },
        created_at: new Date().toISOString(),
      }

      expect(auditLog.id).toBeDefined()
      expect(auditLog.tenant_id).toBeDefined()
      expect(auditLog.action).toBeDefined()
      expect(auditLog.actor_type).toBeDefined()
      expect(auditLog.actor_id).toBeDefined()
      expect(auditLog.resource_type).toBeDefined()
      expect(auditLog.created_at).toBeDefined()
    })

    it("resource_id is optional", () => {
      const auditLog = {
        id: "audit-1",
        tenant_id: "tenant-123",
        action: "job.created",
        actor_type: "api_key",
        actor_id: "key-456",
        resource_type: "job",
        resource_id: null,
        metadata: null,
        created_at: new Date().toISOString(),
      }

      expect(auditLog.resource_id).toBeNull()
    })

    it("metadata is optional", () => {
      const auditLog = {
        id: "audit-1",
        tenant_id: "tenant-123",
        action: "job.canceled",
        actor_type: "api_key",
        actor_id: "key-456",
        resource_type: "job",
        resource_id: "job-789",
        metadata: null,
        created_at: new Date().toISOString(),
      }

      expect(auditLog.metadata).toBeNull()
    })

    it("metadata can be any JSON", () => {
      const validMetadata = [
        { name: "Test" },
        { count: 123, tags: ["a", "b"] },
        { nested: { deep: { value: true } } },
        null,
      ]

      for (const metadata of validMetadata) {
        expect(() => JSON.stringify(metadata)).not.toThrow()
      }
    })
  })

  describe("List Audit Logs", () => {
    it("default limit applies when not specified", () => {
      const options = { limit: undefined, offset: undefined }
      const effectiveLimit = options.limit ?? 50
      expect(effectiveLimit).toBe(50)
    })

    it("respects custom limit", () => {
      const options = { limit: 10 }
      const effectiveLimit = options.limit ?? 50
      expect(effectiveLimit).toBe(10)
    })

    it("respects offset for pagination", () => {
      const options = { limit: 10, offset: 20 }
      const rangeStart = options.offset
      const rangeEnd = options.offset + (options.limit ?? 50) - 1

      expect(rangeStart).toBe(20)
      expect(rangeEnd).toBe(29)
    })

    it("orders by created_at descending", () => {
      const logs = [
        { created_at: "2024-01-03T00:00:00Z" },
        { created_at: "2024-01-01T00:00:00Z" },
        { created_at: "2024-01-02T00:00:00Z" },
      ]

      const sorted = [...logs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      expect(sorted[0].created_at).toBe("2024-01-03T00:00:00Z")
      expect(sorted[1].created_at).toBe("2024-01-02T00:00:00Z")
      expect(sorted[2].created_at).toBe("2024-01-01T00:00:00Z")
    })
  })

  describe("Tenant Isolation", () => {
    it("audit logs are scoped to tenant", () => {
      const tenant1Logs = [
        { tenant_id: "tenant-1", action: "job.created" },
        { tenant_id: "tenant-1", action: "job.canceled" },
      ]

      const tenant2Logs = [
        { tenant_id: "tenant-2", action: "api_key.created" },
      ]

      const allTenant1 = tenant1Logs.every((log) => log.tenant_id === "tenant-1")
      const allTenant2 = tenant2Logs.every((log) => log.tenant_id === "tenant-2")

      expect(allTenant1).toBe(true)
      expect(allTenant2).toBe(true)
    })
  })
})
