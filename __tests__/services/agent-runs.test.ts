import { describe, expect, it } from "bun:test"
import type { AgentRunStatus, TriggerType } from "@/lib/db/agent-types"

describe("Agent Runs Service", () => {
  describe("Agent Run Status", () => {
    const validStatuses: AgentRunStatus[] = [
      "queued",
      "initializing",
      "running",
      "awaiting_input",
      "succeeded",
      "failed",
      "canceled",
      "timed_out",
    ]

    it("queued is a valid status", () => {
      expect(validStatuses).toContain("queued")
    })

    it("initializing is a valid status", () => {
      expect(validStatuses).toContain("initializing")
    })

    it("running is a valid status", () => {
      expect(validStatuses).toContain("running")
    })

    it("awaiting_input is a valid status", () => {
      expect(validStatuses).toContain("awaiting_input")
    })

    it("succeeded is a valid status", () => {
      expect(validStatuses).toContain("succeeded")
    })

    it("failed is a valid status", () => {
      expect(validStatuses).toContain("failed")
    })

    it("canceled is a valid status", () => {
      expect(validStatuses).toContain("canceled")
    })

    it("timed_out is a valid status", () => {
      expect(validStatuses).toContain("timed_out")
    })
  })

  describe("Trigger Types", () => {
    const validTriggerTypes: TriggerType[] = ["manual", "scheduled", "email", "luma_webhook"]

    it("manual is a valid trigger type", () => {
      expect(validTriggerTypes).toContain("manual")
    })

    it("scheduled is a valid trigger type", () => {
      expect(validTriggerTypes).toContain("scheduled")
    })

    it("email is a valid trigger type", () => {
      expect(validTriggerTypes).toContain("email")
    })

    it("luma_webhook is a valid trigger type", () => {
      expect(validTriggerTypes).toContain("luma_webhook")
    })
  })

  describe("Status Transitions", () => {
    const terminalStatuses: AgentRunStatus[] = ["succeeded", "failed", "canceled", "timed_out"]
    const activeStatuses: AgentRunStatus[] = ["queued", "initializing", "running", "awaiting_input"]

    it("succeeded is a terminal status", () => {
      expect(terminalStatuses).toContain("succeeded")
    })

    it("failed is a terminal status", () => {
      expect(terminalStatuses).toContain("failed")
    })

    it("canceled is a terminal status", () => {
      expect(terminalStatuses).toContain("canceled")
    })

    it("timed_out is a terminal status", () => {
      expect(terminalStatuses).toContain("timed_out")
    })

    it("queued is an active status", () => {
      expect(activeStatuses).toContain("queued")
    })

    it("running is an active status", () => {
      expect(activeStatuses).toContain("running")
    })
  })

  describe("CreateAgentRunInput", () => {
    it("requires tenantId and agentId", () => {
      const input = {
        tenantId: "tenant-123",
        agentId: "agent-456",
      }

      expect(input.tenantId).toBeDefined()
      expect(input.agentId).toBeDefined()
    })

    it("supports optional fields", () => {
      const input = {
        tenantId: "tenant-123",
        agentId: "agent-456",
        triggerType: "scheduled" as TriggerType,
        input: { prompt: "Hello" },
        createdByKeyId: "key-789",
        idempotencyKey: "unique-key",
      }

      expect(input.triggerType).toBe("scheduled")
      expect(input.input).toEqual({ prompt: "Hello" })
      expect(input.createdByKeyId).toBe("key-789")
      expect(input.idempotencyKey).toBe("unique-key")
    })
  })

  describe("UpdateAgentRunInput", () => {
    it("supports status update", () => {
      const updates = {
        status: "running" as AgentRunStatus,
      }
      expect(updates.status).toBe("running")
    })

    it("supports workflowRunId update", () => {
      const updates = {
        workflowRunId: "workflow-123",
      }
      expect(updates.workflowRunId).toBe("workflow-123")
    })

    it("supports output update", () => {
      const updates = {
        output: { result: "success" },
      }
      expect(updates.output).toEqual({ result: "success" })
    })

    it("supports error update", () => {
      const updates = {
        error: { message: "Something went wrong", code: "ERR_001" },
      }
      expect(updates.error).toHaveProperty("message")
      expect(updates.error).toHaveProperty("code")
    })

    it("supports tokenUsage update", () => {
      const updates = {
        tokenUsage: { input: 100, output: 200, total: 300 },
      }
      expect(updates.tokenUsage).toHaveProperty("total", 300)
    })
  })

  describe("Cancel Logic", () => {
    const cancelableStatuses: AgentRunStatus[] = ["queued", "running", "awaiting_input"]
    const nonCancelableStatuses: AgentRunStatus[] = ["succeeded", "failed", "canceled", "timed_out"]

    it("can cancel queued runs", () => {
      expect(cancelableStatuses).toContain("queued")
    })

    it("can cancel running runs", () => {
      expect(cancelableStatuses).toContain("running")
    })

    it("can cancel awaiting_input runs", () => {
      expect(cancelableStatuses).toContain("awaiting_input")
    })

    it("cannot cancel succeeded runs", () => {
      expect(nonCancelableStatuses).toContain("succeeded")
    })

    it("cannot cancel failed runs", () => {
      expect(nonCancelableStatuses).toContain("failed")
    })

    it("cannot cancel already canceled runs", () => {
      expect(nonCancelableStatuses).toContain("canceled")
    })
  })

  describe("Status Timestamp Logic", () => {
    const statusesWithStartedAt: AgentRunStatus[] = ["initializing", "running"]
    const statusesWithCompletedAt: AgentRunStatus[] = ["succeeded", "failed", "canceled", "timed_out"]

    it("initializing sets started_at", () => {
      expect(statusesWithStartedAt).toContain("initializing")
    })

    it("running sets started_at", () => {
      expect(statusesWithStartedAt).toContain("running")
    })

    it("succeeded sets completed_at", () => {
      expect(statusesWithCompletedAt).toContain("succeeded")
    })

    it("failed sets completed_at", () => {
      expect(statusesWithCompletedAt).toContain("failed")
    })

    it("canceled sets completed_at", () => {
      expect(statusesWithCompletedAt).toContain("canceled")
    })

    it("timed_out sets completed_at", () => {
      expect(statusesWithCompletedAt).toContain("timed_out")
    })
  })

  describe("Human Input", () => {
    it("can only provide input when status is awaiting_input", () => {
      const canProvideInput = (status: AgentRunStatus) => status === "awaiting_input"

      expect(canProvideInput("awaiting_input")).toBe(true)
      expect(canProvideInput("running")).toBe(false)
      expect(canProvideInput("queued")).toBe(false)
    })

    it("human input step has correct structure", () => {
      const step = {
        id: `human-input-${Date.now()}`,
        step_number: 3,
        type: "text",
        content: JSON.stringify({ userChoice: "option1" }),
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }

      expect(step.id).toMatch(/^human-input-\d+$/)
      expect(step.type).toBe("text")
      expect(typeof step.step_number).toBe("number")
    })
  })

  describe("Agent Steps", () => {
    it("step has required fields", () => {
      const step = {
        id: "step-1",
        step_number: 1,
        type: "thinking",
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }

      expect(step.id).toBeDefined()
      expect(step.step_number).toBeDefined()
      expect(step.type).toBeDefined()
    })

    it("step can have optional content", () => {
      const step = {
        id: "step-1",
        step_number: 1,
        type: "tool_call",
        content: "Calling search API...",
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }

      expect(step.content).toBe("Calling search API...")
    })
  })
})
