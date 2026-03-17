import { describe, it, expect, mock, afterEach, beforeEach } from "bun:test"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"

const mockPush = mock(() => {})
mock.module("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mock(() => {}), replace: mock(() => {}), prefetch: mock(() => {}) }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/home",
}))

// Import the real component directly by file path to avoid mock.module pollution
// from other test files (e.g. create-hackathon-menu.test.tsx mocks this module).
const { LumaPasteInput } = await import("../../../components/hackathon/luma-paste-input")

afterEach(() => {
  cleanup()
  mockPush.mockClear()
})

describe("LumaPasteInput", () => {
  it("renders the paste input", () => {
    render(<LumaPasteInput />)
    expect(screen.getByPlaceholderText(/Paste a Luma link/)).toBeDefined()
  })

  it("navigates to import page on valid luma.com URL", () => {
    render(<LumaPasteInput />)
    const input = screen.getByPlaceholderText(/Paste a Luma link/)
    fireEvent.change(input, { target: { value: "https://luma.com/sfagents" } })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(mockPush).toHaveBeenCalledWith("/luma.com/sfagents")
  })

  it("navigates to import page on valid lu.ma URL", () => {
    render(<LumaPasteInput />)
    const input = screen.getByPlaceholderText(/Paste a Luma link/)
    fireEvent.change(input, { target: { value: "https://lu.ma/my-event" } })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(mockPush).toHaveBeenCalledWith("/luma.com/my-event")
  })

  it("shows error for invalid URLs", () => {
    render(<LumaPasteInput />)
    const input = screen.getByPlaceholderText(/Paste a Luma link/)
    fireEvent.change(input, { target: { value: "https://google.com" } })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(mockPush).not.toHaveBeenCalled()
    expect(screen.getByText(/Please enter a valid Luma URL/)).toBeDefined()
  })
})
