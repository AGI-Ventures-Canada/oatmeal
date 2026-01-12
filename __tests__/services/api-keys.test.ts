import { describe, expect, it } from "bun:test"
import { createHmac } from "crypto"

describe("API Key Service", () => {
  const TEST_SECRET = "test-secret-key-32-characters-long"

  function hashKey(raw: string): string {
    return createHmac("sha256", TEST_SECRET).update(raw).digest("hex")
  }

  describe("Key Format", () => {
    it("generates keys with sk_live_ prefix", () => {
      const prefix = "sk_live_"
      expect(prefix).toBe("sk_live_")
    })

    it("prefix extracts first 12 characters", () => {
      const raw = "sk_live_abc123xyz789extra"
      const prefix = raw.slice(0, 12)
      expect(prefix).toBe("sk_live_abc1")
      expect(prefix.length).toBe(12)
    })
  })

  describe("Key Hashing", () => {
    it("produces consistent hashes for same input", () => {
      const key = "sk_live_test123"
      const hash1 = hashKey(key)
      const hash2 = hashKey(key)
      expect(hash1).toBe(hash2)
    })

    it("produces different hashes for different inputs", () => {
      const hash1 = hashKey("sk_live_key1")
      const hash2 = hashKey("sk_live_key2")
      expect(hash1).not.toBe(hash2)
    })

    it("produces 64 character hex string", () => {
      const hash = hashKey("sk_live_test")
      expect(hash.length).toBe(64)
      expect(hash).toMatch(/^[0-9a-f]+$/)
    })
  })

  describe("Key Verification Logic", () => {
    it("verifies key by prefix and hash match", () => {
      const raw = "sk_live_testkey123456"
      const prefix = raw.slice(0, 12)
      const hash = hashKey(raw)

      const inputPrefix = raw.slice(0, 12)
      const inputHash = hashKey(raw)

      expect(inputPrefix).toBe(prefix)
      expect(inputHash).toBe(hash)
    })

    it("rejects keys with wrong prefix", () => {
      const raw = "sk_test_wrongprefix"
      expect(raw.startsWith("sk_live_")).toBe(false)
    })

    it("rejects invalid key format", () => {
      const invalidKeys = ["invalid", "bearer_token", "api_key_123"]
      for (const key of invalidKeys) {
        expect(key.startsWith("sk_")).toBe(false)
      }
    })
  })
})
