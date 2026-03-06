import { describe, expect, it } from "bun:test"

import {
  decimalWeightToPercentage,
  formatBinaryPercentage,
  getCriteriaWeightTotalPercentage,
  isBinaryWeightTotalComplete,
  percentageToDecimalWeight,
} from "@/lib/utils/judging"

describe("judging utils", () => {
  it("converts weights between decimals and percentages", () => {
    expect(decimalWeightToPercentage(0.35)).toBe(35)
    expect(percentageToDecimalWeight(35)).toBe(0.35)
  })

  it("sums criteria weights as percentages", () => {
    expect(
      getCriteriaWeightTotalPercentage([
        { weight: 0.25 },
        { weight: 0.25 },
        { weight: 0.5 },
      ])
    ).toBe(100)
  })

  it("detects complete weight totals", () => {
    expect(isBinaryWeightTotalComplete(100)).toBe(true)
    expect(isBinaryWeightTotalComplete(99.5)).toBe(false)
  })

  it("formats binary result scores with a percent suffix", () => {
    expect(formatBinaryPercentage(75)).toBe("75%")
    expect(formatBinaryPercentage(87.5)).toBe("87.5%")
  })
})
