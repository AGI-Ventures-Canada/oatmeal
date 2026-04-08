import { SponsorCard } from "./sponsor-card"
import type { HackathonSponsor, SponsorTier, TenantProfile } from "@/lib/db/hackathon-types"

type SponsorWithTenant = HackathonSponsor & {
  tenant?: Pick<
    TenantProfile,
    "slug" | "name" | "logo_url" | "logo_url_dark" | "website_url" | "description"
  > | null
}

interface SponsorSectionProps {
  sponsors: SponsorWithTenant[]
}

const tierOrder: SponsorTier[] = ["gold", "silver", "bronze", "none", "title"]

const tierLabels: Record<SponsorTier, string> = {
  none: "Sponsors",
  gold: "Gold Sponsors",
  silver: "Silver Sponsors",
  bronze: "Bronze Sponsors",
  title: "Title Sponsor",
}

const tierSizes: Record<SponsorTier, "sm" | "md" | "lg"> = {
  none: "md",
  gold: "lg",
  silver: "md",
  bronze: "sm",
  title: "lg",
}

function groupSponsorsByTier(
  sponsors: SponsorWithTenant[]
): Map<SponsorTier, SponsorWithTenant[]> {
  const groups = new Map<SponsorTier, SponsorWithTenant[]>()

  for (const tier of tierOrder) {
    const tierSponsors = sponsors.filter((s) => s.tier === tier)
    if (tierSponsors.length > 0) {
      groups.set(tier, tierSponsors)
    }
  }

  return groups
}

export function SponsorSection({ sponsors }: SponsorSectionProps) {
  if (sponsors.length === 0) {
    return null
  }

  const groupedSponsors = groupSponsorsByTier(sponsors)

  return (
    <section className="py-12">
      <div className="mx-auto max-w-4xl px-4">
        <h2 className="text-2xl font-bold mb-8 text-center">Sponsors</h2>
        <div className="space-y-10">
          {tierOrder.map((tier) => {
            const tierSponsors = groupedSponsors.get(tier)
            if (!tierSponsors) return null

            return (
              <div key={tier} className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground text-center uppercase tracking-wider">
                  {tierLabels[tier]}
                </h3>
                <div className="flex flex-wrap justify-center gap-4">
                  {tierSponsors.map((sponsor) => (
                    <SponsorCard
                      key={sponsor.id}
                      sponsor={sponsor}
                      size={tierSizes[tier]}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
