import { describe, it, expect } from "bun:test"
import {
  normalizeOptionalUrl,
  normalizeUrl,
  normalizeUrlFieldValue,
  safeRedirectUrl,
  urlInputProps,
} from "@/lib/utils/url"

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

describe("normalizeUrlFieldValue", () => {
  it("returns a normalized URL for populated fields", () => {
    expect(normalizeUrlFieldValue("vercel.app/my-app")).toBe("https://vercel.app/my-app")
  })

  it("returns an empty string for blank fields", () => {
    expect(normalizeUrlFieldValue("   ")).toBe("")
  })
})

describe("normalizeOptionalUrl", () => {
  it("normalizes populated optional URLs", () => {
    expect(normalizeOptionalUrl("example.com")).toBe("https://example.com")
  })

  it("returns null for blank optional URL strings", () => {
    expect(normalizeOptionalUrl("   ")).toBeNull()
  })

  it("preserves null and undefined", () => {
    expect(normalizeOptionalUrl(null)).toBeNull()
    expect(normalizeOptionalUrl(undefined)).toBeUndefined()
  })
})

describe("safeRedirectUrl", () => {
  it("returns relative paths as-is", () => {
    expect(safeRedirectUrl("/home")).toBe("/home")
    expect(safeRedirectUrl("/event/abc")).toBe("/event/abc")
    expect(safeRedirectUrl("/hackathons/123?tab=team")).toBe("/hackathons/123?tab=team")
  })

  it("rejects absolute URLs", () => {
    expect(safeRedirectUrl("https://evil.com")).toBe("/home")
    expect(safeRedirectUrl("http://evil.com/steal")).toBe("/home")
  })

  it("rejects protocol-relative URLs", () => {
    expect(safeRedirectUrl("//evil.com")).toBe("/home")
  })

  it("returns fallback for undefined or empty", () => {
    expect(safeRedirectUrl(undefined)).toBe("/home")
    expect(safeRedirectUrl("")).toBe("/home")
  })

  it("uses a custom fallback when provided", () => {
    expect(safeRedirectUrl(undefined, "/dashboard")).toBe("/dashboard")
    expect(safeRedirectUrl("https://evil.com", "/dashboard")).toBe("/dashboard")
  })
})

describe("urlInputProps", () => {
  it("uses a tolerant text input with a URL keyboard", () => {
    expect(urlInputProps).toEqual({
      type: "text",
      inputMode: "url",
      autoCapitalize: "none",
      spellCheck: false,
    })
  })
})
