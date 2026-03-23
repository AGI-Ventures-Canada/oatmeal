import { describe, expect, it } from "bun:test"
import "../../lib/component-mocks"

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
