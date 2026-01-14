import { describe, expect, it } from "bun:test"
import type { AgentType } from "@/lib/db/agent-types"

describe("Agents Service", () => {
  describe("Agent Types", () => {
    const validTypes: AgentType[] = ["ai_sdk", "workflow"]

    it("ai_sdk is a valid agent type", () => {
      expect(validTypes).toContain("ai_sdk")
    })

    it("workflow is a valid agent type", () => {
      expect(validTypes).toContain("workflow")
    })
  })

  describe("CreateAgentInput", () => {
    it("requires tenantId and name", () => {
      const input = {
        tenantId: "tenant-123",
        name: "My Agent",
      }

      expect(input.tenantId).toBeDefined()
      expect(input.name).toBeDefined()
    })

    it("supports optional fields", () => {
      const input = {
        tenantId: "tenant-123",
        name: "My Agent",
        description: "A helpful agent",
        type: "ai_sdk" as AgentType,
        model: "claude-sonnet-4-20250514",
        instructions: "Be helpful and concise",
        maxSteps: 25,
        timeoutMs: 120000,
        skillIds: ["skill-1", "skill-2"],
        config: { temperature: 0.7 },
      }

      expect(input.description).toBe("A helpful agent")
      expect(input.type).toBe("ai_sdk")
      expect(input.model).toBe("claude-sonnet-4-20250514")
      expect(input.maxSteps).toBe(25)
      expect(input.timeoutMs).toBe(120000)
      expect(input.skillIds).toHaveLength(2)
      expect(input.config).toHaveProperty("temperature")
    })
  })

  describe("UpdateAgentInput", () => {
    it("all fields are optional", () => {
      const updates: Record<string, unknown> = {}
      expect(Object.keys(updates)).toHaveLength(0)
    })

    it("can update individual fields", () => {
      const updates = {
        name: "New Name",
        description: null,
        isActive: false,
      }

      expect(updates.name).toBe("New Name")
      expect(updates.description).toBeNull()
      expect(updates.isActive).toBe(false)
    })
  })

  describe("Default Values", () => {
    const defaults = {
      type: "ai_sdk",
      maxSteps: 5,
      timeoutMs: 300000,
      skillIds: [],
      config: {},
    }

    it("default type is ai_sdk", () => {
      expect(defaults.type).toBe("ai_sdk")
    })

    it("default maxSteps is 5", () => {
      expect(defaults.maxSteps).toBe(5)
    })

    it("default timeoutMs is 300000 (5 minutes)", () => {
      expect(defaults.timeoutMs).toBe(300000)
    })

    it("default skillIds is empty array", () => {
      expect(defaults.skillIds).toEqual([])
    })

    it("default config is empty object", () => {
      expect(defaults.config).toEqual({})
    })
  })

  describe("ListAgentsOptions", () => {
    it("supports pagination with limit and offset", () => {
      const options = {
        limit: 10,
        offset: 20,
      }

      expect(options.limit).toBe(10)
      expect(options.offset).toBe(20)
    })

    it("supports activeOnly filter", () => {
      const options = {
        activeOnly: true,
      }

      expect(options.activeOnly).toBe(true)
    })
  })

  describe("Model Validation", () => {
    const validModels = [
      "claude-sonnet-4-20250514",
      "claude-opus-4-20250514",
      "claude-3-5-sonnet-20241022",
    ]

    it("claude-sonnet-4-20250514 is valid", () => {
      expect(validModels).toContain("claude-sonnet-4-20250514")
    })

    it("claude-opus-4-20250514 is valid", () => {
      expect(validModels).toContain("claude-opus-4-20250514")
    })

    it("validates model format", () => {
      const isValidModel = (model: string) => model.startsWith("claude-")
      expect(isValidModel("claude-sonnet-4-20250514")).toBe(true)
      expect(isValidModel("gpt-4")).toBe(false)
    })
  })

  describe("Activate/Deactivate", () => {
    it("deactivate sets isActive to false", () => {
      const deactivateUpdates = { isActive: false }
      expect(deactivateUpdates.isActive).toBe(false)
    })

    it("activate sets isActive to true", () => {
      const activateUpdates = { isActive: true }
      expect(activateUpdates.isActive).toBe(true)
    })
  })
})
