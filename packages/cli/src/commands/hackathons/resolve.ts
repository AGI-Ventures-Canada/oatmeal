import type { OatmealClient } from "../../client.js"
import type { Hackathon } from "../../types.js"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function resolveHackathonId(
  client: OatmealClient,
  idOrSlug: string
): Promise<string> {
  if (UUID_REGEX.test(idOrSlug)) {
    return idOrSlug
  }

  const data = await client.get<{ hackathons: Hackathon[] }>("/api/dashboard/hackathons", {
    params: { q: idOrSlug },
  })

  const match = data.hackathons?.find((h) => h.slug === idOrSlug)
  if (!match) {
    throw new Error(`Hackathon not found: "${idOrSlug}". Use a UUID or exact slug.`)
  }

  return match.id
}
