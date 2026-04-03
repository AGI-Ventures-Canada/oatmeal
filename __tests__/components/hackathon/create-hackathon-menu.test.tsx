import { describe, it, expect, mock, afterEach, beforeEach } from "bun:test"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { resetComponentMocks, setRouter, useRealCreateHackathonMenu } from "../../lib/component-mocks"

const mockPush = mock(() => {})

const { CreateHackathonMenu } = await import(
  "@/components/hackathon/create-hackathon-menu"
)

beforeEach(() => {
  resetComponentMocks()
  useRealCreateHackathonMenu()
  mockPush.mockClear()
  setRouter({ push: mockPush })
})

afterEach(() => {
  cleanup()
})

describe("CreateHackathonMenu", () => {
  function renderMenu() {
    return render(
      <CreateHackathonMenu trigger={<button data-testid="trigger">Create</button>} />
    )
  }

  it("navigates to /create when trigger is clicked", () => {
    renderMenu()
    fireEvent.click(screen.getByTestId("trigger"))
    expect(mockPush).toHaveBeenCalledWith("/create")
  })

  it("preserves the original trigger onClick handler", () => {
    const originalOnClick = mock(() => {})
    render(
      <CreateHackathonMenu
        trigger={<button data-testid="trigger" onClick={originalOnClick}>Create</button>}
      />
    )
    fireEvent.click(screen.getByTestId("trigger"))
    expect(originalOnClick).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith("/create")
  })

  it("renders the trigger content", () => {
    renderMenu()
    expect(screen.getByText("Create")).toBeDefined()
  })
})
