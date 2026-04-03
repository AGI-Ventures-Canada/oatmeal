import { describe, expect, it, afterEach } from "bun:test"
import { render, screen, cleanup } from "@testing-library/react"
import { TabCount } from "@/components/ui/tabs"

describe("TabCount", () => {
  afterEach(cleanup)

  it("renders the count with the secondary badge variant", () => {
    render(<TabCount>5</TabCount>)

    const count = screen.getByText("5")
    expect(count.getAttribute("data-slot")).toBe("badge")
    expect(count.getAttribute("data-variant")).toBe("secondary")
  })
})
