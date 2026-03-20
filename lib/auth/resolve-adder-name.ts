export async function resolveAdderName(principal: {
  kind: string
  userId?: string
}): Promise<string> {
  if (principal.kind !== "user" || !principal.userId) return "An organizer"
  try {
    const { clerkClient } = await import("@clerk/nextjs/server")
    const client = await clerkClient()
    const adder = await client.users.getUser(principal.userId)
    return [adder.firstName, adder.lastName].filter(Boolean).join(" ") || "An organizer"
  } catch {
    return "An organizer"
  }
}
