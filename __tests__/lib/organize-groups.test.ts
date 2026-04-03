import { describe, it, expect } from "bun:test"
import { groupOrganizedHackathons, GROUP_ORDER, hasUrgencySignals } from "@/lib/utils/organize-groups"
import type { HackathonStatus } from "@/lib/db/hackathon-types"
import type { HackathonMiniStats } from "@/lib/services/organizer-dashboard"

function makeHackathon(id: string, status: HackathonStatus, opts?: { starts_at?: string; ends_at?: string }) {
  return {
    id,
    status,
    starts_at: opts?.starts_at ?? null,
    ends_at: opts?.ends_at ?? null,
  }
}

function makeStats(hackathonId: string, overrides?: Partial<HackathonMiniStats>): [string, HackathonMiniStats] {
  return [
    hackathonId,
    {
      hackathonId,
      participantCount: 0,
      teamCount: 0,
      submissionCount: 0,
      judgingComplete: 0,
      judgingTotal: 0,
      openMentorRequests: 0,
      ...overrides,
    },
  ]
}

describe("groupOrganizedHackathons", () => {
  it("groups by status correctly", () => {
    const hackathons = [
      makeHackathon("1", "draft"),
      makeHackathon("2", "published"),
      makeHackathon("3", "active"),
      makeHackathon("4", "judging"),
      makeHackathon("5", "completed"),
      makeHackathon("6", "archived"),
      makeHackathon("7", "registration_open"),
    ]
    const statsMap = new Map<string, HackathonMiniStats>()

    const groups = groupOrganizedHackathons(hackathons, statsMap)

    expect(groups.setup.map((h) => h.id)).toEqual(["1"])
    expect(groups.upcoming.map((h) => h.id).sort()).toEqual(["2", "7"])
    expect(groups.active.map((h) => h.id).sort()).toEqual(["3", "4"])
    expect(groups.past.map((h) => h.id).sort()).toEqual(["5", "6"])
  })

  it("sorts active events by urgency (mentor requests first)", () => {
    const hackathons = [
      makeHackathon("a", "active"),
      makeHackathon("b", "active"),
      makeHackathon("c", "judging"),
    ]
    const statsMap = new Map([
      makeStats("a", { openMentorRequests: 0 }),
      makeStats("b", { openMentorRequests: 5 }),
      makeStats("c", { openMentorRequests: 0, judgingTotal: 10, judgingComplete: 3 }),
    ])

    const groups = groupOrganizedHackathons(hackathons, statsMap)
    const activeIds = groups.active.map((h) => h.id)

    expect(activeIds[0]).toBe("b")
  })

  it("sorts upcoming events by start date ascending", () => {
    const hackathons = [
      makeHackathon("far", "published", { starts_at: "2026-06-01T00:00:00Z" }),
      makeHackathon("near", "published", { starts_at: "2026-04-15T00:00:00Z" }),
      makeHackathon("mid", "published", { starts_at: "2026-05-01T00:00:00Z" }),
    ]
    const statsMap = new Map<string, HackathonMiniStats>()

    const groups = groupOrganizedHackathons(hackathons, statsMap)
    const upcomingIds = groups.upcoming.map((h) => h.id)

    expect(upcomingIds).toEqual(["near", "mid", "far"])
  })

  it("sorts past events by end date descending", () => {
    const hackathons = [
      makeHackathon("old", "completed", { ends_at: "2026-01-01T00:00:00Z" }),
      makeHackathon("recent", "completed", { ends_at: "2026-03-01T00:00:00Z" }),
    ]
    const statsMap = new Map<string, HackathonMiniStats>()

    const groups = groupOrganizedHackathons(hackathons, statsMap)
    const pastIds = groups.past.map((h) => h.id)

    expect(pastIds).toEqual(["recent", "old"])
  })

  it("handles empty input", () => {
    const groups = groupOrganizedHackathons([], new Map())

    for (const group of GROUP_ORDER) {
      expect(groups[group]).toHaveLength(0)
    }
  })
})

describe("hasUrgencySignals", () => {
  it("returns true for open mentor requests", () => {
    const statsMap = new Map([makeStats("h1", { openMentorRequests: 2 })])
    expect(hasUrgencySignals("h1", statsMap)).toBe(true)
  })

  it("returns true for incomplete judging", () => {
    const statsMap = new Map([makeStats("h1", { judgingTotal: 10, judgingComplete: 5 })])
    expect(hasUrgencySignals("h1", statsMap)).toBe(true)
  })

  it("returns false when everything is fine", () => {
    const statsMap = new Map([makeStats("h1", { judgingTotal: 10, judgingComplete: 10 })])
    expect(hasUrgencySignals("h1", statsMap)).toBe(false)
  })

  it("returns false for unknown hackathon", () => {
    expect(hasUrgencySignals("unknown", new Map())).toBe(false)
  })
})
