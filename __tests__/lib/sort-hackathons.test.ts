import { describe, it, expect } from "bun:test"
import { sortByStatusPriority } from "@/lib/utils/sort-hackathons"
import type { HackathonStatus } from "@/lib/db/hackathon-types"

function makeHackathon(overrides: {
  id: string
  status: HackathonStatus
  starts_at?: string | null
  ends_at?: string | null
  registration_opens_at?: string | null
  registration_closes_at?: string | null
}) {
  return {
    id: overrides.id,
    status: overrides.status,
    starts_at: overrides.starts_at ?? null,
    ends_at: overrides.ends_at ?? null,
    registration_opens_at: overrides.registration_opens_at ?? null,
    registration_closes_at: overrides.registration_closes_at ?? null,
  }
}

describe("sortByStatusPriority", () => {
  it("sorts live events before completed events", () => {
    const items = [
      makeHackathon({ id: "completed", status: "completed" }),
      makeHackathon({ id: "active", status: "active" }),
    ]

    const sorted = sortByStatusPriority(items)

    expect(sorted[0].id).toBe("active")
    expect(sorted[1].id).toBe("completed")
  })

  it("sorts by full status priority order", () => {
    const items = [
      makeHackathon({ id: "archived", status: "archived" }),
      makeHackathon({ id: "active", status: "active" }),
      makeHackathon({ id: "judging", status: "judging" }),
      makeHackathon({ id: "draft", status: "draft" }),
      makeHackathon({ id: "completed", status: "completed" }),
      makeHackathon({
        id: "reg-open",
        status: "registration_open",
        registration_opens_at: "2020-01-01T00:00:00Z",
        registration_closes_at: "2099-12-31T23:59:59Z",
      }),
    ]

    const sorted = sortByStatusPriority(items)

    expect(sorted.map((h) => h.id)).toEqual([
      "active",
      "judging",
      "reg-open",
      "draft",
      "completed",
      "archived",
    ])
  })

  it("sorts by starts_at within the same status", () => {
    const items = [
      makeHackathon({ id: "later", status: "active", starts_at: "2026-03-01T00:00:00Z" }),
      makeHackathon({ id: "earlier", status: "active", starts_at: "2026-02-01T00:00:00Z" }),
    ]

    const sorted = sortByStatusPriority(items)

    expect(sorted[0].id).toBe("earlier")
    expect(sorted[1].id).toBe("later")
  })

  it("places null starts_at last within the same status", () => {
    const items = [
      makeHackathon({ id: "no-date", status: "active", starts_at: null }),
      makeHackathon({ id: "has-date", status: "active", starts_at: "2026-02-01T00:00:00Z" }),
    ]

    const sorted = sortByStatusPriority(items)

    expect(sorted[0].id).toBe("has-date")
    expect(sorted[1].id).toBe("no-date")
  })

  it("handles both null starts_at in the same status", () => {
    const items = [
      makeHackathon({ id: "a", status: "draft", starts_at: null }),
      makeHackathon({ id: "b", status: "draft", starts_at: null }),
    ]

    const sorted = sortByStatusPriority(items)

    expect(sorted).toHaveLength(2)
  })

  it("does not mutate the input array", () => {
    const items = [
      makeHackathon({ id: "completed", status: "completed" }),
      makeHackathon({ id: "active", status: "active" }),
    ]

    const original = [...items]
    sortByStatusPriority(items)

    expect(items[0].id).toBe(original[0].id)
    expect(items[1].id).toBe(original[1].id)
  })

  it("returns empty array for empty input", () => {
    const sorted = sortByStatusPriority([])
    expect(sorted).toEqual([])
  })

  it("handles single item", () => {
    const items = [makeHackathon({ id: "only", status: "active" })]
    const sorted = sortByStatusPriority(items)
    expect(sorted).toHaveLength(1)
    expect(sorted[0].id).toBe("only")
  })
})
