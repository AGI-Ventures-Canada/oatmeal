import { describe, it, expect } from "bun:test"
import { formatCurrency } from "@/lib/utils/currency"

describe("formatCurrency", () => {
  it("formats a plain number", () => {
    expect(formatCurrency("5000")).toBe("$5,000")
  })

  it("formats a number with decimals", () => {
    expect(formatCurrency("5000.50")).toBe("$5,000.50")
  })

  it("strips existing $ before formatting", () => {
    expect(formatCurrency("$5000")).toBe("$5,000")
  })

  it("strips existing commas before formatting", () => {
    expect(formatCurrency("5,000")).toBe("$5,000")
  })

  it("returns non-numeric input unchanged", () => {
    expect(formatCurrency("First place trophy")).toBe("First place trophy")
  })

  it("returns empty string unchanged", () => {
    expect(formatCurrency("")).toBe("")
  })

  it("handles zero", () => {
    expect(formatCurrency("0")).toBe("$0")
  })

  it("handles decimals with trailing zeros", () => {
    expect(formatCurrency("1000.00")).toBe("$1,000")
  })

  it("handles value with currency code", () => {
    expect(formatCurrency("5000 USD")).toBe("5000 USD")
  })
})
