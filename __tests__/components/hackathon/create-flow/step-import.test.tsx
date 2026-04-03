import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import { resetComponentMocks, setRouter } from "../../../lib/component-mocks"

const { StepImport } = await import(
  "@/components/hackathon/create-flow/step-import"
)

const mockPush = mock(() => {})

beforeEach(() => {
  resetComponentMocks()
  mockPush.mockClear()
  setRouter({ push: mockPush })
})

afterEach(() => {
  cleanup()
})

describe("StepImport", () => {
  const defaultProps = {
    onSkipToScratch: mock(() => {}),
    onModeChange: mock(() => {}),
  }

  describe("choose mode", () => {
    it("renders two option cards", () => {
      render(<StepImport {...defaultProps} />)
      expect(screen.getByText("Start from scratch")).toBeDefined()
      expect(screen.getByText("Import from URL")).toBeDefined()
    })

    it("calls onSkipToScratch when Start from scratch is clicked", () => {
      const onSkipToScratch = mock(() => {})
      render(<StepImport {...defaultProps} onSkipToScratch={onSkipToScratch} />)
      fireEvent.click(screen.getByText("Start from scratch"))
      expect(onSkipToScratch).toHaveBeenCalled()
    })

    it("switches to import mode when Import from URL is clicked", async () => {
      render(<StepImport {...defaultProps} />)
      fireEvent.click(screen.getByText("Import from URL"))
      await waitFor(() => {
        expect(screen.getByText("Paste the event URL")).toBeDefined()
      })
    })

    it("calls onModeChange when switching to import mode", () => {
      const onModeChange = mock(() => {})
      render(<StepImport {...defaultProps} onModeChange={onModeChange} />)
      fireEvent.click(screen.getByText("Import from URL"))
      expect(onModeChange).toHaveBeenCalledWith("import")
    })
  })

  describe("import mode", () => {
    function goToImportMode() {
      fireEvent.click(screen.getByText("Import from URL"))
    }

    it("shows URL input with placeholder", async () => {
      render(<StepImport {...defaultProps} />)
      goToImportMode()
      await waitFor(() => {
        expect(screen.getByPlaceholderText("luma.com/your-event")).toBeDefined()
      })
    })

    it("shows error for invalid URL", async () => {
      render(<StepImport {...defaultProps} />)
      goToImportMode()
      await waitFor(() => screen.getByPlaceholderText("luma.com/your-event"))

      fireEvent.change(screen.getByPlaceholderText("luma.com/your-event"), {
        target: { value: "not a url" },
      })
      fireEvent.keyDown(screen.getByPlaceholderText("luma.com/your-event"), {
        key: "Enter",
      })

      expect(screen.getByText("That doesn't look like a URL. Paste an event page link.")).toBeDefined()
    })

    it("clears error when typing", async () => {
      render(<StepImport {...defaultProps} />)
      goToImportMode()
      await waitFor(() => screen.getByPlaceholderText("luma.com/your-event"))

      fireEvent.change(screen.getByPlaceholderText("luma.com/your-event"), {
        target: { value: "not a url" },
      })
      fireEvent.keyDown(screen.getByPlaceholderText("luma.com/your-event"), {
        key: "Enter",
      })
      expect(screen.getByText("That doesn't look like a URL. Paste an event page link.")).toBeDefined()

      fireEvent.change(screen.getByPlaceholderText("luma.com/your-event"), {
        target: { value: "luma.com/event" },
      })
      expect(screen.queryByText("That doesn't look like a URL. Paste an event page link.")).toBeNull()
    })

    it("navigates to /import on valid URL submit", async () => {
      render(<StepImport {...defaultProps} />)
      goToImportMode()
      await waitFor(() => screen.getByPlaceholderText("luma.com/your-event"))

      fireEvent.change(screen.getByPlaceholderText("luma.com/your-event"), {
        target: { value: "luma.com/my-event" },
      })
      fireEvent.keyDown(screen.getByPlaceholderText("luma.com/your-event"), {
        key: "Enter",
      })

      expect(mockPush).toHaveBeenCalled()
      const pushArg = mockPush.mock.calls[0][0] as string
      expect(pushArg).toContain("/import?url=")
    })

    it("shows submit button when URL has content", async () => {
      render(<StepImport {...defaultProps} />)
      goToImportMode()
      await waitFor(() => screen.getByPlaceholderText("luma.com/your-event"))

      fireEvent.change(screen.getByPlaceholderText("luma.com/your-event"), {
        target: { value: "luma.com/event" },
      })

      const buttons = screen.getAllByRole("button")
      const submitButton = buttons.find((b) => b.querySelector(".lucide-arrow-right"))
      expect(submitButton).toBeDefined()
    })
  })
})
