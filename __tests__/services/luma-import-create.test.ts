import { describe, it, expect, beforeEach, mock } from "bun:test"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
} from "../lib/supabase-mock"

const mockDownloadAndUploadBanner = mock(() => Promise.resolve(null))
mock.module("@/lib/services/storage", () => ({
  downloadAndUploadBanner: mockDownloadAndUploadBanner,
  uploadBanner: mock(() => Promise.resolve(null)),
  optimizeBanner: mock(() => Promise.resolve({ buffer: Buffer.from(""), mimeType: "image/webp" })),
}))

const mockCreatePrize = mock(() => Promise.resolve({ id: "p1", hackathon_id: "h1", name: "Test", description: null, value: null, display_order: 0, created_at: "" }))
mock.module("@/lib/services/prizes", () => ({
  createPrize: mockCreatePrize,
  listPrizes: mock(() => Promise.resolve([])),
  updatePrize: mock(() => Promise.resolve(null)),
  deletePrize: mock(() => Promise.resolve(true)),
}))

const { createHackathonFromImport, createPrizesFromImport } = await import("@/lib/services/luma-import-create")

describe("createHackathonFromImport", () => {
  beforeEach(() => {
    resetSupabaseMocks()
    mockDownloadAndUploadBanner.mockClear()
    mockCreatePrize.mockClear()
  })

  it("creates hackathon with all imported fields", async () => {
    const selectChain = createChainableMock({ data: null, error: null })
    const insertChain = createChainableMock({
      data: { id: "h1", name: "Test Hackathon", slug: "test-hackathon", tenant_id: "t1" },
      error: null,
    })
    const updateChain = createChainableMock({
      data: { id: "h1", updated_at: "2026-02-25" },
      error: null,
    })

    let callCount = 0
    setMockFromImplementation(() => {
      callCount++
      if (callCount === 1) return selectChain
      if (callCount === 2) return insertChain
      return updateChain
    })

    mockDownloadAndUploadBanner.mockResolvedValueOnce({
      url: "https://storage.supabase.com/banners/h1/banner.webp",
      path: "h1/banner.webp",
    })

    const result = await createHackathonFromImport("tenant-1", {
      name: "Test Hackathon",
      description: "A test event",
      startsAt: "2026-03-15T09:00:00.000-08:00",
      endsAt: "2026-03-16T17:00:00.000-08:00",
      locationType: "in_person",
      locationName: "San Francisco",
      locationUrl: null,
      imageUrl: "https://images.lumacdn.com/test.png",
    })

    expect(result).not.toBeNull()
    expect(result!.id).toBe("h1")
    expect(mockDownloadAndUploadBanner).toHaveBeenCalledWith("h1", "https://images.lumacdn.com/test.png")
  })

  it("creates hackathon even if banner download fails", async () => {
    const selectChain = createChainableMock({ data: null, error: null })
    const insertChain = createChainableMock({
      data: { id: "h2", name: "No Banner", slug: "no-banner", tenant_id: "t1" },
      error: null,
    })
    const updateChain = createChainableMock({
      data: { id: "h2", updated_at: "2026-02-25" },
      error: null,
    })

    let callCount = 0
    setMockFromImplementation(() => {
      callCount++
      if (callCount === 1) return selectChain
      if (callCount === 2) return insertChain
      return updateChain
    })

    mockDownloadAndUploadBanner.mockResolvedValueOnce(null)

    const result = await createHackathonFromImport("tenant-1", {
      name: "No Banner",
      description: null,
      startsAt: null,
      endsAt: null,
      locationType: null,
      locationName: null,
      locationUrl: null,
      imageUrl: null,
    })

    expect(result).not.toBeNull()
    expect(result!.id).toBe("h2")
  })

  it("returns null when hackathon creation fails", async () => {
    const selectChain = createChainableMock({ data: null, error: null })
    const insertChain = createChainableMock({
      data: null,
      error: { message: "Insert failed" },
    })

    let callCount = 0
    setMockFromImplementation(() => {
      callCount++
      if (callCount === 1) return selectChain
      return insertChain
    })

    const result = await createHackathonFromImport("tenant-1", {
      name: "Fail",
      description: null,
      startsAt: null,
      endsAt: null,
      locationType: null,
      locationName: null,
      locationUrl: null,
      imageUrl: null,
    })

    expect(result).toBeNull()
  })

  it("includes rules field in hackathon update", async () => {
    const selectChain = createChainableMock({ data: null, error: null })
    const insertChain = createChainableMock({
      data: { id: "h3", name: "With Rules", slug: "with-rules", tenant_id: "t1" },
      error: null,
    })
    const updateChain = createChainableMock({
      data: { id: "h3", updated_at: "2026-02-25" },
      error: null,
    })

    let callCount = 0
    setMockFromImplementation(() => {
      callCount++
      if (callCount === 1) return selectChain
      if (callCount === 2) return insertChain
      return updateChain
    })

    mockDownloadAndUploadBanner.mockResolvedValueOnce(null)

    const result = await createHackathonFromImport("tenant-1", {
      name: "With Rules",
      description: null,
      startsAt: null,
      endsAt: null,
      locationType: null,
      locationName: null,
      locationUrl: null,
      imageUrl: null,
      rules: "No plagiarism allowed.",
    })

    expect(result).not.toBeNull()
    expect(result!.id).toBe("h3")
  })
})

describe("createPrizesFromImport", () => {
  beforeEach(() => {
    mockCreatePrize.mockClear()
  })

  it("creates prizes with correct display order", async () => {
    await createPrizesFromImport("h1", [
      { name: "Grand Prize", description: "Top team", value: "$5,000" },
      { name: "Runner Up", description: null, value: "$2,500" },
      { name: "Best Design", description: "Most creative UI", value: null },
    ])

    expect(mockCreatePrize).toHaveBeenCalledTimes(3)
    expect(mockCreatePrize).toHaveBeenNthCalledWith(1, "h1", {
      name: "Grand Prize",
      description: "Top team",
      value: "$5,000",
      displayOrder: 0,
    })
    expect(mockCreatePrize).toHaveBeenNthCalledWith(2, "h1", {
      name: "Runner Up",
      description: null,
      value: "$2,500",
      displayOrder: 1,
    })
    expect(mockCreatePrize).toHaveBeenNthCalledWith(3, "h1", {
      name: "Best Design",
      description: "Most creative UI",
      value: null,
      displayOrder: 2,
    })
  })

  it("handles empty prizes array", async () => {
    await createPrizesFromImport("h1", [])

    expect(mockCreatePrize).not.toHaveBeenCalled()
  })

  it("defaults null description and value", async () => {
    await createPrizesFromImport("h1", [
      { name: "Participation Award" },
    ])

    expect(mockCreatePrize).toHaveBeenCalledWith("h1", {
      name: "Participation Award",
      description: null,
      value: null,
      displayOrder: 0,
    })
  })
})
