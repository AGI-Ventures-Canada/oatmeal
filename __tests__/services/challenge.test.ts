import { describe, it, expect, beforeEach } from "bun:test"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
  mockSuccess,
  mockError,
} from "../lib/supabase-mock"

const { getChallenge, saveChallenge, releaseChallenge } = await import("@/lib/services/challenge")

const HACKATHON_ID = "11111111-1111-1111-1111-111111111111"
const TENANT_ID = "22222222-2222-2222-2222-222222222222"

describe("challenge service", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  describe("getChallenge", () => {
    it("returns challenge data", async () => {
      setMockFromImplementation(() => createChainableMock(mockSuccess({
        challenge_title: "Build an AI Agent",
        challenge_body: "Create something amazing",
        challenge_released_at: null,
      })))
      const result = await getChallenge(HACKATHON_ID)
      expect(result).not.toBeNull()
      expect(result!.title).toBe("Build an AI Agent")
      expect(result!.releasedAt).toBeNull()
    })

    it("returns null on error", async () => {
      setMockFromImplementation(() => createChainableMock(mockError("Not found")))
      const result = await getChallenge(HACKATHON_ID)
      expect(result).toBeNull()
    })
  })

  describe("saveChallenge", () => {
    it("saves challenge", async () => {
      setMockFromImplementation(() => createChainableMock({ data: null, error: null }))
      const result = await saveChallenge(HACKATHON_ID, TENANT_ID, { title: "Challenge", body: "Details" })
      expect(result).toBe(true)
    })

    it("returns false on error", async () => {
      setMockFromImplementation(() => createChainableMock(mockError("Failed")))
      const result = await saveChallenge(HACKATHON_ID, TENANT_ID, { title: "C", body: "D" })
      expect(result).toBe(false)
    })
  })

  describe("releaseChallenge", () => {
    it("releases challenge", async () => {
      setMockFromImplementation(() => createChainableMock(mockSuccess({
        challenge_title: "Challenge",
        challenge_released_at: null,
      })))
      const result = await releaseChallenge(HACKATHON_ID, TENANT_ID)
      expect(result).toBe(true)
    })

    it("returns true if already released", async () => {
      setMockFromImplementation(() => createChainableMock(mockSuccess({
        challenge_title: "Challenge",
        challenge_released_at: "2026-04-01T12:00:00Z",
      })))
      const result = await releaseChallenge(HACKATHON_ID, TENANT_ID)
      expect(result).toBe(true)
    })

    it("returns false if no title set", async () => {
      setMockFromImplementation(() => createChainableMock(mockSuccess({
        challenge_title: null,
        challenge_released_at: null,
      })))
      const result = await releaseChallenge(HACKATHON_ID, TENANT_ID)
      expect(result).toBe(false)
    })

    it("returns false on fetch error", async () => {
      setMockFromImplementation(() => createChainableMock(mockError("Not found")))
      const result = await releaseChallenge(HACKATHON_ID, TENANT_ID)
      expect(result).toBe(false)
    })
  })
})
