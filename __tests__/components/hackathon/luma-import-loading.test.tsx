import { describe, it, expect, afterEach, beforeEach } from "bun:test"
import { render, screen, cleanup, act } from "@testing-library/react"
import LumaImportLoading from "@/app/(public)/luma.com/[...path]/loading"

afterEach(() => {
  cleanup()
})

describe("LumaImportLoading", () => {
  let callbacks: Array<{ fn: () => void; delay: number; id: number }>
  let nextId: number
  let originalSetTimeout: typeof globalThis.setTimeout

  beforeEach(() => {
    callbacks = []
    nextId = 1
    originalSetTimeout = globalThis.setTimeout
    globalThis.setTimeout = ((fn: () => void, delay: number) => {
      const id = nextId++
      callbacks.push({ fn, delay, id })
      return id as unknown as ReturnType<typeof setTimeout>
    }) as typeof globalThis.setTimeout
  })

  afterEach(() => {
    globalThis.setTimeout = originalSetTimeout
  })

  function flushMessageTimers() {
    const messageTimers = callbacks.filter((cb) => cb.delay !== 60_000)
    callbacks = callbacks.filter((cb) => cb.delay === 60_000)
    messageTimers.forEach(({ fn }) => fn())
  }

  function flushTimeoutTimer() {
    const timeoutTimer = callbacks.find((cb) => cb.delay === 60_000)
    callbacks = callbacks.filter((cb) => cb.delay !== 60_000)
    if (timeoutTimer) timeoutTimer.fn()
  }

  it("renders the initial progress message", () => {
    render(<LumaImportLoading />)
    expect(screen.getByText("Visiting the event page...")).toBeDefined()
  })

  it("renders skeleton elements", () => {
    render(<LumaImportLoading />)
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("advances to a different message after interval", async () => {
    render(<LumaImportLoading />)
    expect(screen.getByText("Visiting the event page...")).toBeDefined()

    await act(async () => {
      flushMessageTimers()
    })
    await act(async () => {
      flushMessageTimers()
    })

    expect(screen.queryByText("Visiting the event page...")).toBeNull()
  })

  it("shows 15 unique messages when cycling through all", async () => {
    render(<LumaImportLoading />)

    const seen = new Set<string>()
    seen.add(screen.getByText(/\.\.\./).textContent!)

    for (let i = 0; i < 14; i++) {
      await act(async () => {
        flushMessageTimers()
      })
      await act(async () => {
        flushMessageTimers()
      })
      seen.add(screen.getByText(/\.\.\./).textContent!)
    }

    expect(seen.size).toBe(15)
  })

  it("always starts with 'Visiting' and ends with 'Almost ready'", async () => {
    render(<LumaImportLoading />)
    expect(screen.getByText("Visiting the event page...")).toBeDefined()

    for (let i = 0; i < 30; i++) {
      await act(async () => {
        flushMessageTimers()
      })
    }

    expect(screen.getByText("Almost ready...")).toBeDefined()
  })

  it("stays on the last message after cycling through all", async () => {
    render(<LumaImportLoading />)

    for (let i = 0; i < 30; i++) {
      await act(async () => {
        flushMessageTimers()
      })
    }

    expect(screen.getByText("Almost ready...")).toBeDefined()
  })

  it("shows timeout UI after 60 seconds", async () => {
    render(<LumaImportLoading />)

    await act(async () => {
      flushTimeoutTimer()
    })

    expect(screen.getByText("This is taking longer than expected")).toBeDefined()
    expect(screen.getByRole("button", { name: "Try again" })).toBeDefined()
  })

  it("hides skeleton and spinner in timeout state", async () => {
    render(<LumaImportLoading />)

    await act(async () => {
      flushTimeoutTimer()
    })

    expect(screen.queryByText("Visiting the event page...")).toBeNull()
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBe(0)
  })
})
