import { describe, it, expect, beforeEach, afterEach } from "bun:test"

const envVars: Record<string, string> = {
  SCENARIO_DEV_USER_ID: "user_organizer",
  TEST_USER_ALICE_ID: "user_alice",
  TEST_USER_BOB_ID: "user_bob",
  TEST_USER_CAROL_ID: "user_carol",
  TEST_USER_DAVE_ID: "user_dave",
  TEST_USER_EVE_ID: "user_eve",
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
    expect(getPersonaUserId("alice")).toBe("user_alice")
  })

  it("returns null when the env var is not set", async () => {
    delete process.env.TEST_USER_ALICE_ID
    const { getPersonaUserId } = await import("@/lib/dev/test-personas")
    expect(getPersonaUserId("alice")).toBeNull()
  })
})

describe("getSeedUserIds", () => {
  it("returns IDs for all non-organizer personas that have env vars set", async () => {
    const { getSeedUserIds } = await import("@/lib/dev/test-personas")
    const ids = getSeedUserIds()
    expect(ids).toContain("user_alice")
    expect(ids).toContain("user_bob")
    expect(ids).toContain("user_carol")
    expect(ids).toContain("user_dave")
    expect(ids).toContain("user_eve")
    expect(ids).not.toContain("user_organizer")
  })

  it("omits personas whose env var is not set", async () => {
    delete process.env.TEST_USER_BOB_ID
    delete process.env.TEST_USER_EVE_ID
    const { getSeedUserIds } = await import("@/lib/dev/test-personas")
    const ids = getSeedUserIds()
    expect(ids).not.toContain("user_bob")
    expect(ids).not.toContain("user_eve")
    expect(ids).toContain("user_alice")
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
    const persona = findPersonaByUserId("user_alice")
    expect(persona?.key).toBe("alice")
    expect(persona?.name).toBe("Alice")
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
    expect(findPersonaByUserId("user_alice")).toBeUndefined()
  })
})
