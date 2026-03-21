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

mock.module("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    className?: string
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
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

  it("renders the install command with a copy button", () => {
    render(<HomepageHero />)

    expect(screen.getByText("Or manage hackathons from your AI agent")).toBeDefined()
    expect(screen.getByText("npx skills add AGI-Ventures-Canada/oatmeal")).toBeDefined()
    expect(screen.getByRole("button", { name: "Copy install command" })).toBeDefined()
  })

  it("links 'Create from scratch' to /create", () => {
    render(<HomepageHero />)

    const link = screen.getByText("Create from scratch").closest("a")
    expect(link?.getAttribute("href")).toBe("/create")
  })

  it("opens the import dialog when clicking 'Import an external event'", async () => {
    render(<HomepageHero />)

    fireEvent.click(screen.getByText("Import an external event"))

    await waitFor(() => {
      expect(screen.getByPlaceholderText("eventbrite.com/e/my-event")).toBeDefined()
    })
  })
})
