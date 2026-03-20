import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { resetComponentMocks, setRouter } from "../../lib/component-mocks"

const mockPush = mock(() => {})
const mockRefresh = mock(() => {})

let mockIsMobile = false
mock.module("@/hooks/use-mobile", () => ({
  useIsMobile: () => mockIsMobile,
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
    resetComponentMocks()
    mockPush.mockClear()
    mockRefresh.mockClear()
    setRouter({ push: mockPush, refresh: mockRefresh })
    mockIsMobile = false
  })

  afterEach(() => {
    cleanup()
  })

  it("renders all four phase labels", () => {
    render(<LifecycleStepper {...baseProps} />)
    expect(screen.getByText("Draft")).toBeDefined()
    expect(screen.getByText("Go Live")).toBeDefined()
    expect(screen.getByText("Closed for submissions")).toBeDefined()
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
    expect(screen.queryByText("Assign Submissions")).toBeNull()
    expect(screen.queryByText("Close Submissions")).toBeNull()
  })

  it("does not render connector CTA buttons in judging phase", () => {
    render(<LifecycleStepper {...baseProps} status="judging" />)
    expect(screen.queryByText("Complete Event")).toBeNull()
  })

  describe("node coloring", () => {
    function findCircle(label: string) {
      return findPhaseNode(label)?.querySelector(".size-8")
    }

    it("uses primary color only on current node in draft phase", () => {
      render(<LifecycleStepper {...baseProps} />)
      expect(findCircle("Draft")?.className).toContain("bg-primary")
    })

    it("uses muted-foreground for past nodes in judging phase", () => {
      render(<LifecycleStepper {...baseProps} status="judging" />)
      expect(findCircle("Draft")?.className).toContain("bg-muted-foreground")
      expect(findCircle("Draft")?.className).not.toContain("bg-primary")
    })

    it("uses outline for future nodes", () => {
      render(<LifecycleStepper {...baseProps} />)
      expect(findCircle("Completed")?.className).toContain("border-muted-foreground/30")
    })

    it("applies opacity-50 to distant future nodes only", () => {
      render(<LifecycleStepper {...baseProps} />)
      expect(findPhaseNode("Completed")?.className).toContain("opacity-50")
    })

    it("does not apply opacity to past nodes even when distant", () => {
      render(<LifecycleStepper {...baseProps} status="judging" />)
      expect(findPhaseNode("Draft")?.className).not.toContain("opacity")
    })

    it("does not apply opacity to adjacent nodes", () => {
      render(<LifecycleStepper {...baseProps} />)
      expect(findPhaseNode("Go Live")?.className).not.toContain("opacity")
    })

    it("applies hover:bg-muted to actionable nodes", () => {
      render(<LifecycleStepper {...baseProps} />)
      expect(findPhaseNode("Go Live")?.className).toContain("hover:bg-muted")
    })
  })

  describe("action wrappers (desktop — HoverCard)", () => {
    it("wraps adjacent forward node in HoverCard trigger (draft → Go Live)", () => {
      render(<LifecycleStepper {...baseProps} />)
      expect(findPhaseNode("Go Live")?.getAttribute("data-slot")).toBe("hover-card-trigger")
    })

    it("wraps adjacent backward node in HoverCard trigger (published → Draft)", () => {
      render(<LifecycleStepper {...baseProps} status="published" />)
      expect(findPhaseNode("Take Offline")?.getAttribute("data-slot")).toBe("hover-card-trigger")
    })

    it("wraps distant future node in Tooltip trigger (draft → Completed)", () => {
      render(<LifecycleStepper {...baseProps} />)
      expect(findPhaseNode("Completed")?.getAttribute("data-slot")).toBe("tooltip-trigger")
    })

    it("does not wrap current node", () => {
      render(<LifecycleStepper {...baseProps} />)
      expect(findPhaseNode("Draft")?.getAttribute("data-slot")).toBeNull()
    })

    it("wraps all non-current nodes for judging phase", () => {
      render(<LifecycleStepper {...baseProps} status="judging" />)
      expect(findPhaseNode("Draft")?.getAttribute("data-slot")).toBe("hover-card-trigger")
      expect(findPhaseNode("Go Live")?.getAttribute("data-slot")).toBe("hover-card-trigger")
      expect(findPhaseNode("Completed")?.getAttribute("data-slot")).toBe("hover-card-trigger")
    })

    it("wraps all past nodes in HoverCard for completed phase", () => {
      render(<LifecycleStepper {...baseProps} status="completed" />)
      expect(findPhaseNode("Draft")?.getAttribute("data-slot")).toBe("hover-card-trigger")
      expect(findPhaseNode("Go Live")?.getAttribute("data-slot")).toBe("hover-card-trigger")
      expect(findPhaseNode("Closed for submissions")?.getAttribute("data-slot")).toBe("hover-card-trigger")
    })

    it("does not wrap current completed node", () => {
      render(<LifecycleStepper {...baseProps} status="completed" />)
      expect(findPhaseNode("Completed")?.getAttribute("data-slot")).toBeNull()
    })
  })

  describe("action wrappers (mobile — Popover)", () => {
    beforeEach(() => {
      mockIsMobile = true
    })

    it("wraps actionable nodes in Popover trigger on mobile", () => {
      render(<LifecycleStepper {...baseProps} />)
      expect(findPhaseNode("Go Live")?.getAttribute("data-slot")).toBe("popover-trigger")
    })

    it("wraps all past nodes in Popover for judging phase on mobile", () => {
      render(<LifecycleStepper {...baseProps} status="judging" />)
      expect(findPhaseNode("Draft")?.getAttribute("data-slot")).toBe("popover-trigger")
      expect(findPhaseNode("Go Live")?.getAttribute("data-slot")).toBe("popover-trigger")
      expect(findPhaseNode("Completed")?.getAttribute("data-slot")).toBe("popover-trigger")
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
