export const TEST_PERSONAS = [
  { key: "organizer", name: "Organizer", env: "SCENARIO_DEV_USER_ID", fallback: "user_38vEFI8UesKwM07qIuFNqEzFavS" },
  { key: "alice", name: "Alice", env: "TEST_USER_ALICE_ID", fallback: null },
  { key: "bob", name: "Bob", env: "TEST_USER_BOB_ID", fallback: null },
  { key: "carol", name: "Carol", env: "TEST_USER_CAROL_ID", fallback: null },
  { key: "dave", name: "Dave", env: "TEST_USER_DAVE_ID", fallback: null },
  { key: "eve", name: "Eve", env: "TEST_USER_EVE_ID", fallback: null },
] as const

export type PersonaKey = (typeof TEST_PERSONAS)[number]["key"]

export function getPersonaUserId(key: PersonaKey): string | null {
  const persona = TEST_PERSONAS.find((p) => p.key === key)
  if (!persona) return null
  return process.env[persona.env] ?? persona.fallback ?? null
}

export function getSeedUserIds(): string[] {
  return TEST_PERSONAS.filter((p) => p.key !== "organizer")
    .map((p) => process.env[p.env] ?? null)
    .filter((id): id is string => id !== null)
}

export function findPersonaByUserId(
  userId: string
): (typeof TEST_PERSONAS)[number] | undefined {
  return TEST_PERSONAS.find((p) => {
    const id = process.env[p.env] ?? p.fallback
    return id === userId
  })
}
