import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"

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

function findPhaseNode(label: string) {
  return screen.getAllByRole("button").find((b) => b.textContent === label)
}

describe("LifecycleStepper", () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockRefresh.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it("renders all four phase labels", () => {
    render(<LifecycleStepper {...baseProps} />)
    expect(screen.getByText("Draft")).toBeDefined()
    expect(screen.getByText("Go Live")).toBeDefined()
    expect(screen.getByText("Judging")).toBeDefined()
    expect(screen.getByText("Completed")).toBeDefined()
  })

  it("renders 'Go Live' phase label instead of 'Published'", () => {
    render(<LifecycleStepper {...baseProps} />)
    expect(screen.getByText("Go Live")).toBeDefined()
    expect(screen.queryByText("Published")).toBeNull()
  })

  it("does not render any CTA buttons on connectors", () => {
    render(<LifecycleStepper {...baseProps} />)
    expect(screen.queryByText("Take Offline")).toBeNull()
    expect(screen.queryByText("Close Submissions")).toBeNull()
    expect(screen.queryByText("Assign Submissions")).toBeNull()
    expect(screen.queryByText("Complete Event")).toBeNull()
  })

  it("does not render connector CTA buttons in published phase", () => {
    render(
      <LifecycleStepper
        {...baseProps}
        status="published"
        judgingSetupStatus={{ judgeCount: 3, hasUnassignedSubmissions: true }}
      />
    )
    expect(screen.queryByText("Take Offline")).toBeNull()
    expect(screen.queryByText("Assign Submissions")).toBeNull()
    expect(screen.queryByText("Close Submissions")).toBeNull()
  })

  it("does not render connector CTA buttons in judging phase", () => {
    render(<LifecycleStepper {...baseProps} status="judging" />)
    expect(screen.queryByText("Complete Event")).toBeNull()
  })

  describe("judges node", () => {
    it("shows 'Assign Judges' when no judges", () => {
      render(
        <LifecycleStepper
          {...baseProps}
          judgingSetupStatus={{ judgeCount: 0, hasUnassignedSubmissions: false }}
        />
      )
      expect(screen.getByText("Assign Judges")).toBeDefined()
    })

    it("shows singular count when 1 judge", () => {
      render(
        <LifecycleStepper
          {...baseProps}
          status="published"
          judgingSetupStatus={{ judgeCount: 1, hasUnassignedSubmissions: true }}
        />
      )
      expect(screen.getByText("1 judge")).toBeDefined()
    })

    it("shows plural count when multiple judges", () => {
      render(
        <LifecycleStepper
          {...baseProps}
          status="published"
          judgingSetupStatus={{ judgeCount: 5, hasUnassignedSubmissions: true }}
        />
      )
      expect(screen.getByText("5 judges")).toBeDefined()
    })

    it("navigates to judging page on click", () => {
      render(<LifecycleStepper {...baseProps} />)
      const judgesNode = screen.getByText("Assign Judges").closest("button")
      fireEvent.click(judgesNode!)
      expect(mockPush).toHaveBeenCalledWith("/e/test-hack/manage/judging")
    })
  })

  describe("node coloring", () => {
    it("uses primary color only on current node in draft phase", () => {
      render(<LifecycleStepper {...baseProps} />)
      const draftCircle = findPhaseNode("Draft")?.querySelector("div")
      expect(draftCircle?.className).toContain("bg-primary")
    })

    it("uses muted-foreground for past nodes in judging phase", () => {
      render(<LifecycleStepper {...baseProps} status="judging" />)
      const draftCircle = findPhaseNode("Draft")?.querySelector("div")
      expect(draftCircle?.className).toContain("bg-muted-foreground")
      expect(draftCircle?.className).not.toContain("bg-primary")
    })

    it("uses outline for future nodes", () => {
      render(<LifecycleStepper {...baseProps} />)
      const completedCircle = findPhaseNode("Completed")?.querySelector("div")
      expect(completedCircle?.className).toContain("border-muted-foreground/30")
    })

    it("uses muted-foreground for judges circle when past Draft", () => {
      render(<LifecycleStepper {...baseProps} status="published" />)
      const judgesBtn = screen.getByText("Assign Judges").closest("button")
      const circle = judgesBtn?.querySelector("div")
      expect(circle?.className).toContain("bg-muted-foreground")
    })

    it("uses outline for judges circle when in Draft", () => {
      render(<LifecycleStepper {...baseProps} />)
      const judgesBtn = screen.getByText("Assign Judges").closest("button")
      const circle = judgesBtn?.querySelector("div")
      expect(circle?.className).toContain("border-muted-foreground/30")
    })

    it("applies opacity-40 to distant (non-adjacent) future nodes", () => {
      render(<LifecycleStepper {...baseProps} />)
      expect(findPhaseNode("Completed")?.className).toContain("opacity-40")
    })

    it("does not apply opacity-40 to adjacent nodes", () => {
      render(<LifecycleStepper {...baseProps} />)
      expect(findPhaseNode("Go Live")?.className).not.toContain("opacity-40")
    })

    it("applies hover:bg-muted to adjacent nodes", () => {
      render(<LifecycleStepper {...baseProps} />)
      expect(findPhaseNode("Go Live")?.className).toContain("hover:bg-muted")
    })
  })

  describe("hover wrappers", () => {
    it("wraps adjacent forward node in HoverCard trigger (draft → Go Live)", () => {
      render(<LifecycleStepper {...baseProps} />)
      expect(findPhaseNode("Go Live")?.getAttribute("data-slot")).toBe("hover-card-trigger")
    })

    it("wraps adjacent backward node in HoverCard trigger (published → Draft)", () => {
      render(<LifecycleStepper {...baseProps} status="published" />)
      expect(findPhaseNode("Draft")?.getAttribute("data-slot")).toBe("hover-card-trigger")
    })

    it("wraps distant node in Tooltip trigger (draft → Completed)", () => {
      render(<LifecycleStepper {...baseProps} />)
      expect(findPhaseNode("Completed")?.getAttribute("data-slot")).toBe("tooltip-trigger")
    })

    it("does not wrap current node", () => {
      render(<LifecycleStepper {...baseProps} />)
      expect(findPhaseNode("Draft")?.getAttribute("data-slot")).toBeNull()
    })

    it("wraps both adjacent nodes in HoverCard for judging phase", () => {
      render(<LifecycleStepper {...baseProps} status="judging" />)
      expect(findPhaseNode("Go Live")?.getAttribute("data-slot")).toBe("hover-card-trigger")
      expect(findPhaseNode("Completed")?.getAttribute("data-slot")).toBe("hover-card-trigger")
    })

    it("wraps distant nodes in Tooltip for judging phase", () => {
      render(<LifecycleStepper {...baseProps} status="judging" />)
      expect(findPhaseNode("Draft")?.getAttribute("data-slot")).toBe("tooltip-trigger")
    })

    it("wraps adjacent node in HoverCard for completed phase (backward)", () => {
      render(<LifecycleStepper {...baseProps} status="completed" />)
      expect(findPhaseNode("Judging")?.getAttribute("data-slot")).toBe("hover-card-trigger")
    })

    it("does not wrap current completed node", () => {
      render(<LifecycleStepper {...baseProps} status="completed" />)
      expect(findPhaseNode("Completed")?.getAttribute("data-slot")).toBeNull()
    })
  })

  describe("connector lines", () => {
    it("uses muted-foreground for past connector lines", () => {
      const { container } = render(<LifecycleStepper {...baseProps} status="judging" />)
      const pastLines = container.querySelectorAll(".bg-muted-foreground.h-px")
      expect(pastLines.length).toBeGreaterThan(0)
    })

    it("uses bg-border for future connector lines", () => {
      const { container } = render(<LifecycleStepper {...baseProps} />)
      const futureLines = container.querySelectorAll(".bg-border.h-px")
      expect(futureLines.length).toBeGreaterThan(0)
    })

    it("does not use bg-primary for any connector lines", () => {
      const { container } = render(<LifecycleStepper {...baseProps} status="judging" />)
      const primaryLines = container.querySelectorAll(".bg-primary.h-px")
      expect(primaryLines.length).toBe(0)
    })
  })
})
