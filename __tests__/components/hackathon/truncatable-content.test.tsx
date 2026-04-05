import { describe, expect, it, afterEach } from "bun:test"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { TruncatableContent } from "@/components/hackathon/preview/truncatable-content"

const originalScrollHeight = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollHeight"
)

function mockScrollHeight(value: number) {
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get() {
      return value
    },
  })
}

function restoreScrollHeight() {
  if (originalScrollHeight) {
    Object.defineProperty(
      HTMLElement.prototype,
      "scrollHeight",
      originalScrollHeight
    )
  }
}

describe("TruncatableContent", () => {
  afterEach(() => {
    cleanup()
    restoreScrollHeight()
  })

  it("renders children", () => {
    mockScrollHeight(100)
    render(
      <TruncatableContent>
        <p>Short content</p>
      </TruncatableContent>
    )
    expect(screen.getByText("Short content")).toBeTruthy()
  })

  it("does not show button when content fits", () => {
    mockScrollHeight(100)
    render(
      <TruncatableContent>
        <p>Short content</p>
      </TruncatableContent>
    )
    expect(screen.queryByText("Show more")).toBeNull()
  })

  it("shows button when content overflows", () => {
    mockScrollHeight(500)
    render(
      <TruncatableContent>
        <p>Long content</p>
      </TruncatableContent>
    )
    expect(screen.getByText("Show more")).toBeTruthy()
  })

  it("expands content on button click", () => {
    mockScrollHeight(500)
    const { container } = render(
      <TruncatableContent>
        <p>Long content</p>
      </TruncatableContent>
    )

    const contentDiv = container.firstElementChild!.firstElementChild as HTMLElement
    expect(contentDiv.style.maxHeight).toBe("400px")

    fireEvent.click(screen.getByText("Show more"))

    expect(contentDiv.style.maxHeight).toBe("")
    expect(screen.queryByText("Show more")).toBeNull()
  })

  it("stopPropagation prevents parent click", () => {
    mockScrollHeight(500)
    let parentClicked = false

    render(
      <div onClick={() => { parentClicked = true }}>
        <TruncatableContent>
          <p>Long content</p>
        </TruncatableContent>
      </div>
    )

    fireEvent.click(screen.getByText("Show more"))
    expect(parentClicked).toBe(false)
  })
})
