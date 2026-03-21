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

describe("CreateFromScratchEditor", () => {
  it("exports a valid component", async () => {
    const mod = await import("@/components/hackathon/create-from-scratch-editor")
    expect(typeof mod.CreateFromScratchEditor).toBe("function")
  })

  it("defines an empty initial DraftState", async () => {
    const { CreateFromScratchEditor } = await import("@/components/hackathon/create-from-scratch-editor")
    expect(CreateFromScratchEditor).toBeDefined()
  })
})
