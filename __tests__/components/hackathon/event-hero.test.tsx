import { afterEach, describe, expect, it, mock } from "bun:test"
import { cleanup, render, screen } from "@testing-library/react"

mock.module("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode
    href: string
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

mock.module("@/components/ui/optimized-image", () => ({
  OptimizedImage: ({
    alt,
    className,
  }: {
    alt: string
    className?: string
  // eslint-disable-next-line @next/next/no-img-element
  }) => <img alt={alt} className={className} />,
}))

mock.module("@/components/hackathon/registration-button", () => ({
  RegistrationButton: () => null,
}))

mock.module("@/components/hackathon/submission-button", () => ({
  SubmissionButton: () => null,
}))

mock.module("@/components/hackathon/countdown-badge", () => ({
  CountdownBadge: () => null,
}))

const { EventHero } = await import("@/components/hackathon/event-hero")

afterEach(() => {
  cleanup()
})

describe("EventHero", () => {
  it("keeps long in-person locations left-aligned without shrinking the icon", () => {
    const { container } = render(
      <EventHero
        name="DevOps for GenAI Hackathon"
        bannerUrl={null}
        status="draft"
        startsAt="2026-06-08T13:00:00Z"
        endsAt="2026-06-08T23:00:00Z"
        organizer={{ name: "Your Organization", slug: null, logo_url: null, logo_url_dark: null }}
        locationType="in_person"
        locationName="Invest Ottawa (7 Bayview Station Road, Ottawa, ON K1Y 2C5, Ottawa, ON)"
      />
    )

    const locationText = screen.getByText(
      "Invest Ottawa (7 Bayview Station Road, Ottawa, ON K1Y 2C5, Ottawa, ON)"
    )
    expect(locationText.className).toContain("text-left")
    expect(locationText.className).toContain("break-words")

    const locationRow = locationText.parentElement
    const icon = locationRow?.querySelector("svg") ?? container.querySelector("svg")
    expect(icon?.className.baseVal ?? icon?.getAttribute("class")).toContain("shrink-0")
  })
})
