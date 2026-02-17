import { PageHeader } from "@/components/page-header"
import { listPublicHackathons } from "@/lib/services/public-hackathons"
import { BrowseHackathonGrid } from "@/components/hackathon/browse-hackathon-grid"

const PAGE_SIZE = 9

export default async function BrowsePage(props: {
  searchParams: Promise<{ page?: string }>
}) {
  const searchParams = await props.searchParams
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1)
  const { hackathons, total } = await listPublicHackathons({ page, limit: PAGE_SIZE })

  const initialHackathons = hackathons.map((h) => ({
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

      <BrowseHackathonGrid
        initialHackathons={initialHackathons}
        initialPage={page}
        initialTotalPages={Math.ceil(total / PAGE_SIZE)}
      />
    </div>
  )
}
