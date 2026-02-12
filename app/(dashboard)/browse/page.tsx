import { PageHeader } from "@/components/page-header"
import { listPublicHackathons } from "@/lib/services/public-hackathons"
import { sortByStatusPriority } from "@/lib/utils/sort-hackathons"
import { BrowseHackathonGrid } from "@/components/hackathon/browse-hackathon-grid"

export default async function BrowsePage() {
  const hackathons = await listPublicHackathons()
  const sorted = sortByStatusPriority(hackathons)

  const initialHackathons = sorted.map((h) => ({
    id: h.id,
    slug: h.slug,
    name: h.name,
    description: h.description,
    status: h.status,
    startsAt: h.starts_at,
    endsAt: h.ends_at,
    registrationOpensAt: h.registration_opens_at,
    registrationClosesAt: h.registration_closes_at,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Browse" }]}
        title="Browse Hackathons"
        description="Discover and join published hackathons"
      />

      <BrowseHackathonGrid initialHackathons={initialHackathons} />
    </div>
  )
}
