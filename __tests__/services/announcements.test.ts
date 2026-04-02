import { describe, it, expect, beforeEach } from "bun:test"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
} from "../lib/supabase-mock"

const {
  listAnnouncements,
  listPublishedAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  publishAnnouncement,
  unpublishAnnouncement,
} = await import("@/lib/services/announcements")

const HACKATHON_ID = "11111111-1111-1111-1111-111111111111"
const ANNOUNCEMENT_ID = "22222222-2222-2222-2222-222222222222"

describe("listAnnouncements", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  it("returns announcements ordered by created_at desc", async () => {
    setMockFromImplementation(() =>
      createChainableMock({
        data: [
          { id: "a1", hackathon_id: HACKATHON_ID, title: "First", body: "Body 1", priority: "normal", published_at: null, created_at: "2026-01-02", updated_at: "2026-01-02" },
          { id: "a2", hackathon_id: HACKATHON_ID, title: "Second", body: "Body 2", priority: "urgent", published_at: "2026-01-01", created_at: "2026-01-01", updated_at: "2026-01-01" },
        ],
        error: null,
      })
    )

    const result = await listAnnouncements(HACKATHON_ID)
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe("First")
  })

  it("returns empty array on error", async () => {
    setMockFromImplementation(() =>
      createChainableMock({ data: null, error: { message: "error" } })
    )
    const result = await listAnnouncements(HACKATHON_ID)
    expect(result).toEqual([])
  })
})

describe("listPublishedAnnouncements", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  it("returns only published announcements", async () => {
    setMockFromImplementation(() =>
      createChainableMock({
        data: [
          { id: "a1", hackathon_id: HACKATHON_ID, title: "Published", body: "Body", priority: "normal", published_at: "2026-01-01", created_at: "2026-01-01", updated_at: "2026-01-01" },
        ],
        error: null,
      })
    )

    const result = await listPublishedAnnouncements(HACKATHON_ID)
    expect(result).toHaveLength(1)
    expect(result[0].published_at).not.toBeNull()
  })
})

describe("createAnnouncement", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  it("creates an announcement with defaults", async () => {
    setMockFromImplementation(() =>
      createChainableMock({
        data: { id: ANNOUNCEMENT_ID, hackathon_id: HACKATHON_ID, title: "New", body: "Content", priority: "normal", published_at: null, created_at: "2026-01-01", updated_at: "2026-01-01" },
        error: null,
      })
    )

    const result = await createAnnouncement(HACKATHON_ID, { title: "New", body: "Content" })
    expect(result).not.toBeNull()
    expect(result!.title).toBe("New")
    expect(result!.priority).toBe("normal")
  })

  it("returns null on error", async () => {
    setMockFromImplementation(() =>
      createChainableMock({ data: null, error: { message: "error" } })
    )
    const result = await createAnnouncement(HACKATHON_ID, { title: "New", body: "Content" })
    expect(result).toBeNull()
  })
})

describe("updateAnnouncement", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  it("updates specified fields", async () => {
    setMockFromImplementation(() =>
      createChainableMock({
        data: { id: ANNOUNCEMENT_ID, hackathon_id: HACKATHON_ID, title: "Updated", body: "Content", priority: "urgent", published_at: null, created_at: "2026-01-01", updated_at: "2026-01-02" },
        error: null,
      })
    )

    const result = await updateAnnouncement(ANNOUNCEMENT_ID, HACKATHON_ID, { title: "Updated", priority: "urgent" })
    expect(result).not.toBeNull()
    expect(result!.title).toBe("Updated")
    expect(result!.priority).toBe("urgent")
  })

  it("returns null on error", async () => {
    setMockFromImplementation(() =>
      createChainableMock({ data: null, error: { message: "error" } })
    )
    const result = await updateAnnouncement(ANNOUNCEMENT_ID, HACKATHON_ID, { title: "Updated" })
    expect(result).toBeNull()
  })
})

describe("deleteAnnouncement", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  it("returns true on success", async () => {
    setMockFromImplementation(() =>
      createChainableMock({ data: null, error: null })
    )
    const result = await deleteAnnouncement(ANNOUNCEMENT_ID, HACKATHON_ID)
    expect(result).toBe(true)
  })

  it("returns false on error", async () => {
    setMockFromImplementation(() =>
      createChainableMock({ data: null, error: { message: "error" } })
    )
    const result = await deleteAnnouncement(ANNOUNCEMENT_ID, HACKATHON_ID)
    expect(result).toBe(false)
  })
})

describe("publishAnnouncement", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  it("sets published_at timestamp", async () => {
    setMockFromImplementation(() =>
      createChainableMock({
        data: { id: ANNOUNCEMENT_ID, hackathon_id: HACKATHON_ID, title: "Title", body: "Body", priority: "normal", published_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01", updated_at: "2026-01-01" },
        error: null,
      })
    )

    const result = await publishAnnouncement(ANNOUNCEMENT_ID, HACKATHON_ID)
    expect(result).not.toBeNull()
    expect(result!.published_at).not.toBeNull()
  })

  it("returns null on error", async () => {
    setMockFromImplementation(() =>
      createChainableMock({ data: null, error: { message: "error" } })
    )
    const result = await publishAnnouncement(ANNOUNCEMENT_ID, HACKATHON_ID)
    expect(result).toBeNull()
  })
})

describe("unpublishAnnouncement", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  it("clears published_at", async () => {
    setMockFromImplementation(() =>
      createChainableMock({
        data: { id: ANNOUNCEMENT_ID, hackathon_id: HACKATHON_ID, title: "Title", body: "Body", priority: "normal", published_at: null, created_at: "2026-01-01", updated_at: "2026-01-01" },
        error: null,
      })
    )

    const result = await unpublishAnnouncement(ANNOUNCEMENT_ID, HACKATHON_ID)
    expect(result).not.toBeNull()
    expect(result!.published_at).toBeNull()
  })
})
