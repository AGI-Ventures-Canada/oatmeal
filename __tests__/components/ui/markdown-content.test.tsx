import { describe, expect, it, afterEach } from "bun:test"
import { render, screen, cleanup } from "@testing-library/react"
import { MarkdownContent } from "@/components/ui/markdown-content"

describe("MarkdownContent", () => {
  afterEach(cleanup)

  it("renders bold text", () => {
    render(<MarkdownContent>{"**hello**"}</MarkdownContent>)
    const strong = screen.getByText("hello")
    expect(strong.tagName).toBe("STRONG")
  })

  it("renders headings", () => {
    render(<MarkdownContent>{"## My Heading"}</MarkdownContent>)
    const heading = screen.getByRole("heading", { level: 2 })
    expect(heading.textContent).toBe("My Heading")
  })

  it("renders unordered lists", () => {
    render(<MarkdownContent>{"- item one\n- item two"}</MarkdownContent>)
    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toBe("item one")
  })

  it("renders links", () => {
    render(<MarkdownContent>{"[click here](https://example.com)"}</MarkdownContent>)
    const link = screen.getByRole("link", { name: "click here" })
    expect(link.getAttribute("href")).toBe("https://example.com")
  })

  it("does not render raw HTML tags", () => {
    const { container } = render(
      <MarkdownContent>{'<script>alert("xss")</script>'}</MarkdownContent>
    )
    expect(container.querySelector("script")).toBeNull()
  })

  it("renders GFM strikethrough", () => {
    render(<MarkdownContent>{"~~deleted~~"}</MarkdownContent>)
    const del = screen.getByText("deleted")
    expect(del.tagName).toBe("DEL")
  })

  it("renders GFM task lists", () => {
    render(<MarkdownContent>{"- [x] done\n- [ ] todo"}</MarkdownContent>)
    const checkboxes = screen.getAllByRole("checkbox")
    expect(checkboxes).toHaveLength(2)
  })

  it("returns null for empty content", () => {
    const { container } = render(<MarkdownContent>{null}</MarkdownContent>)
    expect(container.innerHTML).toBe("")
  })

  it("returns null for undefined content", () => {
    const { container } = render(<MarkdownContent>{undefined}</MarkdownContent>)
    expect(container.innerHTML).toBe("")
  })

  it("returns null for empty string", () => {
    const { container } = render(<MarkdownContent>{""}</MarkdownContent>)
    expect(container.innerHTML).toBe("")
  })

  it("applies prose classes", () => {
    const { container } = render(<MarkdownContent>{"hello"}</MarkdownContent>)
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain("prose")
    expect(wrapper.className).toContain("dark:prose-invert")
  })

  it("accepts additional className", () => {
    const { container } = render(
      <MarkdownContent className="mt-4">{"hello"}</MarkdownContent>
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain("mt-4")
  })

  it("renders plain text as paragraphs (backward-compatible)", () => {
    render(<MarkdownContent>{"Just a plain description"}</MarkdownContent>)
    expect(screen.getByText("Just a plain description").tagName).toBe("P")
  })
})
