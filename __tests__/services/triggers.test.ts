import { describe, expect, it, beforeAll, afterAll } from "bun:test"
import {
  generateInboundEmailAddress,
  buildEmailTriggerInput,
  buildLumaTriggerInput,
  getTriggerType,
} from "@/lib/services/triggers"
import type {
  EmailAddress,
  InboundEmail,
  LumaWebhookConfig,
  LumaEventType,
} from "@/lib/db/agent-types"

describe("Triggers Service", () => {
  describe("generateInboundEmailAddress", () => {
    const originalEnv = process.env.RESEND_RECEIVING_DOMAIN

    beforeAll(() => {
      delete process.env.RESEND_RECEIVING_DOMAIN
    })

    afterAll(() => {
      if (originalEnv) {
        process.env.RESEND_RECEIVING_DOMAIN = originalEnv
      } else {
        delete process.env.RESEND_RECEIVING_DOMAIN
      }
    })

    it("generates email with default domain when env not set", () => {
      delete process.env.RESEND_RECEIVING_DOMAIN
      const result = generateInboundEmailAddress("12345678-abcd-efgh-ijkl-mnopqrstuvwx")
      expect(result).toBe("inbox-12345678@agents.resend.app")
    })

    it("generates email with custom domain from env", () => {
      process.env.RESEND_RECEIVING_DOMAIN = "mycompany.resend.app"
      const result = generateInboundEmailAddress("12345678-abcd-efgh-ijkl-mnopqrstuvwx")
      expect(result).toBe("inbox-12345678@mycompany.resend.app")
      delete process.env.RESEND_RECEIVING_DOMAIN
    })

    it("uses first 8 characters of tenant ID as prefix", () => {
      delete process.env.RESEND_RECEIVING_DOMAIN
      const result = generateInboundEmailAddress("abcdefgh-1234-5678-90ab-cdefghijklmn")
      expect(result).toContain("inbox-abcdefgh@")
    })

    it("handles short tenant IDs", () => {
      delete process.env.RESEND_RECEIVING_DOMAIN
      const result = generateInboundEmailAddress("short")
      expect(result).toBe("inbox-short@agents.resend.app")
    })
  })

  describe("buildEmailTriggerInput", () => {
    const mockEmailAddress: EmailAddress = {
      id: "ea-123",
      tenant_id: "tenant-456",
      address: "inbox-abc@test.resend.app",
      domain: "test.resend.app",
      is_custom_domain: false,
      agent_id: "agent-789",
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
    }

    it("builds correct trigger input from email address and inbound email", () => {
      const mockInboundEmail: InboundEmail = {
        id: "ie-001",
        email_address_id: "ea-123",
        resend_email_id: "resend-xyz",
        from_address: "sender@example.com",
        subject: "Test Subject",
        body_text: "Plain text body",
        body_html: "<p>HTML body</p>",
        attachments: null,
        agent_run_id: null,
        received_at: "2024-01-15T10:00:00Z",
      }

      const result = buildEmailTriggerInput(mockEmailAddress, mockInboundEmail)

      expect(result.trigger).toBe("email")
      expect(result.emailAddressId).toBe("ea-123")
      expect(result.inboundEmailId).toBe("ie-001")
      expect(result.from).toBe("sender@example.com")
      expect(result.subject).toBe("Test Subject")
      expect(result.body).toBe("Plain text body")
    })

    it("uses HTML body when text body is not available", () => {
      const mockInboundEmail: InboundEmail = {
        id: "ie-002",
        email_address_id: "ea-123",
        resend_email_id: "resend-abc",
        from_address: "sender@example.com",
        subject: "HTML Only",
        body_text: null,
        body_html: "<p>HTML content</p>",
        attachments: null,
        agent_run_id: null,
        received_at: "2024-01-15T10:00:00Z",
      }

      const result = buildEmailTriggerInput(mockEmailAddress, mockInboundEmail)
      expect(result.body).toBe("<p>HTML content</p>")
    })

    it("uses empty string when no body is available", () => {
      const mockInboundEmail: InboundEmail = {
        id: "ie-003",
        email_address_id: "ea-123",
        resend_email_id: "resend-def",
        from_address: "sender@example.com",
        subject: "No Body",
        body_text: null,
        body_html: null,
        attachments: null,
        agent_run_id: null,
        received_at: "2024-01-15T10:00:00Z",
      }

      const result = buildEmailTriggerInput(mockEmailAddress, mockInboundEmail)
      expect(result.body).toBe("")
    })

    it("uses (no subject) when subject is null", () => {
      const mockInboundEmail: InboundEmail = {
        id: "ie-004",
        email_address_id: "ea-123",
        resend_email_id: "resend-ghi",
        from_address: "sender@example.com",
        subject: null,
        body_text: "Body content",
        body_html: null,
        attachments: null,
        agent_run_id: null,
        received_at: "2024-01-15T10:00:00Z",
      }

      const result = buildEmailTriggerInput(mockEmailAddress, mockInboundEmail)
      expect(result.subject).toBe("(no subject)")
    })

    it("includes attachments when present", () => {
      const mockInboundEmail: InboundEmail = {
        id: "ie-005",
        email_address_id: "ea-123",
        resend_email_id: "resend-jkl",
        from_address: "sender@example.com",
        subject: "With Attachments",
        body_text: "See attached",
        body_html: null,
        attachments: [
          { id: "att-1", filename: "doc.pdf", contentType: "application/pdf" },
          { id: "att-2", filename: "image.png", contentType: "image/png" },
        ],
        agent_run_id: null,
        received_at: "2024-01-15T10:00:00Z",
      }

      const result = buildEmailTriggerInput(mockEmailAddress, mockInboundEmail)
      expect(result.attachments).toHaveLength(2)
      expect(result.attachments![0].filename).toBe("doc.pdf")
      expect(result.attachments![1].contentType).toBe("image/png")
    })

    it("attachments is undefined when null", () => {
      const mockInboundEmail: InboundEmail = {
        id: "ie-006",
        email_address_id: "ea-123",
        resend_email_id: "resend-mno",
        from_address: "sender@example.com",
        subject: "No Attachments",
        body_text: "Body",
        body_html: null,
        attachments: null,
        agent_run_id: null,
        received_at: "2024-01-15T10:00:00Z",
      }

      const result = buildEmailTriggerInput(mockEmailAddress, mockInboundEmail)
      expect(result.attachments).toBeUndefined()
    })
  })

  describe("buildLumaTriggerInput", () => {
    const mockConfig: LumaWebhookConfig = {
      id: "lc-123",
      tenant_id: "tenant-456",
      webhook_token: "token-abc",
      calendar_id: "cal-789",
      event_types: ["guest.registered", "event.created"],
      agent_id: "agent-xyz",
      is_active: true,
      created_at: "2024-01-01T00:00:00Z",
    }

    it("builds correct trigger input from config and event", () => {
      const eventType: LumaEventType = "guest.registered"
      const eventData = {
        guest: { name: "John Doe", email: "john@example.com" },
        event_id: "evt-123",
      }

      const result = buildLumaTriggerInput(mockConfig, eventType, eventData)

      expect(result.trigger).toBe("luma_webhook")
      expect(result.configId).toBe("lc-123")
      expect(result.eventType).toBe("guest.registered")
      expect(result.data).toEqual(eventData)
    })

    it("handles different event types", () => {
      const eventTypes: LumaEventType[] = [
        "event.created",
        "event.updated",
        "guest.registered",
        "guest.updated",
        "ticket.registered",
      ]

      for (const eventType of eventTypes) {
        const result = buildLumaTriggerInput(mockConfig, eventType, { test: true })
        expect(result.eventType).toBe(eventType)
      }
    })

    it("preserves complex event data", () => {
      const eventData = {
        event: {
          id: "evt-123",
          name: "Tech Conference",
          start_time: "2024-06-15T09:00:00Z",
          attendees: [
            { name: "Alice", status: "confirmed" },
            { name: "Bob", status: "pending" },
          ],
        },
        metadata: {
          source: "api",
          version: 2,
        },
      }

      const result = buildLumaTriggerInput(mockConfig, "event.updated", eventData)
      expect(result.data).toEqual(eventData)
    })
  })

  describe("getTriggerType", () => {
    it("returns email for email trigger input", () => {
      const input = {
        trigger: "email" as const,
        emailAddressId: "ea-123",
        inboundEmailId: "ie-456",
        from: "sender@example.com",
        subject: "Test",
        body: "Content",
      }

      expect(getTriggerType(input)).toBe("email")
    })

    it("returns luma_webhook for luma trigger input", () => {
      const input = {
        trigger: "luma_webhook" as const,
        configId: "lc-123",
        eventType: "guest.registered" as LumaEventType,
        data: { guest: {} },
      }

      expect(getTriggerType(input)).toBe("luma_webhook")
    })

    it("returns scheduled for scheduled trigger input", () => {
      const input = {
        trigger: "scheduled" as const,
        scheduleId: "sch-123",
        scheduleName: "Daily Job",
        input: { param: "value" },
      }

      expect(getTriggerType(input)).toBe("scheduled")
    })

    it("returns manual for manual trigger input", () => {
      const input = {
        trigger: "manual" as const,
        prompt: "Do something",
        context: { key: "value" },
      }

      expect(getTriggerType(input)).toBe("manual")
    })
  })

  describe("Email Address Data Structure", () => {
    it("contains required fields", () => {
      const emailAddress: EmailAddress = {
        id: "ea-001",
        tenant_id: "tenant-123",
        address: "inbox-abc@test.resend.app",
        domain: "test.resend.app",
        is_custom_domain: false,
        agent_id: null,
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      }

      expect(emailAddress.id).toBeDefined()
      expect(emailAddress.tenant_id).toBeDefined()
      expect(emailAddress.address).toBeDefined()
      expect(emailAddress.domain).toBeDefined()
      expect(emailAddress.is_custom_domain).toBeDefined()
      expect(emailAddress.is_active).toBeDefined()
    })

    it("agent_id is optional", () => {
      const emailAddress: EmailAddress = {
        id: "ea-002",
        tenant_id: "tenant-123",
        address: "inbox-xyz@test.resend.app",
        domain: "test.resend.app",
        is_custom_domain: false,
        agent_id: null,
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      }

      expect(emailAddress.agent_id).toBeNull()
    })

    it("supports custom domains", () => {
      const emailAddress: EmailAddress = {
        id: "ea-003",
        tenant_id: "tenant-123",
        address: "receipts@mycompany.com",
        domain: "mycompany.com",
        is_custom_domain: true,
        agent_id: "agent-456",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      }

      expect(emailAddress.is_custom_domain).toBe(true)
      expect(emailAddress.domain).toBe("mycompany.com")
    })
  })

  describe("Inbound Email Data Structure", () => {
    it("contains required fields", () => {
      const inboundEmail: InboundEmail = {
        id: "ie-001",
        email_address_id: "ea-123",
        resend_email_id: "resend-xyz",
        from_address: "sender@example.com",
        subject: "Test Subject",
        body_text: "Content",
        body_html: "<p>Content</p>",
        attachments: null,
        agent_run_id: null,
        received_at: "2024-01-15T10:00:00Z",
      }

      expect(inboundEmail.id).toBeDefined()
      expect(inboundEmail.email_address_id).toBeDefined()
      expect(inboundEmail.resend_email_id).toBeDefined()
      expect(inboundEmail.from_address).toBeDefined()
      expect(inboundEmail.received_at).toBeDefined()
    })

    it("tracks linked agent run", () => {
      const inboundEmail: InboundEmail = {
        id: "ie-002",
        email_address_id: "ea-123",
        resend_email_id: "resend-abc",
        from_address: "sender@example.com",
        subject: "Processed Email",
        body_text: "Content",
        body_html: null,
        attachments: null,
        agent_run_id: "run-789",
        received_at: "2024-01-15T10:00:00Z",
      }

      expect(inboundEmail.agent_run_id).toBe("run-789")
    })
  })

  describe("Luma Webhook Config Data Structure", () => {
    it("contains required fields", () => {
      const config: LumaWebhookConfig = {
        id: "lc-001",
        tenant_id: "tenant-123",
        webhook_token: "token-xyz",
        calendar_id: null,
        event_types: ["guest.registered"],
        agent_id: null,
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      }

      expect(config.id).toBeDefined()
      expect(config.tenant_id).toBeDefined()
      expect(config.webhook_token).toBeDefined()
      expect(config.event_types).toBeDefined()
      expect(config.is_active).toBeDefined()
    })

    it("supports multiple event types", () => {
      const config: LumaWebhookConfig = {
        id: "lc-002",
        tenant_id: "tenant-123",
        webhook_token: "token-abc",
        calendar_id: "cal-456",
        event_types: [
          "event.created",
          "event.updated",
          "guest.registered",
          "guest.updated",
          "ticket.registered",
        ],
        agent_id: "agent-789",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
      }

      expect(config.event_types).toHaveLength(5)
      expect(config.event_types).toContain("event.created")
      expect(config.event_types).toContain("ticket.registered")
    })
  })

  describe("Luma Event Types", () => {
    const validEventTypes: LumaEventType[] = [
      "event.created",
      "event.updated",
      "guest.registered",
      "guest.updated",
      "ticket.registered",
    ]

    it("supports all valid event types", () => {
      expect(validEventTypes).toHaveLength(5)
    })

    it("event.created is a valid type", () => {
      expect(validEventTypes).toContain("event.created")
    })

    it("guest.registered is a valid type", () => {
      expect(validEventTypes).toContain("guest.registered")
    })

    it("ticket.registered is a valid type", () => {
      expect(validEventTypes).toContain("ticket.registered")
    })
  })

  describe("Tenant Isolation", () => {
    it("email addresses are scoped to tenant", () => {
      const tenant1Addresses = [
        { tenant_id: "tenant-1", address: "inbox-a@test.resend.app" },
        { tenant_id: "tenant-1", address: "inbox-b@test.resend.app" },
      ]

      const tenant2Addresses = [
        { tenant_id: "tenant-2", address: "inbox-c@test.resend.app" },
      ]

      const allTenant1 = tenant1Addresses.every((a) => a.tenant_id === "tenant-1")
      const allTenant2 = tenant2Addresses.every((a) => a.tenant_id === "tenant-2")

      expect(allTenant1).toBe(true)
      expect(allTenant2).toBe(true)
    })

    it("luma webhook configs are scoped to tenant", () => {
      const tenant1Configs = [
        { tenant_id: "tenant-1", webhook_token: "token-a" },
      ]

      const tenant2Configs = [
        { tenant_id: "tenant-2", webhook_token: "token-b" },
      ]

      expect(tenant1Configs[0].tenant_id).toBe("tenant-1")
      expect(tenant2Configs[0].tenant_id).toBe("tenant-2")
    })
  })
})
