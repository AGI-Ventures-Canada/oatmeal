import React from "react"
import { describe, it, expect, afterEach } from "bun:test"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"

afterEach(cleanup)

const regularItem = {
  id: "item-1",
  title: "Opening Kickoff",
  starts_at: "2026-04-10T09:00:00Z",
  ends_at: "2026-04-10T09:30:00Z",
  location: "Main Hall",
  sort_order: 0,
  trigger_type: null,
}

const challengeReleaseItem = {
  id: "item-2",
  title: "Challenge Release",
  starts_at: "2026-04-10T09:30:00Z",
  ends_at: null,
  location: null,
  sort_order: 1,
  trigger_type: "challenge_release" as const,
}

const submissionDeadlineItem = {
  id: "item-3",
  title: "Submissions Close",
  starts_at: "2026-04-12T17:00:00Z",
  ends_at: null,
  location: null,
  sort_order: 2,
  trigger_type: "submission_deadline" as const,
}

const allItems = [regularItem, challengeReleaseItem, submissionDeadlineItem]

const { OverviewSchedule } = await import(
  "@/components/hackathon/overview-schedule"
)

const defaultProps = {
  hackathonId: "hack-1",
  scheduleItems: allItems,
  challengeReleasedAt: null as string | null,
  challengeExists: true,
}

describe("OverviewSchedule (interactive agenda)", () => {
  it("renders all schedule items when challenge exists", () => {
    render(<OverviewSchedule {...defaultProps} />)
    expect(screen.getByText("Opening Kickoff")).toBeDefined()
    expect(screen.getByText("Challenge Release")).toBeDefined()
    expect(screen.getByText("Submissions Close")).toBeDefined()
  })

  it("hides challenge_release item when no challenge exists", () => {
    render(<OverviewSchedule {...defaultProps} challengeExists={false} />)
    expect(screen.getByText("Opening Kickoff")).toBeDefined()
    expect(screen.queryByText("Challenge Release")).toBeNull()
    expect(screen.getByText("Submissions Close")).toBeDefined()
  })

  it("renders the Agenda header with Add Item button", () => {
    render(<OverviewSchedule {...defaultProps} />)
    expect(screen.getByText("Agenda")).toBeDefined()
    expect(screen.getByText("Add Item")).toBeDefined()
  })

  it("renders location for items that have one", () => {
    render(<OverviewSchedule {...defaultProps} />)
    expect(screen.getByText("Main Hall")).toBeDefined()
  })

  it("shows Scheduled badge for unreleased challenge when challenge exists", () => {
    render(<OverviewSchedule {...defaultProps} challengeReleasedAt={null} />)
    const badges = screen.getAllByText("Scheduled")
    expect(badges.length).toBeGreaterThanOrEqual(1)
  })

  it("shows Released badge when challenge has been released", () => {
    render(
      <OverviewSchedule
        {...defaultProps}
        challengeReleasedAt="2026-04-10T09:30:00Z"
      />
    )
    expect(screen.getByText("Released")).toBeDefined()
  })

  it("does not show Release Now or Create Challenge buttons on timeline", () => {
    render(<OverviewSchedule {...defaultProps} challengeExists={true} challengeReleasedAt={null} />)
    expect(screen.queryByText("Release Now")).toBeNull()
    expect(screen.queryByText("Create Challenge")).toBeNull()
  })

  it("shows empty state when no items", () => {
    render(
      <OverviewSchedule {...defaultProps} scheduleItems={[]} />
    )
    expect(
      screen.getByText("Set event dates to generate your agenda")
    ).toBeDefined()
  })

  it("opens edit dialog when clicking an item row", () => {
    render(<OverviewSchedule {...defaultProps} />)
    const kickoffRow = screen.getByText("Opening Kickoff").closest("[role=button]")
    if (kickoffRow) fireEvent.click(kickoffRow)
    expect(screen.getByText("Edit agenda item")).toBeDefined()
  })

  it("opens create dialog when clicking Add Item", () => {
    render(<OverviewSchedule {...defaultProps} />)
    fireEvent.click(screen.getByText("Add Item"))
    expect(screen.getByText("Add agenda item")).toBeDefined()
  })

  it("shows delete confirmation for regular items", () => {
    render(<OverviewSchedule {...defaultProps} />)
    const deleteButtons = screen.getAllByText("Delete agenda item?")
    expect(deleteButtons.length).toBeGreaterThan(0)
  })

  it("does not show delete for trigger items", () => {
    render(
      <OverviewSchedule
        {...defaultProps}
        scheduleItems={[challengeReleaseItem]}
      />
    )
    expect(screen.queryByText("Delete agenda item?")).toBeNull()
  })
})
