import React from "react"
import { describe, it, expect, afterEach } from "bun:test"
import { render, screen, cleanup } from "@testing-library/react"
import { AgendaItemRow } from "@/components/hackathon/agenda-item-row"

afterEach(cleanup)

const regularItem = {
  id: "item-1",
  title: "Opening Kickoff",
  starts_at: "2026-04-10T09:00:00Z",
  ends_at: "2026-04-10T09:30:00Z",
  location: "Main Hall",
  trigger_type: null,
}

const challengeItem = {
  id: "item-2",
  title: "Challenge Release",
  starts_at: "2026-04-10T09:00:00Z",
  ends_at: null,
  location: null,
  trigger_type: "challenge_release" as const,
}

describe("AgendaItemRow", () => {
  it("renders a regular item with title and time", () => {
    render(
      <AgendaItemRow
        item={regularItem}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )
    expect(screen.getByText("Opening Kickoff")).toBeDefined()
  })

  it("renders location when provided", () => {
    render(
      <AgendaItemRow
        item={regularItem}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )
    expect(screen.getByText("Main Hall")).toBeDefined()
  })

  it("renders trigger indicator for trigger items", () => {
    render(
      <AgendaItemRow
        item={challengeItem}
        status="scheduled"
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )
    expect(screen.getByText("Challenge Release")).toBeDefined()
    expect(screen.getByText("Scheduled")).toBeDefined()
  })

  it("renders custom actions for trigger items", () => {
    render(
      <AgendaItemRow
        item={challengeItem}
        status="scheduled"
        actions={<button>Release Now</button>}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )
    expect(screen.getByText("Release Now")).toBeDefined()
  })

  it("renders released status badge", () => {
    render(
      <AgendaItemRow
        item={challengeItem}
        status="released"
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )
    expect(screen.getByText("Released")).toBeDefined()
  })
})
