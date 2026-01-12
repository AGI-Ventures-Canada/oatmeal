import { describe, expect, it, afterEach } from "bun:test"
import { render, screen, cleanup } from "@testing-library/react"
import { JobList } from "@/components/dashboard/job-list"
import type { JobListItem } from "@/lib/types/dashboard"

afterEach(() => {
  cleanup()
})

const mockJobs: JobListItem[] = [
  {
    id: "job-12345678-abcd",
    type: "analyze-document",
    status: "succeeded",
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-01T10:05:00Z",
    completedAt: "2024-01-01T10:05:00Z",
  },
  {
    id: "job-87654321-dcba",
    type: "process-data",
    status: "running",
    createdAt: "2024-01-01T11:00:00Z",
    updatedAt: "2024-01-01T11:01:00Z",
    completedAt: null,
  },
]

describe("JobList", () => {
  it("renders empty state when no jobs", () => {
    render(<JobList jobs={[]} />)
    expect(screen.getByText("No jobs yet. Submit a job via the API to get started.")).toBeDefined()
  })

  it("renders table headers", () => {
    render(<JobList jobs={mockJobs} />)
    expect(screen.getByText("ID")).toBeDefined()
    expect(screen.getByText("Type")).toBeDefined()
    expect(screen.getByText("Status")).toBeDefined()
    expect(screen.getByText("Created")).toBeDefined()
    expect(screen.getByText("Completed")).toBeDefined()
  })

  it("renders job data", () => {
    render(<JobList jobs={mockJobs} />)
    expect(screen.getByText("job-1234...")).toBeDefined()
    expect(screen.getByText("analyze-document")).toBeDefined()
    expect(screen.getByText("Succeeded")).toBeDefined()
  })

  it("renders running job", () => {
    render(<JobList jobs={mockJobs} />)
    expect(screen.getByText("job-8765...")).toBeDefined()
    expect(screen.getByText("process-data")).toBeDefined()
    const runningBadges = screen.getAllByText("Running")
    expect(runningBadges.length).toBeGreaterThan(0)
  })

  it("renders dash for incomplete jobs", () => {
    render(<JobList jobs={mockJobs} />)
    const dashes = screen.getAllByText("-")
    expect(dashes.length).toBeGreaterThanOrEqual(1)
  })

  it("renders job links", () => {
    render(<JobList jobs={mockJobs} />)
    const links = screen.getAllByRole("link")
    expect(links.length).toBe(2)
    expect(links[0].getAttribute("href")).toBe("/jobs/job-12345678-abcd")
    expect(links[1].getAttribute("href")).toBe("/jobs/job-87654321-dcba")
  })
})
