const BINARY_WEIGHT_TARGET_PERCENTAGE = 100
const BINARY_WEIGHT_TOLERANCE = 0.01

export function decimalWeightToPercentage(weight: number): number {
  return Number((weight * 100).toFixed(2))
}

export function percentageToDecimalWeight(weightPercentage: number): number {
  return Number((weightPercentage / 100).toFixed(4))
}

export function getCriteriaWeightTotalPercentage(
  criteria: Array<{ weight: number }>
): number {
  return Number(
    criteria.reduce((sum, criterion) => sum + decimalWeightToPercentage(criterion.weight), 0).toFixed(2)
  )
}

export function isBinaryWeightTotalComplete(totalPercentage: number): boolean {
  return Math.abs(totalPercentage - BINARY_WEIGHT_TARGET_PERCENTAGE) < BINARY_WEIGHT_TOLERANCE
}

export function formatBinaryPercentage(score: number): string {
  const normalized = Number(score.toFixed(2))
  return `${normalized.toString()}%`
}
