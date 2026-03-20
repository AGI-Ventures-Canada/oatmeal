import { describe, it, expect, mock, afterEach, beforeEach } from "bun:test"
import { render, screen, cleanup, act } from "@testing-library/react"
import { resetComponentMocks, setRouter, setPathname } from "../../lib/component-mocks"

const mockReplace = mock(() => {})

const { ImportComplete } = await import("@/components/hackathon/import-complete")

let callbacks: Array<{ fn: () => void; delay: number }>
let originalSetTimeout: typeof globalThis.setTimeout

beforeEach(() => {
  resetComponentMocks()
  setRouter({ replace: mockReplace })
  setPathname("/luma.com/test-event")
  callbacks = []
  originalSetTimeout = globalThis.setTimeout
  globalThis.setTimeout = ((fn: () => void, delay: number) => {
    callbacks.push({ fn, delay })
    return callbacks.length as unknown as ReturnType<typeof setTimeout>
  }) as typeof globalThis.setTimeout
})

afterEach(() => {
  globalThis.setTimeout = originalSetTimeout
  cleanup()
  mockReplace.mockClear()
})

function flushTimers() {
  const pending = [...callbacks]
  callbacks = []
  pending.forEach(({ fn }) => fn())
}

describe("ImportComplete", () => {
  it("renders success message", () => {
    render(<ImportComplete slug="my-hackathon" />)
    expect(screen.getByText("Hackathon imported successfully")).toBeDefined()
    expect(screen.getByText("Redirecting to your dashboard...")).toBeDefined()
  })

  it("calls router.replace after delay", async () => {
    render(<ImportComplete slug="my-hackathon" />)
    expect(mockReplace).not.toHaveBeenCalled()

    await act(async () => {
      flushTimers()
    })

    expect(mockReplace).toHaveBeenCalledWith("/e/my-hackathon/manage")
  })

  it("schedules redirect with 2 second delay", () => {
    render(<ImportComplete slug="test-slug" />)
    const redirectTimer = callbacks.find((cb) => cb.delay === 2000)
    expect(redirectTimer).toBeDefined()
  })

  it("uses the slug prop in the redirect URL", async () => {
    render(<ImportComplete slug="cool-event-2026" />)

    await act(async () => {
      flushTimers()
    })

    expect(mockReplace).toHaveBeenCalledWith("/e/cool-event-2026/manage")
  })
})
