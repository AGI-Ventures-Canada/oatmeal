import { createHackathon } from "@/lib/services/hackathons"
import { downloadAndUploadBanner } from "@/lib/services/storage"
import { addSponsor } from "@/lib/services/sponsors"
import { createPrize } from "@/lib/services/prizes"
import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Hackathon, SponsorTier } from "@/lib/db/hackathon-types"

export type ImportHackathonInput = {
  name: string
  description: string | null
  startsAt: string | null
  endsAt: string | null
  registrationOpensAt?: string | null
  registrationClosesAt?: string | null
  locationType: "in_person" | "virtual" | null
  locationName: string | null
  locationUrl: string | null
  imageUrl: string | null
  rules?: string | null
}

export async function createHackathonFromImport(
  tenantId: string,
  input: ImportHackathonInput
): Promise<Hackathon | null> {
  const hackathon = await createHackathon(tenantId, {
    name: input.name,
    description: input.description,
  })

  if (!hackathon) return null

  const bannerResult = await downloadAndUploadBanner(hackathon.id, input.imageUrl)

  const client = getSupabase() as unknown as SupabaseClient
  const { error } = await client
    .from("hackathons")
    .update({
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      registration_opens_at: input.registrationOpensAt ?? null,
      registration_closes_at: input.registrationClosesAt ?? null,
      location_type: input.locationType,
      location_name: input.locationName,
      location_url: input.locationUrl,
      banner_url: bannerResult?.url ?? null,
      rules: input.rules ?? null,
    })
    .eq("id", hackathon.id)

  if (error) {
    console.error("Failed to update imported hackathon settings:", error)
  }

  return { ...hackathon, banner_url: bannerResult?.url ?? null } as Hackathon
}

const VALID_TIERS = new Set<string>(["gold", "silver", "bronze", "title", "none"])

export async function createSponsorsFromImport(
  hackathonId: string,
  sponsors: { name: string; tier: string | null }[]
): Promise<void> {
  for (let i = 0; i < sponsors.length; i++) {
    const s = sponsors[i]
    const tier = (s.tier && VALID_TIERS.has(s.tier) ? s.tier : "none") as SponsorTier
    await addSponsor({
      hackathonId,
      name: s.name,
      tier,
      displayOrder: i,
    })
  }
}

export async function createPrizesFromImport(
  hackathonId: string,
  prizes: { name: string; description?: string | null; value?: string | null }[]
): Promise<void> {
  for (let i = 0; i < prizes.length; i++) {
    const p = prizes[i]
    await createPrize(hackathonId, {
      name: p.name,
      description: p.description ?? null,
      value: p.value ?? null,
      displayOrder: i,
    })
  }
}
