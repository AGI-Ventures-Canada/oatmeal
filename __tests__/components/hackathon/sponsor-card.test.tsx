import { afterEach, describe, expect, it, mock } from "bun:test"
import { cleanup, render, screen } from "@testing-library/react"

mock.module("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    target?: string
    rel?: string
    title?: string
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const { SponsorCard } = await import("@/components/hackathon/sponsor-card")

afterEach(() => {
  cleanup()
})

describe("SponsorCard", () => {
  it("uses org branding when use_org_assets is enabled", () => {
    const { container } = render(
      <SponsorCard
        sponsor={{
          id: "s1",
          hackathon_id: "h1",
          sponsor_tenant_id: "org-1",
          tenant_sponsor_id: null,
          use_org_assets: true,
          name: "Manual Name",
          logo_url: "https://cdn.example.com/manual-light.png",
          logo_url_dark: "https://cdn.example.com/manual-dark.png",
          website_url: "https://manual.example.com",
          tier: "gold",
          display_order: 0,
          created_at: "2026-03-19T00:00:00.000Z",
          tenant: {
            slug: "org-slug",
            name: "Org Name",
            logo_url: "https://cdn.example.com/org-light.png",
            logo_url_dark: "https://cdn.example.com/org-dark.png",
            website_url: "https://org.example.com",
            description: "Org description",
          },
        }}
      />,
    )

    expect(screen.getByRole("link").getAttribute("href")).toBe("/o/org-slug")
    expect(container.innerHTML).toContain("https://cdn.example.com/org-light.png")
    expect(container.innerHTML).not.toContain("https://cdn.example.com/manual-light.png")
  })

  it("uses manual branding when use_org_assets is disabled", () => {
    const { container } = render(
      <SponsorCard
        sponsor={{
          id: "s1",
          hackathon_id: "h1",
          sponsor_tenant_id: "org-1",
          tenant_sponsor_id: null,
          use_org_assets: false,
          name: "Manual Name",
          logo_url: "https://cdn.example.com/manual-light.png",
          logo_url_dark: "https://cdn.example.com/manual-dark.png",
          website_url: "https://manual.example.com",
          tier: "gold",
          display_order: 0,
          created_at: "2026-03-19T00:00:00.000Z",
          tenant: {
            slug: "org-slug",
            name: "Org Name",
            logo_url: "https://cdn.example.com/org-light.png",
            logo_url_dark: "https://cdn.example.com/org-dark.png",
            website_url: "https://org.example.com",
            description: "Org description",
          },
        }}
      />,
    )

    expect(screen.getByRole("link").getAttribute("href")).toBe(
      "https://manual.example.com",
    )
    expect(container.innerHTML).toContain("https://cdn.example.com/manual-light.png")
    expect(container.innerHTML).not.toContain("https://cdn.example.com/org-light.png")
  })
})
