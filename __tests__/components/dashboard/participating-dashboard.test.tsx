import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { render, screen, cleanup } from "@testing-library/react"
import { resetComponentMocks } from "../../lib/component-mocks"

const { ParticipatingDashboard } = await import(
  "@/app/(dashboard)/home/participating/participating-dashboard"
)

beforeEach(() => {
  resetComponentMocks()
})

afterEach(() => {
  cleanup()
})

const makeHackathon = (overrides: Record<string, unknown> = {}) => ({
  id: "h1",
  slug: "test-hack",
  name: "Test Hackathon",
  description: "A test event",
  status: "active" as const,
  registration_opens_at: null,
  registration_closes_at: null,
  starts_at: new Date(Date.now() - 86400000).toISOString(),
  ends_at: new Date(Date.now() + 86400000).toISOString(),
  role: "participant",
  ...overrides,
})

describe("ParticipatingDashboard", () => {
  it("renders empty state when no hackathons", () => {
    render(<ParticipatingDashboard hackathons={[]} submittedHackathonIds={[]} />)
    expect(screen.getByText("No hackathons yet")).toBeDefined()
    expect(screen.getByText("Browse hackathons")).toBeDefined()
  })

  it("renders stat cards", () => {
    const hackathons = [
      makeHackathon({ id: "h1" }),
      makeHackathon({ id: "h2", slug: "h2", name: "Hack 2", status: "completed", ends_at: new Date(Date.now() - 86400000).toISOString() }),
    ]

    render(<ParticipatingDashboard hackathons={hackathons} submittedHackathonIds={["h1"]} />)

    expect(screen.getByText("Events joined")).toBeDefined()
    expect(screen.getByText("Submissions")).toBeDefined()
    expect(screen.getByText("Active now")).toBeDefined()
    expect(screen.getByText("Completed")).toBeDefined()
  })

  it("shows submitted badge for submitted hackathons", () => {
    render(
      <ParticipatingDashboard
        hackathons={[makeHackathon()]}
        submittedHackathonIds={["h1"]}
      />,
    )
    expect(screen.getByText("Submitted")).toBeDefined()
  })

  it("shows role badge", () => {
    render(
      <ParticipatingDashboard
        hackathons={[makeHackathon({ role: "mentor" })]}
        submittedHackathonIds={[]}
      />,
    )
    expect(screen.getByText("mentor")).toBeDefined()
  })

  it("separates active and past events", () => {
    const hackathons = [
      makeHackathon({ id: "h1", name: "Active Event" }),
      makeHackathon({
        id: "h2",
        slug: "past",
        name: "Past Event",
        status: "completed",
        ends_at: new Date(Date.now() - 86400000).toISOString(),
      }),
    ]

    render(<ParticipatingDashboard hackathons={hackathons} submittedHackathonIds={[]} />)
    expect(screen.getByText("Active & upcoming")).toBeDefined()
    expect(screen.getByText("Past events")).toBeDefined()
  })

  it("renders page header", () => {
    render(<ParticipatingDashboard hackathons={[makeHackathon()]} submittedHackathonIds={[]} />)
    expect(screen.getByText("Participating")).toBeDefined()
    expect(screen.getByText("Your hackathon journey")).toBeDefined()
  })
})
