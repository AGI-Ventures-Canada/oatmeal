import { describe, it, expect } from "bun:test"
import { normalizeUrl } from "@/lib/utils/url"

describe("normalizeUrl", () => {
  it("prepends https:// when no protocol is present", () => {
    expect(normalizeUrl("github.com/user/repo")).toBe("https://github.com/user/repo")
  })

  it("preserves existing https://", () => {
    expect(normalizeUrl("https://github.com/user/repo")).toBe("https://github.com/user/repo")
  })

  it("preserves existing http://", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com")
  })

  it("handles case-insensitive protocol check", () => {
    expect(normalizeUrl("HTTPS://Example.com")).toBe("HTTPS://Example.com")
    expect(normalizeUrl("Http://Example.com")).toBe("Http://Example.com")
  })

  it("trims whitespace", () => {
    expect(normalizeUrl("  github.com/repo  ")).toBe("https://github.com/repo")
  })

  it("returns empty string for empty input", () => {
    expect(normalizeUrl("")).toBe("")
    expect(normalizeUrl("   ")).toBe("")
  })

  it("handles www. prefix without protocol", () => {
    expect(normalizeUrl("www.example.com")).toBe("https://www.example.com")
  })

  it("handles URLs with paths and query strings", () => {
    expect(normalizeUrl("example.com/path?q=1")).toBe("https://example.com/path?q=1")
  })
})
