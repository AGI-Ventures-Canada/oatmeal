import { afterEach, describe, expect, it } from "bun:test"
import { cleanup, render } from "@testing-library/react"
import { LogEntry } from "@/components/dashboard/run-detail/log-entry"
import type { StreamLogEntry } from "@/lib/workflows/agents/stream-types"

describe("LogEntry", () => {
  afterEach(cleanup)
  const baseLog: StreamLogEntry = {
    timestamp: "2026-01-18T12:00:00Z",
    level: "info",
    context: "tool",
    message: "Test message",
  }

  it("renders log entry with timestamp, context, and message", () => {
    const { getByText } = render(<LogEntry log={baseLog} />)

    expect(getByText("tool")).toBeTruthy()
    expect(getByText("Test message")).toBeTruthy()
  })

  it("renders error level with destructive styling", () => {
    const errorLog: StreamLogEntry = {
      ...baseLog,
      level: "error",
      context: "error",
      message: "Error occurred",
    }

    const { getByText } = render(<LogEntry log={errorLog} />)
    const messageEl = getByText("Error occurred")

    expect(messageEl.className).toContain("text-destructive")
  })

  it("renders expandable data when log has object data", () => {
    const logWithData: StreamLogEntry = {
      ...baseLog,
      data: { key: "value" },
    }

    const { container } = render(<LogEntry log={logWithData} />)
    const trigger = container.querySelector("[data-slot='collapsible-trigger']")

    expect(trigger).toBeTruthy()
  })

  it("renders different context badges", () => {
    const contexts = ["tool", "agent", "system", "result", "error"]

    for (const context of contexts) {
      const log: StreamLogEntry = { ...baseLog, context }
      const { getByText } = render(<LogEntry log={log} />)
      expect(getByText(context)).toBeTruthy()
    }
  })

  it("formats timestamp correctly", () => {
    const { container } = render(<LogEntry log={baseLog} />)
    const timestampEl = container.querySelector(".text-muted-foreground")

    expect(timestampEl?.textContent).toMatch(/\d{2}:\d{2}:\d{2}/)
  })
})
