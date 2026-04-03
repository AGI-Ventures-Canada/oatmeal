import { describe, it, expect, mock, afterEach } from "bun:test"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"

const { CreateFlowProgress } = await import(
  "@/components/hackathon/create-flow/create-flow-progress"
)

afterEach(() => {
  cleanup()
})

describe("CreateFlowProgress", () => {
  const defaultProps = {
    currentStep: 0,
    totalSteps: 4,
    canSkip: false,
    onSkip: mock(() => {}),
    onBack: mock(() => {}),
    onClose: mock(() => {}),
  }

  it("displays step counter", () => {
    render(<CreateFlowProgress {...defaultProps} />)
    expect(screen.getByText("1 / 4")).toBeDefined()
  })

  it("displays correct step counter for step 3", () => {
    render(<CreateFlowProgress {...defaultProps} currentStep={2} />)
    expect(screen.getByText("3 / 4")).toBeDefined()
  })

  it("shows Close button on first step", () => {
    render(<CreateFlowProgress {...defaultProps} />)
    expect(screen.getByText("Close")).toBeDefined()
  })

  it("calls onClose when Close is clicked on first step", () => {
    const onClose = mock(() => {})
    render(<CreateFlowProgress {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByText("Close"))
    expect(onClose).toHaveBeenCalled()
  })

  it("shows Back button on later steps", () => {
    render(<CreateFlowProgress {...defaultProps} currentStep={1} />)
    expect(screen.getByText("Back")).toBeDefined()
  })

  it("calls onBack when Back is clicked", () => {
    const onBack = mock(() => {})
    render(<CreateFlowProgress {...defaultProps} currentStep={1} onBack={onBack} />)
    fireEvent.click(screen.getByText("Back"))
    expect(onBack).toHaveBeenCalled()
  })

  it("hides Skip link when canSkip is false", () => {
    render(<CreateFlowProgress {...defaultProps} canSkip={false} />)
    expect(screen.queryByText("Skip to event page")).toBeNull()
  })

  it("shows Skip link when canSkip is true", () => {
    render(<CreateFlowProgress {...defaultProps} canSkip={true} />)
    expect(screen.getByText("Skip to event page")).toBeDefined()
  })

  it("calls onSkip when Skip is clicked", () => {
    const onSkip = mock(() => {})
    render(<CreateFlowProgress {...defaultProps} canSkip={true} onSkip={onSkip} />)
    fireEvent.click(screen.getByText("Skip to event page"))
    expect(onSkip).toHaveBeenCalled()
  })

  it("renders a progress bar", () => {
    render(<CreateFlowProgress {...defaultProps} />)
    expect(screen.getByRole("progressbar")).toBeDefined()
  })
})
