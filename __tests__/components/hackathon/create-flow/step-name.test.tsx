import { describe, it, expect, mock, afterEach } from "bun:test"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"

const { StepName } = await import("@/components/hackathon/create-flow/step-name")

afterEach(() => {
  cleanup()
})

describe("StepName", () => {
  it("renders the heading", () => {
    render(<StepName value="" onChange={() => {}} />)
    expect(screen.getByText("What's your hackathon called?")).toBeDefined()
  })

  it("renders the input with placeholder", () => {
    render(<StepName value="" onChange={() => {}} />)
    expect(screen.getByPlaceholderText("My Awesome Hackathon")).toBeDefined()
  })

  it("displays the current value", () => {
    render(<StepName value="Test Event" onChange={() => {}} />)
    const input = screen.getByPlaceholderText("My Awesome Hackathon") as HTMLInputElement
    expect(input.value).toBe("Test Event")
  })

  it("calls onChange when typing", () => {
    const onChange = mock(() => {})
    render(<StepName value="" onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText("My Awesome Hackathon"), {
      target: { value: "New Name" },
    })
    expect(onChange).toHaveBeenCalledWith("New Name")
  })

  it("has password manager prevention attributes", () => {
    render(<StepName value="" onChange={() => {}} />)
    const input = screen.getByPlaceholderText("My Awesome Hackathon")
    expect(input.getAttribute("autocomplete")).toBe("off")
    expect(input.getAttribute("data-1p-ignore")).toBeDefined()
    expect(input.getAttribute("data-lpignore")).toBe("true")
  })
})
