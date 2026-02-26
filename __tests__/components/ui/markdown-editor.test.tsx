import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"

mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: mock(() => {}),
    refresh: mock(() => {}),
    replace: mock(() => {}),
    prefetch: mock(() => {}),
  }),
}))

const { MarkdownEditor } = await import("@/components/ui/markdown-editor")

describe("MarkdownEditor", () => {
  afterEach(cleanup)

  it("renders Write and Preview tabs", () => {
    render(<MarkdownEditor value="" onChange={() => {}} />)
    expect(screen.getByRole("tab", { name: "Write" })).toBeDefined()
    expect(screen.getByRole("tab", { name: "Preview" })).toBeDefined()
  })

  it("shows textarea in Write tab by default", () => {
    render(
      <MarkdownEditor value="hello" onChange={() => {}} placeholder="Enter text" />
    )
    const textarea = screen.getByPlaceholderText("Enter text")
    expect(textarea).toBeDefined()
    expect((textarea as HTMLTextAreaElement).value).toBe("hello")
  })

  it("calls onChange when typing", () => {
    const handleChange = mock(() => {})
    render(
      <MarkdownEditor value="" onChange={handleChange} placeholder="Type here" />
    )
    const textarea = screen.getByPlaceholderText("Type here")
    fireEvent.change(textarea, { target: { value: "new text" } })
    expect(handleChange).toHaveBeenCalledWith("new text")
  })

  it("has two tab panels (write and preview)", () => {
    const { container } = render(<MarkdownEditor value="**bold**" onChange={() => {}} />)
    const panels = container.querySelectorAll("[role='tabpanel']")
    expect(panels.length).toBeGreaterThanOrEqual(1)
    const writeTab = screen.getByRole("tab", { name: "Write" })
    const previewTab = screen.getByRole("tab", { name: "Preview" })
    expect(writeTab.getAttribute("aria-selected")).toBe("true")
    expect(previewTab.getAttribute("aria-selected")).toBe("false")
  })

  it("renders all toolbar buttons", () => {
    render(<MarkdownEditor value="" onChange={() => {}} />)
    expect(screen.getByRole("button", { name: "Bold" })).toBeDefined()
    expect(screen.getByRole("button", { name: "Italic" })).toBeDefined()
    expect(screen.getByRole("button", { name: "Heading" })).toBeDefined()
    expect(screen.getByRole("button", { name: "Bullet list" })).toBeDefined()
    expect(screen.getByRole("button", { name: "Numbered list" })).toBeDefined()
    expect(screen.getByRole("button", { name: "Link" })).toBeDefined()
    expect(screen.getByRole("button", { name: "Code" })).toBeDefined()
  })

  it("inserts bold syntax when Bold button is clicked", () => {
    const handleChange = mock(() => {})
    render(
      <MarkdownEditor value="hello" onChange={handleChange} placeholder="Type" />
    )
    const textarea = screen.getByPlaceholderText("Type") as HTMLTextAreaElement
    textarea.setSelectionRange(0, 5)
    fireEvent.click(screen.getByRole("button", { name: "Bold" }))
    expect(handleChange).toHaveBeenCalledWith("**hello**")
  })

  it("inserts italic syntax when Italic button is clicked", () => {
    const handleChange = mock(() => {})
    render(
      <MarkdownEditor value="hello" onChange={handleChange} placeholder="Type" />
    )
    const textarea = screen.getByPlaceholderText("Type") as HTMLTextAreaElement
    textarea.setSelectionRange(0, 5)
    fireEvent.click(screen.getByRole("button", { name: "Italic" }))
    expect(handleChange).toHaveBeenCalledWith("_hello_")
  })

  it("inserts heading prefix when Heading button is clicked", () => {
    const handleChange = mock(() => {})
    render(
      <MarkdownEditor value="title" onChange={handleChange} placeholder="Type" />
    )
    const textarea = screen.getByPlaceholderText("Type") as HTMLTextAreaElement
    textarea.setSelectionRange(0, 0)
    fireEvent.click(screen.getByRole("button", { name: "Heading" }))
    expect(handleChange).toHaveBeenCalledWith("## title")
  })

  it("inserts link syntax when Link button is clicked with selection", () => {
    const handleChange = mock(() => {})
    render(
      <MarkdownEditor value="click me" onChange={handleChange} placeholder="Type" />
    )
    const textarea = screen.getByPlaceholderText("Type") as HTMLTextAreaElement
    textarea.setSelectionRange(0, 8)
    fireEvent.click(screen.getByRole("button", { name: "Link" }))
    expect(handleChange).toHaveBeenCalledWith("[click me](url)")
  })

  it("inserts link template when Link button is clicked without selection", () => {
    const handleChange = mock(() => {})
    render(
      <MarkdownEditor value="" onChange={handleChange} placeholder="Type" />
    )
    fireEvent.click(screen.getByRole("button", { name: "Link" }))
    expect(handleChange).toHaveBeenCalledWith("[link text](url)")
  })

  it("inserts code syntax when Code button is clicked", () => {
    const handleChange = mock(() => {})
    render(
      <MarkdownEditor value="const x" onChange={handleChange} placeholder="Type" />
    )
    const textarea = screen.getByPlaceholderText("Type") as HTMLTextAreaElement
    textarea.setSelectionRange(0, 7)
    fireEvent.click(screen.getByRole("button", { name: "Code" }))
    expect(handleChange).toHaveBeenCalledWith("`const x`")
  })

  it("passes id prop to textarea", () => {
    render(
      <MarkdownEditor value="" onChange={() => {}} id="my-editor" placeholder="Type" />
    )
    const textarea = screen.getByPlaceholderText("Type")
    expect(textarea.id).toBe("my-editor")
  })
})
