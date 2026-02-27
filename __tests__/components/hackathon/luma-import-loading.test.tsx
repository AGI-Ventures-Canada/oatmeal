import { describe, it, expect, afterEach, beforeEach } from "bun:test"
import { render, screen, cleanup, act } from "@testing-library/react"
import LumaImportLoading from "@/app/(public)/luma.com/[...path]/loading"

afterEach(() => {
  cleanup()
})

describe("LumaImportLoading", () => {
  let callbacks: Array<{ fn: () => void; delay: number }>
  let originalSetTimeout: typeof globalThis.setTimeout

  beforeEach(() => {
    callbacks = []
    originalSetTimeout = globalThis.setTimeout
    globalThis.setTimeout = ((fn: () => void, delay: number) => {
      callbacks.push({ fn, delay })
      return callbacks.length as unknown as ReturnType<typeof setTimeout>
    }) as typeof globalThis.setTimeout
  })

  afterEach(() => {
    globalThis.setTimeout = originalSetTimeout
  })

  function flushTimers() {
    const pending = [...callbacks]
    callbacks = []
    pending.forEach(({ fn }) => fn())
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

  it("cycles to the next message after interval", async () => {
    render(<LumaImportLoading />)
    expect(screen.getByText("Visiting the event page...")).toBeDefined()

    await act(async () => {
      flushTimers()
    })

    expect(screen.getByText("Reading event details...")).toBeDefined()
  })

  it("cycles through all messages", async () => {
    render(<LumaImportLoading />)

    const messages = [
      "Visiting the event page...",
      "Reading event details...",
      "Extracting sponsors and prizes...",
      "Polishing the details...",
      "Almost ready...",
    ]

    for (let i = 0; i < messages.length; i++) {
      expect(screen.getByText(messages[i])).toBeDefined()
      if (i < messages.length - 1) {
        await act(async () => {
          flushTimers()
        })
      }
    }
  })

  it("stays on the last message after cycling through all", async () => {
    render(<LumaImportLoading />)

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        flushTimers()
      })
    }

    expect(screen.getByText("Almost ready...")).toBeDefined()
  })
})
