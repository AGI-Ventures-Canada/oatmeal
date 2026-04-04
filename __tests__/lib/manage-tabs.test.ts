import { describe, expect, it } from "bun:test"
import {
  VALID_TABS,
  VALID_JTABS,
  VALID_PTABS,
  VALID_ETABS,
  DEFAULT_TAB,
  resolveTab,
  getJudgingRedirectUrl,
} from "@/lib/utils/manage-tabs"

describe("VALID_TABS", () => {
  it("contains all manage tabs", () => {
    expect(VALID_TABS).toContain("overview")
    expect(VALID_TABS).toContain("edit")
    expect(VALID_TABS).toContain("teams")
    expect(VALID_TABS).toContain("rooms")
    expect(VALID_TABS).toContain("submissions")
    expect(VALID_TABS).toContain("judges")
    expect(VALID_TABS).toContain("prizes")
    expect(VALID_TABS).toContain("event")
    expect(VALID_TABS).toContain("activity")
    expect(VALID_TABS).toHaveLength(9)
  })
})

describe("VALID_JTABS", () => {
  it("contains criteria, assignments, progress", () => {
    expect(VALID_JTABS).toContain("criteria")
    expect(VALID_JTABS).toContain("assignments")
    expect(VALID_JTABS).toContain("progress")
    expect(VALID_JTABS).toHaveLength(3)
  })
})

describe("VALID_PTABS", () => {
  it("contains prizes and results", () => {
    expect(VALID_PTABS).toContain("prizes")
    expect(VALID_PTABS).toContain("results")
    expect(VALID_PTABS).toContain("fulfillment")
    expect(VALID_PTABS).toHaveLength(3)
  })
})

describe("VALID_ETABS", () => {
  it("contains challenge, announcements, schedule, mentors, social, email", () => {
    expect(VALID_ETABS).toContain("challenge")
    expect(VALID_ETABS).toContain("announcements")
    expect(VALID_ETABS).toContain("schedule")
    expect(VALID_ETABS).toContain("mentors")
    expect(VALID_ETABS).toContain("social")
    expect(VALID_ETABS).toContain("email")
    expect(VALID_ETABS).toHaveLength(6)
  })
})

describe("DEFAULT_TAB", () => {
  it("is overview", () => {
    expect(DEFAULT_TAB).toBe("overview")
  })
})

describe("resolveTab", () => {
  it("returns the tab if it is valid", () => {
    expect(resolveTab("judges", VALID_TABS, "edit")).toBe("judges")
  })

  it("returns fallback for an invalid tab", () => {
    expect(resolveTab("unknown", VALID_TABS, "edit")).toBe("edit")
  })

  it("returns fallback when tab is undefined", () => {
    expect(resolveTab(undefined, VALID_TABS, "edit")).toBe("edit")
  })

  it("returns fallback when tab is empty string", () => {
    expect(resolveTab("", VALID_TABS, "edit")).toBe("edit")
  })
})

describe("getJudgingRedirectUrl", () => {
  it("redirects to prizes tab when tab=prizes", () => {
    expect(getJudgingRedirectUrl("my-hackathon", "prizes")).toBe(
      "/e/my-hackathon/manage?tab=prizes"
    )
  })

  it("redirects to judges tab with jtab=criteria", () => {
    expect(getJudgingRedirectUrl("my-hackathon", "criteria")).toBe(
      "/e/my-hackathon/manage?tab=judges&jtab=criteria"
    )
  })

  it("redirects to judges tab with jtab=assignments", () => {
    expect(getJudgingRedirectUrl("my-hackathon", "assignments")).toBe(
      "/e/my-hackathon/manage?tab=judges&jtab=assignments"
    )
  })

  it("redirects to judges tab with jtab=progress", () => {
    expect(getJudgingRedirectUrl("my-hackathon", "progress")).toBe(
      "/e/my-hackathon/manage?tab=judges&jtab=progress"
    )
  })

  it("redirects to default judges tab when no tab param", () => {
    expect(getJudgingRedirectUrl("my-hackathon", undefined)).toBe(
      "/e/my-hackathon/manage?tab=judges"
    )
  })

  it("redirects to default judges tab for unrecognized tab", () => {
    expect(getJudgingRedirectUrl("my-hackathon", "results")).toBe(
      "/e/my-hackathon/manage?tab=judges"
    )
  })

  it("handles slugs with special characters", () => {
    expect(getJudgingRedirectUrl("hack-2026", "criteria")).toBe(
      "/e/hack-2026/manage?tab=judges&jtab=criteria"
    )
  })
})
