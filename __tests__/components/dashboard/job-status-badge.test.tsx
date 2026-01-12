import { describe, expect, it, afterEach } from "bun:test"
import { render, screen, cleanup } from "@testing-library/react"
import { JobStatusBadge } from "@/components/dashboard/job-status-badge"

afterEach(() => {
  cleanup()
})

describe("JobStatusBadge", () => {
  it("renders queued status", () => {
    render(<JobStatusBadge status="queued" />)
    expect(screen.getByText("Queued")).toBeDefined()
  })

  it("renders running status", () => {
    render(<JobStatusBadge status="running" />)
    expect(screen.getByText("Running")).toBeDefined()
  })

  it("renders succeeded status", () => {
    render(<JobStatusBadge status="succeeded" />)
    expect(screen.getByText("Succeeded")).toBeDefined()
  })

  it("renders failed status", () => {
    render(<JobStatusBadge status="failed" />)
    expect(screen.getByText("Failed")).toBeDefined()
  })

  it("renders canceled status", () => {
    render(<JobStatusBadge status="canceled" />)
    expect(screen.getByText("Canceled")).toBeDefined()
  })
})
