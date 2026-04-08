import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { resetComponentMocks, setRouter } from "../../lib/component-mocks";

const mockRefresh = mock(() => {});
const mockCloseDrawer = mock(() => {});
const mockFetch = mock((input: string | URL | Request, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

  if (url.includes("/api/dashboard/organizations/search")) {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          organizations: [
            {
              id: "org-google",
              name: "Google",
              slug: "google",
              logoUrl: "https://cdn.example.com/google-light.png",
              logoUrlDark: "https://cdn.example.com/google-dark.png",
              websiteUrl: "https://google.com",
              isSaved: false,
            },
            {
              id: "saved-google",
              name: "Google Saved",
              slug: null,
              logoUrl: null,
              logoUrlDark: null,
              websiteUrl: "https://saved.example.com",
              isSaved: true,
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
  }

  if (init?.method === "PATCH") {
    return Promise.resolve(
      new Response(JSON.stringify({ id: "s1", updatedAt: "2026-03-19T00:00:00.000Z" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  return Promise.resolve(
    new Response(JSON.stringify({ id: "noop" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
});


mock.module("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    target?: string;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

mock.module("@/components/hackathon/preview/edit-context", () => ({
  useEdit: () => ({
    closeDrawer: mockCloseDrawer,
  }),
  useEditOptional: () => ({
    closeDrawer: mockCloseDrawer,
  }),
  EditProvider: ({ children }: { children: React.ReactNode }) => children,
  SECTION_ORDER: ["name", "dates", "location", "sponsors", "judges", "prizes", "timeline", "about", "rules"],
}));

mock.module("@/components/ui/optimized-image", () => ({
  OptimizedImage: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
  }) => <div role="img" aria-label={alt} data-src={src} {...props} />,
}));

mock.module("@/components/hackathon/edit-drawer/sponsor-logo-upload", () => ({
  SponsorLogoUpload: () => <div data-testid="sponsor-logo-upload" />,
}));

mock.module("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode; value: string }) => <div>{children}</div>,
}));

mock.module("@/components/ui/kbd", () => ({
  Kbd: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  KbdGroup: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const { SponsorsEditForm } = await import("@/components/hackathon/edit-drawer/sponsors-edit-form");

beforeEach(() => {
  resetComponentMocks();
  setRouter({ refresh: mockRefresh });
  mockRefresh.mockClear();
  mockCloseDrawer.mockClear();
  mockFetch.mockClear();
  globalThis.fetch = mockFetch as typeof fetch;
});

afterEach(() => {
  cleanup();
});

describe("SponsorsEditForm", () => {
  it("shows the link action only for manual sponsors", () => {
    render(
      <SponsorsEditForm
        hackathonId="h1"
        initialSponsors={[
          {
            id: "s1",
            hackathon_id: "h1",
            sponsor_tenant_id: null,
            tenant_sponsor_id: null,
            use_org_assets: false,
            name: "Manual Sponsor",
            logo_url: null,
            logo_url_dark: null,
            website_url: null,
            tier: "none",
            display_order: 0,
            created_at: "2026-03-19T00:00:00.000Z",
            tenant: null,
          },
          {
            id: "s2",
            hackathon_id: "h1",
            sponsor_tenant_id: "org-1",
            tenant_sponsor_id: null,
            use_org_assets: true,
            name: "Linked Sponsor",
            logo_url: null,
            logo_url_dark: null,
            website_url: "https://linked.example.com",
            tier: "gold",
            display_order: 1,
            created_at: "2026-03-19T00:00:00.000Z",
            tenant: {
              slug: "linked-sponsor",
              name: "Linked Sponsor",
              logo_url: "https://cdn.example.com/linked-light.png",
              logo_url_dark: "https://cdn.example.com/linked-dark.png",
            },
          },
        ]}
      />,
    );

    expect(screen.getAllByRole("button", { name: "Link to org" })).toHaveLength(1);
    expect(screen.getByText("Linked")).toBeDefined();
  });

  it("renders the full sponsor tier list for linked sponsors", () => {
    render(
      <SponsorsEditForm
        hackathonId="h1"
        initialSponsors={[
          {
            id: "s1",
            hackathon_id: "h1",
            sponsor_tenant_id: "org-1",
            tenant_sponsor_id: null,
            use_org_assets: true,
            name: "Linked Sponsor",
            logo_url: null,
            logo_url_dark: null,
            website_url: "https://linked.example.com",
            tier: "partner",
            display_order: 0,
            created_at: "2026-03-19T00:00:00.000Z",
            tenant: {
              slug: "linked-sponsor",
              name: "Linked Sponsor",
              logo_url: "https://cdn.example.com/linked-light.png",
              logo_url_dark: "https://cdn.example.com/linked-dark.png",
            },
          },
        ]}
      />,
    );

    expect(screen.getByText("Title")).toBeDefined();
    expect(screen.getByText("Partner")).toBeDefined();
  });

  it("lets a manual sponsor search for an org and saves the selected link", async () => {
    render(
      <SponsorsEditForm
        hackathonId="h1"
        initialSponsors={[
          {
            id: "s1",
            hackathon_id: "h1",
            sponsor_tenant_id: null,
            tenant_sponsor_id: null,
            use_org_assets: false,
            name: "Manual Sponsor",
            logo_url: null,
            logo_url_dark: null,
            website_url: null,
            tier: "none",
            display_order: 0,
            created_at: "2026-03-19T00:00:00.000Z",
            tenant: null,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Link to org" }));
    fireEvent.change(screen.getByPlaceholderText("Search organizations..."), {
      target: { value: "go" },
    });

    await waitFor(() => {
      expect(screen.getByText("Google")).toBeDefined();
    }, { timeout: 3000 });

    expect(screen.queryByText("Google Saved")).toBeNull();

    fireEvent.click(screen.getByText("Google"));

    await waitFor(() => {
      expect(screen.getByText("Linked")).toBeDefined();
      expect(screen.getByText("Save changes")).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      const patchCall = mockFetch.mock.calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url === "/api/dashboard/hackathons/h1/sponsors/s1" &&
          init?.method === "PATCH",
      );

      expect(patchCall).toBeDefined();
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(mockCloseDrawer).toHaveBeenCalledTimes(1);
    });

    const patchCall = mockFetch.mock.calls.find(
      ([url, init]) =>
        typeof url === "string" &&
        url === "/api/dashboard/hackathons/h1/sponsors/s1" &&
        init?.method === "PATCH",
    ) as [string, RequestInit];

    expect(JSON.parse(patchCall[1].body as string)).toEqual({
      sponsorTenantId: "org-google",
      useOrgAssets: false,
      websiteUrl: "https://google.com",
    });
  });
});
