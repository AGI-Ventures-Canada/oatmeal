import { describe, it, expect } from "bun:test"
import { getOrganizerActionItems } from "@/lib/utils/organizer-actions"
import type { HackathonStatus, HackathonPhase } from "@/lib/db/hackathon-types"

function makeInput(overrides: Partial<Parameters<typeof getOrganizerActionItems>[0]> = {}) {
  return {
    status: "draft" as HackathonStatus,
    phase: null as HackathonPhase | null,
    submissionCount: 0,
    participantCount: 0,
    teamCount: 0,
    judgingProgress: { totalAssignments: 0, completedAssignments: 0 },
    judgeCount: 0,
    prizeCount: 0,
    judgeDisplayCount: 0,
    mentorQueue: { open: 0 },
    challengeReleased: false,
    challengeExists: false,
    challengeReleaseTime: null,
    resultsPublishedAt: null,
    winnerEmailsSentAt: null,
    description: null,
    bannerUrl: null,
    startsAt: null,
    endsAt: null,
    ...overrides,
  }
}

describe("getOrganizerActionItems", () => {
  describe("draft status", () => {
    it("returns action items for a bare draft hackathon", () => {
      const items = getOrganizerActionItems(makeInput())
      const ids = items.map((i) => i.id)

      expect(ids).toContain("no-description")
      expect(ids).toContain("no-dates")
      expect(ids).toContain("default-schedule")
      expect(ids).toContain("create-challenge")
      expect(ids).toContain("no-prizes")
      expect(ids).toContain("no-judges")
      expect(ids).toContain("no-banner")
    })

    it("omits setup items that are already set up", () => {
      const items = getOrganizerActionItems(makeInput({
        description: "A hackathon",
        bannerUrl: "https://example.com/banner.png",
        startsAt: "2026-05-01T00:00:00Z",
        endsAt: "2026-05-02T00:00:00Z",
        prizeCount: 2,
        judgeDisplayCount: 5,
        challengeExists: true,
        challengeReleased: true,
      }))
      const ids = items.map((i) => i.id)

      expect(ids).toContain("default-schedule")
      expect(ids).not.toContain("no-description")
      expect(ids).not.toContain("no-dates")
      expect(ids).not.toContain("create-challenge")
      expect(ids).not.toContain("release-challenge")
    })

    it("marks missing dates as urgent", () => {
      const items = getOrganizerActionItems(makeInput())
      const dateItem = items.find((i) => i.id === "no-dates")

      expect(dateItem?.severity).toBe("urgent")
      expect(dateItem?.hint).toBe("Required before you can publish")
    })

    it("includes hint text on all draft action items", () => {
      const items = getOrganizerActionItems(makeInput())
      for (const item of items) {
        expect(typeof item.hint).toBe("string")
        expect(item.hint!.length).toBeGreaterThan(0)
      }
    })

    it("links action items to correct tabs", () => {
      const items = getOrganizerActionItems(makeInput())

      expect(items.find((i) => i.id === "no-description")?.tab).toBe("edit")
      expect(items.find((i) => i.id === "no-prizes")?.tab).toBe("judging")
      expect(items.find((i) => i.id === "no-judges")?.tab).toBe("judging")
    })
  })

  describe("published status", () => {
    it("warns about zero registrations with hint", () => {
      const items = getOrganizerActionItems(makeInput({
        status: "published",
        participantCount: 0,
        judgeDisplayCount: 2,
        prizeCount: 1,
      }))
      const item = items.find((i) => i.id === "no-registrations")

      expect(item).toBeDefined()
      expect(item?.hint).toBe("Share the event link or invite captains by email")
      expect(item?.tab).toBe("teams")
    })

    it("shows starting soon when event starts within 24 hours", () => {
      const soon = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
      const items = getOrganizerActionItems(makeInput({
        status: "published",
        participantCount: 10,
        judgeDisplayCount: 2,
        prizeCount: 1,
        startsAt: soon,
      }))

      expect(items.find((i) => i.id === "starting-soon")).toBeDefined()
    })

    it("does not show starting soon for distant events", () => {
      const far = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const items = getOrganizerActionItems(makeInput({
        status: "published",
        participantCount: 10,
        judgeDisplayCount: 2,
        prizeCount: 1,
        startsAt: far,
      }))

      expect(items.find((i) => i.id === "starting-soon")).toBeUndefined()
    })
  })

  describe("active status", () => {
    it("flags unreleased challenge as urgent with hint", () => {
      const items = getOrganizerActionItems(makeInput({
        status: "active",
        challengeReleased: false,
        challengeExists: false,
        judgeCount: 2,
      }))

      const item = items.find((i) => i.id === "create-challenge")
      expect(item).toBeDefined()
      expect(item?.severity).toBe("urgent")
      expect(item?.hint).toBe("Participants need to know what to build")
    })

    it("shows release action when challenge exists but not released", () => {
      const items = getOrganizerActionItems(makeInput({
        status: "active",
        challengeReleased: false,
        challengeExists: true,
        challengeReleaseTime: "2026-05-01T09:00:00Z",
        judgeCount: 2,
      }))

      const item = items.find((i) => i.id === "release-challenge")
      expect(item).toBeDefined()
      expect(item?.severity).toBe("urgent")
      expect(item?.action).toBe("release-challenge")
    })

    it("shows pending mentor requests", () => {
      const items = getOrganizerActionItems(makeInput({
        status: "active",
        challengeReleased: true,
        judgeCount: 2,
        mentorQueue: { open: 3 },
      }))

      const item = items.find((i) => i.id === "mentor-requests")
      expect(item).toBeDefined()
      expect(item?.label).toContain("3")
    })

    it("returns empty when everything is set up", () => {
      const items = getOrganizerActionItems(makeInput({
        status: "active",
        challengeReleased: true,
        challengeExists: true,
        judgeCount: 5,
        mentorQueue: { open: 0 },
        submissionCount: 10,
      }))

      expect(items).toHaveLength(0)
    })
  })

  describe("judging status", () => {
    it("shows judging progress percentage", () => {
      const items = getOrganizerActionItems(makeInput({
        status: "judging",
        judgeCount: 3,
        judgingProgress: { totalAssignments: 20, completedAssignments: 12 },
      }))

      const item = items.find((i) => i.id === "judging-incomplete")
      expect(item).toBeDefined()
      expect(item?.label).toContain("60%")
      expect(item?.label).toContain("12/20")
    })

    it("marks low judging progress as warning", () => {
      const items = getOrganizerActionItems(makeInput({
        status: "judging",
        judgeCount: 3,
        judgingProgress: { totalAssignments: 20, completedAssignments: 5 },
      }))

      const item = items.find((i) => i.id === "judging-incomplete")
      expect(item?.severity).toBe("warning")
    })
  })

  describe("completed status", () => {
    it("flags unpublished results as urgent with hint", () => {
      const items = getOrganizerActionItems(makeInput({
        status: "completed",
        resultsPublishedAt: null,
      }))

      const item = items.find((i) => i.id === "results-not-published")
      expect(item).toBeDefined()
      expect(item?.severity).toBe("urgent")
      expect(item?.hint).toBe("Review scores and publish")
    })

    it("flags unsent winner emails with hint", () => {
      const items = getOrganizerActionItems(makeInput({
        status: "completed",
        resultsPublishedAt: "2026-04-01T00:00:00Z",
        winnerEmailsSentAt: null,
      }))

      const item = items.find((i) => i.id === "winner-emails-not-sent")
      expect(item).toBeDefined()
      expect(item?.severity).toBe("warning")
      expect(item?.hint).toBe("Let winners know they've been selected")
    })

    it("returns empty when everything is done", () => {
      const items = getOrganizerActionItems(makeInput({
        status: "completed",
        resultsPublishedAt: "2026-04-01T00:00:00Z",
        winnerEmailsSentAt: "2026-04-01T01:00:00Z",
      }))

      expect(items).toHaveLength(0)
    })
  })

  describe("archived status", () => {
    it("returns no action items", () => {
      const items = getOrganizerActionItems(makeInput({ status: "archived" }))

      expect(items).toHaveLength(0)
    })
  })
})
