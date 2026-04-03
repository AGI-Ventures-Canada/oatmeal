import React from "react"
import { describe, expect, it, beforeEach, afterEach, mock } from "bun:test"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import { resetComponentMocks } from "../../lib/component-mocks"

mock.module("@/components/hackathon/preview/edit-context", () => ({
  useEdit: () => ({ activeSection: null, isEditable: false, editMode: false, setEditMode: () => {}, openSection: () => {}, closeDrawer: () => {} }),
  useEditOptional: () => null,
  EditProvider: ({ children }: { children: React.ReactNode }) => children,
  SECTION_ORDER: ["name", "dates", "location", "sponsors", "judges", "prizes", "timeline", "about", "rules"],
}))

const mockFetch = mock(() =>
  Promise.resolve(new Response(JSON.stringify({ id: "assign-1" }), { status: 200 }))
)
globalThis.fetch = mockFetch

const { PrizesManager } = await import("@/components/hackathon/prizes/prizes-manager")

const basePrizes = [
  { id: "p1", name: "Grand Prize", description: "Top award", value: "$5,000", displayOrder: 0, createdAt: "2026-01-01T00:00:00Z" },
  { id: "p2", name: "Runner Up", description: null, value: "$1,000", displayOrder: 1, createdAt: "2026-01-01T00:00:00Z" },
]

const baseSubmissions = [
  { id: "s1", title: "Team Alpha Project" },
  { id: "s2", title: "Team Beta Project" },
]

describe("PrizesManager", () => {
  beforeEach(() => {
    resetComponentMocks()
    mockFetch.mockReset()
    mockFetch.mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ id: "assign-1" }), { status: 200 }))
    )
  })

  afterEach(cleanup)

  it("renders prizes with names and values", () => {
    render(
      <PrizesManager
        hackathonId="h1"
        initialPrizes={basePrizes}
        initialAssignments={[]}
        submissions={baseSubmissions}
      />,
    )
    expect(screen.getByText("Grand Prize")).toBeTruthy()
    expect(screen.getByText("$5,000")).toBeTruthy()
    expect(screen.getByText("Runner Up")).toBeTruthy()
    expect(screen.getByText("$1,000")).toBeTruthy()
  })

  it("renders empty state when no prizes", () => {
    render(
      <PrizesManager
        hackathonId="h1"
        initialPrizes={[]}
        initialAssignments={[]}
        submissions={[]}
      />,
    )
    expect(screen.getByText(/no prizes defined yet/i)).toBeTruthy()
  })

  it("tracks submission selection per prize independently", async () => {
    render(
      <PrizesManager
        hackathonId="h1"
        initialPrizes={basePrizes}
        initialAssignments={[]}
        submissions={baseSubmissions}
      />,
    )

    const selects = screen.getAllByRole("combobox")
    expect(selects).toHaveLength(2)

    fireEvent.click(selects[0])
    const option1 = await screen.findByText("Team Alpha Project")
    fireEvent.click(option1)

    fireEvent.click(selects[1])
    const option2 = await screen.findByText("Team Beta Project")
    fireEvent.click(option2)

    const assignButtons = screen.getAllByRole("button", { name: /^Assign$/ })
    expect(assignButtons[0].hasAttribute("disabled")).toBe(false)
    expect(assignButtons[1].hasAttribute("disabled")).toBe(false)
  })

  it("assign button is disabled when no submission selected", () => {
    render(
      <PrizesManager
        hackathonId="h1"
        initialPrizes={basePrizes}
        initialAssignments={[]}
        submissions={baseSubmissions}
      />,
    )

    const assignButtons = screen.getAllByRole("button", { name: /^Assign$/ })
    expect(assignButtons[0].hasAttribute("disabled")).toBe(true)
    expect(assignButtons[1].hasAttribute("disabled")).toBe(true)
  })

  it("clears only the assigned prize's selection after assigning", async () => {
    render(
      <PrizesManager
        hackathonId="h1"
        initialPrizes={basePrizes}
        initialAssignments={[]}
        submissions={baseSubmissions}
      />,
    )

    const selects = screen.getAllByRole("combobox")

    fireEvent.click(selects[0])
    fireEvent.click(await screen.findByText("Team Alpha Project"))

    fireEvent.click(selects[1])
    fireEvent.click(await screen.findByText("Team Beta Project"))

    const assignButtons = screen.getAllByRole("button", { name: /^Assign$/ })
    fireEvent.click(assignButtons[0])

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/dashboard/hackathons/h1/prizes/p1/assign",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ submissionId: "s1" }),
        }),
      )
    })

    await waitFor(() => {
      const updatedAssignButtons = screen.getAllByRole("button", { name: /^Assign$/ })
      expect(updatedAssignButtons[0].hasAttribute("disabled")).toBe(true)
      expect(updatedAssignButtons[1].hasAttribute("disabled")).toBe(false)
    })
  })

  it("renders existing assignments", () => {
    render(
      <PrizesManager
        hackathonId="h1"
        initialPrizes={basePrizes}
        initialAssignments={[
          {
            id: "a1",
            prizeId: "p1",
            prizeName: "Grand Prize",
            submissionId: "s1",
            submissionTitle: "Team Alpha Project",
            teamName: "Alpha Team",
            assignedAt: "2026-01-02T00:00:00Z",
          },
        ]}
        submissions={baseSubmissions}
      />,
    )
    expect(screen.getByText("Team Alpha Project")).toBeTruthy()
    expect(screen.getByText(/Alpha Team/)).toBeTruthy()
  })
})
