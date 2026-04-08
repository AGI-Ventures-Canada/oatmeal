export function formatCurrency(value: string): string {
  if (!value) return value

  const stripped = value.replace(/[$,]/g, "").trim()
  const num = Number(stripped)

  if (isNaN(num) || !isFinite(num) || !/^-?\d+(\.\d+)?$/.test(stripped)) {
    return value
  }

  const hasDecimals = stripped.includes(".") && !/\.0+$/.test(stripped)

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(num)
}
