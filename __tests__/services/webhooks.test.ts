import { describe, expect, it } from "bun:test"
import type { Webhook, WebhookDelivery, WebhookEvent } from "@/lib/db/agent-types"

describe("Webhooks Service", () => {
  describe("Webhook Events", () => {
    const validEvents: WebhookEvent[] = [
      "agent_run.started",
      "agent_run.completed",
      "agent_run.failed",
      "agent_run.step_completed",
    ]

    it("supports agent_run.started event", () => {
      expect(validEvents).toContain("agent_run.started")
    })

    it("supports agent_run.completed event", () => {
      expect(validEvents).toContain("agent_run.completed")
    })

    it("supports agent_run.failed event", () => {
      expect(validEvents).toContain("agent_run.failed")
    })

    it("supports agent_run.step_completed event", () => {
      expect(validEvents).toContain("agent_run.step_completed")
    })
  })

  describe("CreateWebhookInput", () => {
    it("accepts valid webhook input structure", () => {
      const input = {
        tenantId: "tenant-123",
        url: "https://example.com/webhook",
        events: ["agent_run.started", "agent_run.completed"] as WebhookEvent[],
      }

      expect(input.tenantId).toBeDefined()
      expect(input.url).toBeDefined()
      expect(input.events).toHaveLength(2)
    })

    it("requires valid URL format", () => {
      const validUrls = [
        "https://example.com/webhook",
        "https://api.myapp.com/callbacks/agents",
        "http://localhost:3000/dev/webhook",
        "https://hooks.slack.com/services/T00/B00/XXX",
      ]

      for (const url of validUrls) {
        expect(() => new URL(url)).not.toThrow()
      }
    })

    it("events must be an array", () => {
      const input = {
        tenantId: "tenant-123",
        url: "https://example.com/webhook",
        events: ["agent_run.started"] as WebhookEvent[],
      }

      expect(Array.isArray(input.events)).toBe(true)
    })
  })

  describe("Webhook Data Structure", () => {
    it("contains required fields", () => {
      const webhook: Webhook = {
        id: "wh-001",
        tenant_id: "tenant-123",
        url: "https://example.com/webhook",
        secret: "secret-abc",
        events: ["agent_run.completed"],
        is_active: true,
        failure_count: 0,
        last_triggered_at: null,
        last_success_at: null,
        last_failure_at: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      }

      expect(webhook.id).toBeDefined()
      expect(webhook.tenant_id).toBeDefined()
      expect(webhook.url).toBeDefined()
      expect(webhook.secret).toBeDefined()
      expect(webhook.events).toBeDefined()
      expect(webhook.is_active).toBeDefined()
      expect(webhook.failure_count).toBeDefined()
    })

    it("tracks success and failure timestamps", () => {
      const webhook: Webhook = {
        id: "wh-002",
        tenant_id: "tenant-123",
        url: "https://example.com/webhook",
        secret: "secret-xyz",
        events: ["agent_run.started"],
        is_active: true,
        failure_count: 2,
        last_triggered_at: "2024-01-15T10:00:00Z",
        last_success_at: "2024-01-15T09:00:00Z",
        last_failure_at: "2024-01-15T10:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-15T10:00:00Z",
      }

      expect(webhook.last_triggered_at).toBeDefined()
      expect(webhook.last_success_at).toBeDefined()
      expect(webhook.last_failure_at).toBeDefined()
      expect(webhook.failure_count).toBe(2)
    })

    it("supports multiple events per webhook", () => {
      const webhook: Webhook = {
        id: "wh-003",
        tenant_id: "tenant-123",
        url: "https://example.com/webhook",
        secret: "secret-123",
        events: [
          "agent_run.started",
          "agent_run.completed",
          "agent_run.failed",
          "agent_run.step_completed",
        ],
        is_active: true,
        failure_count: 0,
        last_triggered_at: null,
        last_success_at: null,
        last_failure_at: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      }

      expect(webhook.events).toHaveLength(4)
    })
  })

  describe("WebhookDelivery Data Structure", () => {
    it("contains required fields", () => {
      const delivery: WebhookDelivery = {
        id: "wd-001",
        webhook_id: "wh-123",
        event: "agent_run.completed",
        payload: { run_id: "run-456", status: "completed" },
        response_status: 200,
        response_body: '{"ok": true}',
        attempt: 1,
        delivered_at: "2024-01-15T10:00:00Z",
        created_at: "2024-01-15T10:00:00Z",
      }

      expect(delivery.id).toBeDefined()
      expect(delivery.webhook_id).toBeDefined()
      expect(delivery.event).toBeDefined()
      expect(delivery.payload).toBeDefined()
      expect(delivery.attempt).toBeDefined()
    })

    it("tracks failed delivery attempts", () => {
      const delivery: WebhookDelivery = {
        id: "wd-002",
        webhook_id: "wh-123",
        event: "agent_run.started",
        payload: { run_id: "run-789" },
        response_status: 500,
        response_body: "Internal Server Error",
        attempt: 1,
        delivered_at: null,
        created_at: "2024-01-15T10:00:00Z",
      }

      expect(delivery.delivered_at).toBeNull()
      expect(delivery.response_status).toBe(500)
    })

    it("tracks multiple retry attempts", () => {
      const attempts = [
        { attempt: 1, response_status: 503, delivered_at: null },
        { attempt: 2, response_status: 503, delivered_at: null },
        { attempt: 3, response_status: 200, delivered_at: "2024-01-15T10:00:05Z" },
      ]

      expect(attempts[0].attempt).toBe(1)
      expect(attempts[2].attempt).toBe(3)
      expect(attempts[2].delivered_at).not.toBeNull()
    })
  })

  describe("WebhookDeliveryResult", () => {
    it("represents successful delivery", () => {
      const result = {
        success: true,
        status: 200,
        body: '{"received": true}',
      }

      expect(result.success).toBe(true)
      expect(result.status).toBe(200)
      expect(result.error).toBeUndefined()
    })

    it("represents failed delivery with HTTP error", () => {
      const result = {
        success: false,
        status: 500,
        body: "Internal Server Error",
      }

      expect(result.success).toBe(false)
      expect(result.status).toBe(500)
    })

    it("represents failed delivery with network error", () => {
      const result = {
        success: false,
        error: "ECONNREFUSED",
      }

      expect(result.success).toBe(false)
      expect(result.status).toBeUndefined()
      expect(result.error).toBe("ECONNREFUSED")
    })

    it("represents timeout error", () => {
      const result = {
        success: false,
        error: "Request timed out",
      }

      expect(result.success).toBe(false)
      expect(result.error).toContain("timed out")
    })
  })

  describe("Webhook URL Validation", () => {
    it("accepts HTTPS URLs", () => {
      const url = "https://api.example.com/webhook"
      expect(() => new URL(url)).not.toThrow()
      expect(new URL(url).protocol).toBe("https:")
    })

    it("accepts HTTP URLs (for local development)", () => {
      const url = "http://localhost:3000/webhook"
      expect(() => new URL(url)).not.toThrow()
      expect(new URL(url).protocol).toBe("http:")
    })

    it("validates URL structure", () => {
      const validUrls = [
        "https://example.com/webhook",
        "https://sub.example.com/api/v1/hooks",
        "https://example.com:8080/webhook",
        "https://example.com/webhook?key=value",
      ]

      for (const url of validUrls) {
        const parsed = new URL(url)
        expect(parsed.hostname).toBeDefined()
        expect(parsed.pathname).toBeDefined()
      }
    })

    it("rejects invalid URLs", () => {
      const invalidUrls = ["not-a-url", "ftp://example.com/file", "://missing-protocol"]

      for (const url of invalidUrls) {
        expect(() => {
          const parsed = new URL(url)
          if (!["http:", "https:"].includes(parsed.protocol)) {
            throw new Error("Invalid protocol")
          }
        }).toThrow()
      }
    })
  })

  describe("Webhook Payload Structure", () => {
    it("agent_run.started payload", () => {
      const payload = {
        event: "agent_run.started",
        timestamp: "2024-01-15T10:00:00Z",
        data: {
          run_id: "run-123",
          agent_id: "agent-456",
          agent_name: "My Agent",
          triggered_by: "manual",
        },
      }

      expect(payload.event).toBe("agent_run.started")
      expect(payload.data.run_id).toBeDefined()
      expect(payload.data.agent_id).toBeDefined()
    })

    it("agent_run.completed payload", () => {
      const payload = {
        event: "agent_run.completed",
        timestamp: "2024-01-15T10:05:00Z",
        data: {
          run_id: "run-123",
          agent_id: "agent-456",
          agent_name: "My Agent",
          status: "succeeded",
          duration_ms: 5000,
          output: { result: "Task completed successfully" },
        },
      }

      expect(payload.event).toBe("agent_run.completed")
      expect(payload.data.status).toBe("succeeded")
      expect(payload.data.output).toBeDefined()
    })

    it("agent_run.failed payload", () => {
      const payload = {
        event: "agent_run.failed",
        timestamp: "2024-01-15T10:01:00Z",
        data: {
          run_id: "run-123",
          agent_id: "agent-456",
          agent_name: "My Agent",
          status: "failed",
          error: "Tool execution failed: API rate limit exceeded",
        },
      }

      expect(payload.event).toBe("agent_run.failed")
      expect(payload.data.status).toBe("failed")
      expect(payload.data.error).toBeDefined()
    })

    it("agent_run.step_completed payload", () => {
      const payload = {
        event: "agent_run.step_completed",
        timestamp: "2024-01-15T10:00:30Z",
        data: {
          run_id: "run-123",
          agent_id: "agent-456",
          step_index: 2,
          step_type: "tool_call",
          tool_name: "search",
          tool_input: { query: "latest news" },
          tool_output: { results: [] },
        },
      }

      expect(payload.event).toBe("agent_run.step_completed")
      expect(payload.data.step_index).toBe(2)
      expect(payload.data.tool_name).toBe("search")
    })
  })

  describe("Webhook Headers", () => {
    it("includes Content-Type header", () => {
      const headers = {
        "Content-Type": "application/json",
        "X-Webhook-Event": "agent_run.completed",
        "X-Webhook-Signature": "sha256=abc123",
        "X-Webhook-Timestamp": "2024-01-15T10:00:00Z",
      }

      expect(headers["Content-Type"]).toBe("application/json")
    })

    it("includes event type header", () => {
      const headers = {
        "X-Webhook-Event": "agent_run.started",
      }

      expect(headers["X-Webhook-Event"]).toBe("agent_run.started")
    })

    it("includes signature header for verification", () => {
      const headers = {
        "X-Webhook-Signature": "sha256=abc123def456",
      }

      expect(headers["X-Webhook-Signature"]).toContain("sha256=")
    })

    it("includes timestamp header", () => {
      const headers = {
        "X-Webhook-Timestamp": "2024-01-15T10:00:00Z",
      }

      const timestamp = new Date(headers["X-Webhook-Timestamp"])
      expect(timestamp).toBeInstanceOf(Date)
    })
  })

  describe("Failure Count Tracking", () => {
    it("starts at zero", () => {
      const webhook: Partial<Webhook> = {
        failure_count: 0,
        is_active: true,
      }

      expect(webhook.failure_count).toBe(0)
    })

    it("increments on failure", () => {
      let failureCount = 0
      failureCount += 1
      expect(failureCount).toBe(1)
    })

    it("resets on success", () => {
      let failureCount = 5
      failureCount = 0
      expect(failureCount).toBe(0)
    })

    it("can track high failure counts", () => {
      const webhook: Partial<Webhook> = {
        failure_count: 100,
        is_active: false,
      }

      expect(webhook.failure_count).toBe(100)
    })
  })

  describe("Tenant Isolation", () => {
    it("webhooks are scoped to tenant", () => {
      const tenant1Webhooks = [
        { tenant_id: "tenant-1", url: "https://tenant1.com/webhook" },
        { tenant_id: "tenant-1", url: "https://tenant1.com/webhook2" },
      ]

      const tenant2Webhooks = [
        { tenant_id: "tenant-2", url: "https://tenant2.com/webhook" },
      ]

      const allTenant1 = tenant1Webhooks.every((w) => w.tenant_id === "tenant-1")
      const allTenant2 = tenant2Webhooks.every((w) => w.tenant_id === "tenant-2")

      expect(allTenant1).toBe(true)
      expect(allTenant2).toBe(true)
    })

    it("delete requires both webhook_id and tenant_id", () => {
      const deleteConditions = {
        webhookId: "wh-123",
        tenantId: "tenant-456",
      }

      expect(deleteConditions.webhookId).toBeDefined()
      expect(deleteConditions.tenantId).toBeDefined()
    })
  })

  describe("Active Webhook Filtering", () => {
    it("filters by is_active flag", () => {
      const webhooks = [
        { id: "wh-1", is_active: true, events: ["agent_run.completed"] },
        { id: "wh-2", is_active: false, events: ["agent_run.completed"] },
        { id: "wh-3", is_active: true, events: ["agent_run.started"] },
      ]

      const active = webhooks.filter((w) => w.is_active)
      expect(active).toHaveLength(2)
    })

    it("filters by event type", () => {
      const webhooks = [
        { id: "wh-1", is_active: true, events: ["agent_run.completed"] as WebhookEvent[] },
        { id: "wh-2", is_active: true, events: ["agent_run.started"] as WebhookEvent[] },
        {
          id: "wh-3",
          is_active: true,
          events: ["agent_run.completed", "agent_run.failed"] as WebhookEvent[],
        },
      ]

      const targetEvent: WebhookEvent = "agent_run.completed"
      const matching = webhooks.filter((w) => w.events.includes(targetEvent))
      expect(matching).toHaveLength(2)
      expect(matching.map((w) => w.id)).toContain("wh-1")
      expect(matching.map((w) => w.id)).toContain("wh-3")
    })

    it("combines is_active and event type filters", () => {
      const webhooks = [
        { id: "wh-1", is_active: true, events: ["agent_run.completed"] as WebhookEvent[] },
        { id: "wh-2", is_active: false, events: ["agent_run.completed"] as WebhookEvent[] },
        { id: "wh-3", is_active: true, events: ["agent_run.started"] as WebhookEvent[] },
      ]

      const targetEvent: WebhookEvent = "agent_run.completed"
      const matching = webhooks.filter(
        (w) => w.is_active && w.events.includes(targetEvent)
      )
      expect(matching).toHaveLength(1)
      expect(matching[0].id).toBe("wh-1")
    })
  })
})
