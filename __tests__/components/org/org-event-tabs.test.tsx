import { describe, expect, it, afterEach } from "bun:test"
import { render, screen, cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { OrgEventTabs } from "@/components/org/org-event-tabs"
import type { HackathonWithRole } from "@/components/org/hackathon-grid"

function makeHackathon(
  overrides: Partial<HackathonWithRole> & { status: HackathonWithRole["status"] }
): HackathonWithRole {
  return {
    id: crypto.randomUUID(),
    slug: "test",
    name: "Test Hackathon",
    description: null,
    banner_url: null,
    starts_at: "2026-06-01T00:00:00Z",
    ends_at: "2026-06-03T00:00:00Z",
    registration_opens_at: "2026-05-01T00:00:00Z",
    registration_closes_at: "2026-05-28T00:00:00Z",
    role: "organizer",
    ...overrides,
  }
}

const activeHackathon = makeHackathon({
  name: "Active Event",
  status: "registration_open",
})

const completedHackathon = makeHackathon({
  name: "Completed Event",
  status: "completed",
})

const archivedHackathon = makeHackathon({
  name: "Archived Event",
  status: "archived",
})

describe("OrgEventTabs", () => {
  afterEach(cleanup)

  it("shows count excluding completed events by default", () => {
    render(
      <OrgEventTabs
        allHackathons={[activeHackathon, completedHackathon]}
        organizedHackathons={[activeHackathon, completedHackathon]}
        sponsoredHackathons={[]}
        totalUniqueEvents={2}
      />
    )

    expect(screen.getByText("All (1)")).toBeDefined()
    expect(screen.getByText("Organizing (1)")).toBeDefined()
    expect(screen.getByText("Sponsoring (0)")).toBeDefined()
  })

  it("shows full count when show completed is toggled on", async () => {
    render(
      <OrgEventTabs
        allHackathons={[activeHackathon, completedHackathon]}
        organizedHackathons={[activeHackathon, completedHackathon]}
        sponsoredHackathons={[completedHackathon]}
        totalUniqueEvents={2}
      />
    )

    expect(screen.getByText("All (1)")).toBeDefined()

    const toggle = screen.getByRole("switch")
    await userEvent.click(toggle)

    expect(screen.getByText("All (2)")).toBeDefined()
    expect(screen.getByText("Organizing (2)")).toBeDefined()
    expect(screen.getByText("Sponsoring (1)")).toBeDefined()
  })

  it("excludes archived events from count by default", () => {
    render(
      <OrgEventTabs
        allHackathons={[activeHackathon, archivedHackathon]}
        organizedHackathons={[activeHackathon, archivedHackathon]}
        sponsoredHackathons={[]}
        totalUniqueEvents={2}
      />
    )

    expect(screen.getByText("All (1)")).toBeDefined()
    expect(screen.getByText("Organizing (1)")).toBeDefined()
  })

  it("shows all counts when no completed events exist", () => {
    render(
      <OrgEventTabs
        allHackathons={[activeHackathon]}
        organizedHackathons={[activeHackathon]}
        sponsoredHackathons={[]}
        totalUniqueEvents={1}
      />
    )

    expect(screen.getByText("All (1)")).toBeDefined()
    expect(screen.getByText("Organizing (1)")).toBeDefined()
  })

  it("hides show completed toggle when no completed events exist", () => {
    render(
      <OrgEventTabs
        allHackathons={[activeHackathon]}
        organizedHackathons={[activeHackathon]}
        sponsoredHackathons={[]}
        totalUniqueEvents={1}
      />
    )

    expect(screen.queryByRole("switch")).toBeNull()
  })

  it("shows show completed toggle when completed events exist", () => {
    render(
      <OrgEventTabs
        allHackathons={[activeHackathon, completedHackathon]}
        organizedHackathons={[activeHackathon, completedHackathon]}
        sponsoredHackathons={[]}
        totalUniqueEvents={2}
      />
    )

    expect(screen.getByRole("switch")).toBeDefined()
  })
})
