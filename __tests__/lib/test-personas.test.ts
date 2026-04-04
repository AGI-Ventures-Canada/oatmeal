import { describe, it, expect, beforeEach, afterEach } from "bun:test"

const envVars: Record<string, string> = {
  SCENARIO_DEV_USER_ID: "user_organizer",
  TEST_USER_1_ID: "user_1",
  TEST_USER_2_ID: "user_2",
  TEST_USER_3_ID: "user_3",
  TEST_USER_4_ID: "user_4",
  TEST_USER_5_ID: "user_5",
}

const envKeys = Object.keys(envVars)

beforeEach(() => {
  for (const [k, v] of Object.entries(envVars)) {
    process.env[k] = v
  }
})

afterEach(() => {
  for (const k of envKeys) {
    delete process.env[k]
  }
})

describe("getPersonaUserId", () => {
  it("returns the env var value for a known persona", async () => {
    const { getPersonaUserId } = await import("@/lib/dev/test-personas")
    expect(getPersonaUserId("organizer")).toBe("user_organizer")
    expect(getPersonaUserId("user1")).toBe("user_1")
  })

  it("returns null when the env var is not set", async () => {
    delete process.env.TEST_USER_1_ID
    const { getPersonaUserId } = await import("@/lib/dev/test-personas")
    expect(getPersonaUserId("user1")).toBeNull()
  })
})

describe("getSeedUserIds", () => {
  it("returns IDs for all non-organizer personas that have env vars set", async () => {
    const { getSeedUserIds } = await import("@/lib/dev/test-personas")
    const ids = getSeedUserIds()
    expect(ids).toContain("user_1")
    expect(ids).toContain("user_2")
    expect(ids).toContain("user_3")
    expect(ids).toContain("user_4")
    expect(ids).toContain("user_5")
    expect(ids).not.toContain("user_organizer")
  })

  it("omits personas whose env var is not set", async () => {
    delete process.env.TEST_USER_2_ID
    delete process.env.TEST_USER_5_ID
    const { getSeedUserIds } = await import("@/lib/dev/test-personas")
    const ids = getSeedUserIds()
    expect(ids).not.toContain("user_2")
    expect(ids).not.toContain("user_5")
    expect(ids).toContain("user_1")
  })

  it("returns empty array when no seed env vars are set", async () => {
    for (const k of envKeys.filter((k) => k !== "SCENARIO_DEV_USER_ID")) {
      delete process.env[k]
    }
    const { getSeedUserIds } = await import("@/lib/dev/test-personas")
    expect(getSeedUserIds()).toEqual([])
  })
})

describe("findPersonaByUserId", () => {
  it("returns the matching persona for a known user ID", async () => {
    const { findPersonaByUserId } = await import("@/lib/dev/test-personas")
    const persona = findPersonaByUserId("user_1")
    expect(persona?.key).toBe("user1")
    expect(persona?.name).toBe("Test User 1")
  })

  it("returns the organizer persona", async () => {
    const { findPersonaByUserId } = await import("@/lib/dev/test-personas")
    const persona = findPersonaByUserId("user_organizer")
    expect(persona?.key).toBe("organizer")
  })

  it("returns undefined for an unknown user ID", async () => {
    const { findPersonaByUserId } = await import("@/lib/dev/test-personas")
    expect(findPersonaByUserId("user_unknown")).toBeUndefined()
  })

  it("returns undefined when no env vars are set", async () => {
    for (const k of envKeys) {
      delete process.env[k]
    }
    const { findPersonaByUserId } = await import("@/lib/dev/test-personas")
    expect(findPersonaByUserId("user_1")).toBeUndefined()
  })
})
