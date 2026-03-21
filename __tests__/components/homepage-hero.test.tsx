import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import * as dialogMock from "../lib/dialog-mock"

const mockPush = mock(() => {})

mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  redirect: mock(() => {}),
  notFound: mock(() => {}),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

mock.module("@/components/ui/dialog", () => dialogMock)

const { HomepageHero } = await import("@/components/homepage-hero")

beforeEach(() => {
  mockPush.mockClear()
})

afterEach(() => {
  cleanup()
})

describe("HomepageHero", () => {
  it("renders the hero headline and description", () => {
    render(<HomepageHero />)

    expect(screen.getByText("Run your hackathon from start to finish")).toBeDefined()
    expect(
      screen.getByText("Registration, teams, submissions, judging, and results — all in one place.")
    ).toBeDefined()
  })

  it("renders both CTA buttons", () => {
    render(<HomepageHero />)

    expect(screen.getByText("Create from scratch")).toBeDefined()
    expect(screen.getByText("Import an external event")).toBeDefined()
  })

  it("renders the AI agent skill mention", () => {
    render(<HomepageHero />)

    expect(screen.getByText("Claude Code")).toBeDefined()
    expect(screen.getByText("Open Claw")).toBeDefined()
    expect(screen.getByText("npx skills add AGI-Ventures-Canada/oatmeal")).toBeDefined()
  })

  it("opens the create dialog in scratch mode when clicking 'Create from scratch'", async () => {
    render(<HomepageHero />)

    fireEvent.click(screen.getByText("Create from scratch"))

    await waitFor(() => {
      expect(screen.getByPlaceholderText("My Awesome Hackathon")).toBeDefined()
    })
  })

  it("opens the create dialog in external mode when clicking 'Import an external event'", async () => {
    render(<HomepageHero />)

    fireEvent.click(screen.getByText("Import an external event"))

    await waitFor(() => {
      expect(screen.getByPlaceholderText("eventbrite.com/e/my-event")).toBeDefined()
    })
  })

  it("redirects to sign-up when guest submits from-scratch creation", async () => {
    render(<HomepageHero />)

    fireEvent.click(screen.getByText("Create from scratch"))

    await waitFor(() => {
      expect(screen.getByPlaceholderText("My Awesome Hackathon")).toBeDefined()
    })

    fireEvent.change(screen.getByPlaceholderText("My Awesome Hackathon"), {
      target: { value: "Test Hackathon" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Next" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign up to create" })).toBeDefined()
    })

    fireEvent.click(screen.getByRole("button", { name: "Sign up to create" }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/sign-up?redirect_url=%2Fhome")
    })
  })
})
