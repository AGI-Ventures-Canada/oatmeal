import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"
import { cleanup, render, screen } from "@testing-library/react"
import { resetComponentMocks } from "../lib/component-mocks"

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

const { HomepageHero } = await import("@/components/homepage-hero")

beforeEach(() => {
  resetComponentMocks()
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

  it("renders a single create event CTA", () => {
    render(<HomepageHero />)

    expect(screen.getByText("Create event")).toBeDefined()
  })

  it("links the CTA to /create", () => {
    render(<HomepageHero />)

    const link = screen.getByText("Create event").closest("a")
    expect(link?.getAttribute("href")).toBe("/create")
  })

  it("renders the install command as a clickable copy area", () => {
    render(<HomepageHero />)

    expect(screen.getByText("Or manage hackathons from your AI agent")).toBeDefined()
    expect(screen.getByText("npx skills add AGI-Ventures-Canada/oatmeal")).toBeDefined()
  })
})
