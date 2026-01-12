import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test"
import { render, screen, cleanup } from "@testing-library/react"
import { ApiKeyCreateDialog } from "@/components/dashboard/api-key-create-dialog"

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

describe("ApiKeyCreateDialog", () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockRefresh.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it("renders create button trigger", () => {
    render(<ApiKeyCreateDialog />)
    const button = screen.getByRole("button")
    expect(button).toBeDefined()
    expect(button.textContent).toContain("Create API Key")
  })

  it("has correct button type", () => {
    render(<ApiKeyCreateDialog />)
    const button = screen.getByRole("button")
    expect(button.getAttribute("type")).toBe("button")
  })

  it("has aria attributes for dialog trigger", () => {
    render(<ApiKeyCreateDialog />)
    const button = screen.getByRole("button")
    expect(button.getAttribute("aria-haspopup")).toBe("dialog")
    expect(button.getAttribute("aria-expanded")).toBe("false")
  })
})
