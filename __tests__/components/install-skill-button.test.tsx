import { describe, expect, it, afterEach } from "bun:test"
import { render, screen, cleanup } from "@testing-library/react"
import { InstallSkillButton } from "@/components/install-skill-button"

describe("InstallSkillButton", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the default trigger button", () => {
    render(<InstallSkillButton />)
    const button = screen.getByRole("button")
    expect(button.textContent).toContain("Install Skill")
  })

  it("renders a custom trigger when provided", () => {
    render(<InstallSkillButton trigger={<button>Custom Trigger</button>} />)
    const button = screen.getByRole("button")
    expect(button.textContent).toBe("Custom Trigger")
  })

  it("has aria attributes for dialog trigger", () => {
    render(<InstallSkillButton />)
    const button = screen.getByRole("button")
    expect(button.getAttribute("aria-haspopup")).toBe("dialog")
    expect(button.getAttribute("aria-expanded")).toBe("false")
  })

  it("has correct button type", () => {
    render(<InstallSkillButton />)
    const button = screen.getByRole("button")
    expect(button.getAttribute("type")).toBe("button")
  })
})
