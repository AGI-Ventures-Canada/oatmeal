import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test"
import { render, screen, cleanup } from "@testing-library/react"
import { ApiKeyTable } from "@/components/dashboard/api-key-table"
import type { ApiKeyDisplay } from "@/lib/types/dashboard"

const mockPush = mock(() => {})
const mockRefresh = mock(() => {})

mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    replace: mock(() => {}),
    prefetch: mock(() => {}),
  }),
  redirect: mock(() => {}),
  notFound: mock(() => {}),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

afterEach(() => {
  cleanup()
})

const mockKeys: ApiKeyDisplay[] = [
  {
    id: "key-1",
    name: "Production Key",
    prefix: "sk_live_abc123",
    scopes: ["jobs:create", "jobs:read"],
    createdAt: "2024-01-01T00:00:00Z",
    lastUsedAt: "2024-01-15T12:00:00Z",
    revokedAt: null,
  },
  {
    id: "key-2",
    name: "Test Key",
    prefix: "sk_live_xyz789",
    scopes: ["jobs:read"],
    createdAt: "2024-01-05T00:00:00Z",
    lastUsedAt: null,
    revokedAt: null,
  },
  {
    id: "key-3",
    name: "Old Key",
    prefix: "sk_live_old",
    scopes: ["jobs:create"],
    createdAt: "2023-12-01T00:00:00Z",
    lastUsedAt: "2024-01-01T00:00:00Z",
    revokedAt: "2024-01-10T00:00:00Z",
  },
]

describe("ApiKeyTable", () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockRefresh.mockClear()
  })

  it("renders empty state when no keys", () => {
    render(<ApiKeyTable keys={[]} />)
    expect(screen.getByText("No API keys yet. Create one to get started.")).toBeDefined()
  })

  it("renders table headers", () => {
    render(<ApiKeyTable keys={mockKeys} />)
    expect(screen.getByText("Name")).toBeDefined()
    expect(screen.getByText("Prefix")).toBeDefined()
    expect(screen.getByText("Scopes")).toBeDefined()
    expect(screen.getByText("Created")).toBeDefined()
    expect(screen.getByText("Last Used")).toBeDefined()
    expect(screen.getByText("Status")).toBeDefined()
  })

  it("renders key data", () => {
    render(<ApiKeyTable keys={mockKeys} />)
    expect(screen.getByText("Production Key")).toBeDefined()
    expect(screen.getByText("sk_live_abc123...")).toBeDefined()
  })

  it("renders scopes as badges", () => {
    render(<ApiKeyTable keys={mockKeys} />)
    const createBadges = screen.getAllByText("jobs:create")
    const readBadges = screen.getAllByText("jobs:read")
    expect(createBadges.length).toBeGreaterThan(0)
    expect(readBadges.length).toBeGreaterThan(0)
  })

  it("shows Never for keys without last used date", () => {
    render(<ApiKeyTable keys={mockKeys} />)
    expect(screen.getByText("Never")).toBeDefined()
  })

  it("shows Active badge for active keys", () => {
    render(<ApiKeyTable keys={mockKeys} />)
    const activeBadges = screen.getAllByText("Active")
    expect(activeBadges.length).toBe(2)
  })

  it("shows Revoked badge for revoked keys", () => {
    render(<ApiKeyTable keys={mockKeys} />)
    expect(screen.getByText("Revoked")).toBeDefined()
  })

  it("shows action menu for active keys only", () => {
    render(<ApiKeyTable keys={mockKeys} />)
    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBe(2)
  })

  it("renders dropdown menu triggers for active keys", () => {
    render(<ApiKeyTable keys={mockKeys} />)
    const menuButtons = screen.getAllByRole("button")
    expect(menuButtons.length).toBe(2)
  })
})
