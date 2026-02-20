import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test"
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react"

const mockPush = mock(() => {})
const mockRefresh = mock(() => {})

mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    replace: mock(() => {}),
    prefetch: mock(() => {}),
  }),
}))

const { LifecycleStepper } = await import(
  "@/components/hackathon/lifecycle-stepper"
)

const baseProps = {
  hackathonId: "h1",
  hackathonSlug: "test-hack",
  status: "draft" as const,
  startsAt: "2026-03-01T00:00:00Z",
  endsAt: "2026-03-03T00:00:00Z",
  registrationOpensAt: "2026-02-15T00:00:00Z",
  registrationClosesAt: "2026-03-01T00:00:00Z",
}

function findCtaButton() {
  return screen.getAllByRole("button").find(
    (btn) => btn.getAttribute("data-slot") === "button" && btn.textContent?.includes("Go Live")
  )!
}

describe("LifecycleStepper", () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockRefresh.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it("renders 'Go Live' phase label instead of 'Published'", () => {
    render(<LifecycleStepper {...baseProps} />)
    const goLiveElements = screen.getAllByText("Go Live")
    expect(goLiveElements.length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText("Published")).toBeNull()
  })

  it("renders all four phase labels", () => {
    render(<LifecycleStepper {...baseProps} />)
    expect(screen.getByText("Draft")).toBeDefined()
    expect(screen.getAllByText("Go Live").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("Judging")).toBeDefined()
    expect(screen.getByText("Completed")).toBeDefined()
  })

  it("renders 'Go Live' CTA button in draft phase", () => {
    render(<LifecycleStepper {...baseProps} />)
    expect(findCtaButton()).toBeDefined()
  })

  it("renders 'Take Offline' button in published phase", () => {
    render(<LifecycleStepper {...baseProps} status="published" />)
    expect(screen.getByText("Take Offline")).toBeDefined()
  })

  it("shows judges node with 'Assign Judges' when no judges", () => {
    render(
      <LifecycleStepper
        {...baseProps}
        judgingSetupStatus={{ judgeCount: 0, hasUnassignedSubmissions: false }}
      />
    )
    expect(screen.getByText("Assign Judges")).toBeDefined()
  })

  it("shows judges node with singular count when 1 judge", () => {
    render(
      <LifecycleStepper
        {...baseProps}
        status="published"
        judgingSetupStatus={{ judgeCount: 1, hasUnassignedSubmissions: true }}
      />
    )
    expect(screen.getByText("1 judge")).toBeDefined()
  })

  it("shows judges node with plural count when multiple judges", () => {
    render(
      <LifecycleStepper
        {...baseProps}
        status="published"
        judgingSetupStatus={{ judgeCount: 5, hasUnassignedSubmissions: true }}
      />
    )
    expect(screen.getByText("5 judges")).toBeDefined()
  })

  it("shows go-live warnings when CTA clicked with missing description", () => {
    render(<LifecycleStepper {...baseProps} description={null} />)
    act(() => { fireEvent.click(findCtaButton()) })
    expect(screen.getByText("Before you go live")).toBeDefined()
    expect(screen.getByText("No description")).toBeDefined()
  })

  it("shows go-live warning for missing banner", () => {
    render(<LifecycleStepper {...baseProps} bannerUrl={null} />)
    act(() => { fireEvent.click(findCtaButton()) })
    expect(screen.getByText("No banner image")).toBeDefined()
  })

  it("shows go-live warning for missing location", () => {
    render(<LifecycleStepper {...baseProps} locationType={null} />)
    act(() => { fireEvent.click(findCtaButton()) })
    expect(screen.getByText("Location not set")).toBeDefined()
  })

  it("shows go-live warning for missing sponsors", () => {
    render(<LifecycleStepper {...baseProps} sponsorCount={0} />)
    act(() => { fireEvent.click(findCtaButton()) })
    expect(screen.getByText("No sponsors")).toBeDefined()
  })

  it("shows timeline dates required warning when dates missing", () => {
    render(
      <LifecycleStepper
        {...baseProps}
        startsAt={null}
        endsAt={null}
        registrationOpensAt={null}
        registrationClosesAt={null}
      />
    )
    act(() => { fireEvent.click(findCtaButton()) })
    expect(screen.getByText("Timeline dates required")).toBeDefined()
  })

  it("does not show CTA between Go Live and Judging when published with no judges", () => {
    render(
      <LifecycleStepper
        {...baseProps}
        status="published"
        judgingSetupStatus={{ judgeCount: 0, hasUnassignedSubmissions: false }}
      />
    )
    expect(screen.queryByText("Assign Submissions")).toBeNull()
    expect(screen.queryByText("Close Submissions")).toBeNull()
  })

  it("shows 'Assign Submissions' CTA when published with judges and unassigned submissions", () => {
    render(
      <LifecycleStepper
        {...baseProps}
        status="published"
        judgingSetupStatus={{ judgeCount: 3, hasUnassignedSubmissions: true }}
      />
    )
    expect(screen.getByText("Assign Submissions")).toBeDefined()
  })

  it("shows 'Close Submissions' CTA when published with all submissions assigned", () => {
    render(
      <LifecycleStepper
        {...baseProps}
        status="published"
        judgingSetupStatus={{ judgeCount: 3, hasUnassignedSubmissions: false }}
      />
    )
    expect(screen.getByText("Close Submissions")).toBeDefined()
  })

  it("renders 'Complete Event' CTA in judging phase", () => {
    render(<LifecycleStepper {...baseProps} status="judging" />)
    expect(screen.getByText("Complete Event")).toBeDefined()
  })

  it("judges node navigates to judging page on click", () => {
    render(<LifecycleStepper {...baseProps} />)
    const judgesNode = screen.getByText("Assign Judges").closest("button")
    fireEvent.click(judgesNode!)
    expect(mockPush).toHaveBeenCalledWith("/e/test-hack/manage/judging")
  })
})
