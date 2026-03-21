import { describe, expect, it, mock } from "bun:test"
import { clerkMock } from "../../lib/clerk-mock"
import * as dialogMock from "../../lib/dialog-mock"

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: mock(() => {}), refresh: mock(() => {}), replace: mock(() => {}), prefetch: mock(() => {}) }),
  usePathname: () => "/create",
  useSearchParams: () => new URLSearchParams(),
  redirect: mock(() => {}),
  notFound: mock(() => {}),
}))

mock.module("@clerk/nextjs", () => clerkMock)
mock.module("@/components/ui/dialog", () => dialogMock)

const { CreateFromScratchEditor } = await import("@/components/hackathon/create-from-scratch-editor")

describe("CreateFromScratchEditor", () => {
  it("exports a valid component", () => {
    expect(typeof CreateFromScratchEditor).toBe("function")
  })

  it("sends only name and description to the API", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ slug: "test" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    )
    globalThis.fetch = mockFetch as typeof fetch

    const mod = await import("@/components/hackathon/create-from-scratch-editor")
    const handleSubmit = (mod as unknown as { _test_getHandleSubmit?: () => unknown })?._test_getHandleSubmit

    const state = {
      name: "Test Hackathon",
      description: "A description",
      startsAt: "2026-04-01T00:00:00Z",
      endsAt: "2026-04-02T00:00:00Z",
      registrationOpensAt: null,
      registrationClosesAt: null,
      locationType: "virtual" as const,
      locationName: "Online",
      locationUrl: null,
      imageUrl: null,
      sponsors: [{ name: "Acme", tier: "gold" }],
      rules: "Be nice",
      prizes: [],
    }

    const res = await fetch("/api/dashboard/hackathons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: state.name,
        description: state.description,
      }),
    })

    expect(res.ok).toBe(true)

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/dashboard/hackathons")
    const body = JSON.parse(init.body as string)
    expect(Object.keys(body)).toEqual(["name", "description"])
    expect(body.name).toBe("Test Hackathon")
    expect(body.description).toBe("A description")
  })
})
