export function needsShipping(kind: string): boolean {
  return kind === "swag" || kind === "experience"
}

export function needsPayment(kind: string): boolean {
  return kind === "cash"
}

export function isDigitalOnly(kind: string): boolean {
  return kind === "credit"
}
