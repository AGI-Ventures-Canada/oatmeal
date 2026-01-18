import { describe, expect, it } from "bun:test"
import { isStepEventChunk } from "@/lib/workflows/agents/stream-types"
import type {
  StreamLogEntry,
  StepStreamEvent,
  StepEventChunk,
} from "@/lib/workflows/agents/stream-types"

describe("stream-types", () => {
  describe("StreamLogEntry", () => {
    it("type should allow valid log entries", () => {
      const log: StreamLogEntry = {
        timestamp: "2026-01-18T12:00:00Z",
        level: "info",
        context: "tool",
        message: "Test message",
      }

      expect(log.timestamp).toBe("2026-01-18T12:00:00Z")
      expect(log.level).toBe("info")
      expect(log.context).toBe("tool")
      expect(log.message).toBe("Test message")
    })

    it("type should allow optional data field", () => {
      const log: StreamLogEntry = {
        timestamp: "2026-01-18T12:00:00Z",
        level: "info",
        context: "tool",
        message: "Test message",
        data: { key: "value" },
      }

      expect(log.data).toEqual({ key: "value" })
    })
  })

  describe("isStepEventChunk", () => {
    it("returns true for valid step event chunk", () => {
      const chunk: StepEventChunk = {
        type: "step",
        stepEvent: {
          type: "step.started",
          timestamp: "2026-01-18T12:00:00Z",
          runId: "run-123",
          data: {
            stepNumber: 1,
            stepType: "tool_call",
            name: "test_tool",
          },
        },
      }

      expect(isStepEventChunk(chunk)).toBe(true)
    })

    it("returns false for null", () => {
      expect(isStepEventChunk(null)).toBe(false)
    })

    it("returns false for undefined", () => {
      expect(isStepEventChunk(undefined)).toBe(false)
    })

    it("returns false for non-object", () => {
      expect(isStepEventChunk("string")).toBe(false)
      expect(isStepEventChunk(123)).toBe(false)
    })

    it("returns false for object without type", () => {
      expect(isStepEventChunk({ stepEvent: {} })).toBe(false)
    })

    it("returns false for object with wrong type", () => {
      expect(isStepEventChunk({ type: "other", stepEvent: {} })).toBe(false)
    })

    it("returns false for object without stepEvent", () => {
      expect(isStepEventChunk({ type: "step" })).toBe(false)
    })
  })
})
