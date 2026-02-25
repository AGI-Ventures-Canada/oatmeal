import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test"
import { render, screen, cleanup } from "@testing-library/react"

const storage = new Map<string, string>()
globalThis.localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
  get length() { return storage.size },
  key: () => null,
} as Storage

const mockPush = mock(() => {})

mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mock(() => {}),
    replace: mock(() => {}),
    prefetch: mock(() => {}),
  }),
  usePathname: () => "/luma.com/sfagents",
}))

mock.module("@clerk/nextjs", () => ({
  useAuth: () => ({ isSignedIn: true, orgId: "org-1" }),
  useOrganization: () => ({ organization: { id: "org-1" } }),
}))

const { LumaImportForm } = await import("@/components/hackathon/luma-import-form")

const mockEventData = {
  name: "Test Hackathon",
  description: "A test event description",
  startsAt: "2026-03-15T09:00:00.000-08:00",
  endsAt: "2026-03-16T17:00:00.000-08:00",
  locationType: "in_person" as const,
  locationName: "San Francisco, California",
  locationUrl: null,
  imageUrl: "https://images.lumacdn.com/test.png",
}

afterEach(() => {
  cleanup()
})

describe("LumaImportForm", () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it("renders prefilled form with event data", () => {
    render(<LumaImportForm eventData={mockEventData} lumaSlug="sfagents" />)
    expect(screen.getByDisplayValue("Test Hackathon")).toBeDefined()
    expect(screen.getByText("Create Hackathon")).toBeDefined()
  })

  it("shows the Luma source attribution", () => {
    render(<LumaImportForm eventData={mockEventData} lumaSlug="sfagents" />)
    expect(screen.getByText(/Imported from/)).toBeDefined()
    expect(screen.getByText(/luma.com\/sfagents/)).toBeDefined()
  })

  it("renders event image preview when imageUrl provided", () => {
    render(<LumaImportForm eventData={mockEventData} lumaSlug="sfagents" />)
    const img = screen.getByRole("img")
    expect(img).toBeDefined()
  })

  it("renders without image when imageUrl is null", () => {
    const dataWithoutImage = { ...mockEventData, imageUrl: null }
    render(<LumaImportForm eventData={dataWithoutImage} lumaSlug="sfagents" />)
    expect(screen.queryByRole("img")).toBeNull()
    expect(screen.getByDisplayValue("Test Hackathon")).toBeDefined()
  })
})
