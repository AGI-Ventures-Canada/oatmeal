import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"

const mockFetch = mock(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({ id: "c-new" }),
  })
)

globalThis.fetch = mockFetch as unknown as typeof fetch

const { CriteriaConfig } = await import(
  "@/components/hackathon/judging/criteria-config"
)

describe("CriteriaConfig", () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ id: "c-new" }),
      })
    )
  })

  afterEach(() => {
    cleanup()
  })

  it("shows running weight totals for binary judging", () => {
    render(
      <CriteriaConfig
        hackathonId="h1"
        initialCriteria={[
          {
            id: "c1",
            name: "Innovation",
            description: null,
            weight: 0.3,
            displayOrder: 0,
            createdAt: "2026-03-01T00:00:00Z",
          },
          {
            id: "c2",
            name: "Execution",
            description: null,
            weight: 0.4,
            displayOrder: 1,
            createdAt: "2026-03-01T00:00:00Z",
          },
        ]}
      />
    )

    expect(screen.getByText("Weight total")).toBeDefined()
    expect(screen.getByText("70%")).toBeDefined()
    expect(screen.getByText("30% remaining")).toBeDefined()
    expect(screen.queryByText("Max Score")).toBeNull()
  })

  it("blocks binary criteria saves when weights exceed 100%", async () => {
    render(
      <CriteriaConfig
        hackathonId="h1"
        initialCriteria={[
          {
            id: "c1",
            name: "Innovation",
            description: null,
            weight: 0.7,
            displayOrder: 0,
            createdAt: "2026-03-01T00:00:00Z",
          },
        ]}
      />
    )

    fireEvent.click(screen.getByText("Add Criterion"))
    const dialog = await screen.findByRole("dialog")

    fireEvent.change(within(dialog).getByLabelText("Name"), {
      target: { value: "Polish" },
    })
    fireEvent.change(within(dialog).getByLabelText("Weight (%)"), {
      target: { value: "40" },
    })
    const form = dialog.querySelector("form")
    expect(form).not.toBeNull()
    fireEvent.submit(form as HTMLFormElement)

    await waitFor(() => {
      expect(within(dialog).getByText("Weights cannot exceed 100%")).toBeDefined()
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
