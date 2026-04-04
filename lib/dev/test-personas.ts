export const TEST_PERSONAS = [
  { key: "organizer", name: "Organizer", env: "SCENARIO_DEV_USER_ID", fallback: null },
  { key: "user1", name: "Test User 1", env: "TEST_USER_1_ID", fallback: null },
  { key: "user2", name: "Test User 2", env: "TEST_USER_2_ID", fallback: null },
  { key: "user3", name: "Test User 3", env: "TEST_USER_3_ID", fallback: null },
  { key: "user4", name: "Test User 4", env: "TEST_USER_4_ID", fallback: null },
  { key: "user5", name: "Test User 5", env: "TEST_USER_5_ID", fallback: null },
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
