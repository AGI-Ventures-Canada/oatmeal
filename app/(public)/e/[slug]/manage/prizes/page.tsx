import { notFound } from "next/navigation"
import { getManageHackathon } from "@/lib/services/manage-hackathon"
import { listPrizes, listPrizeAssignments } from "@/lib/services/prizes"
import { getHackathonSubmissions } from "@/lib/services/submissions"
import { PageHeader } from "@/components/page-header"
import { PrizesManager } from "@/components/hackathon/prizes/prizes-manager"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function PrizesPage({ params }: PageProps) {
  const { slug } = await params
  const result = await getManageHackathon(slug)

  if (!result) {
    notFound()
  }

  const { hackathon } = result

  const [prizes, assignments, submissions] = await Promise.all([
    listPrizes(hackathon.id),
    listPrizeAssignments(hackathon.id),
    getHackathonSubmissions(hackathon.id),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/home" },
          { label: hackathon.name, href: `/e/${slug}/manage` },
          { label: "Prizes" },
        ]}
        title="Prizes"
        description={`Manage prizes for ${hackathon.name}`}
      />

      <PrizesManager
        hackathonId={hackathon.id}
        initialPrizes={prizes.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          value: p.value,
          displayOrder: p.display_order,
          createdAt: p.created_at,
        }))}
        initialAssignments={assignments.map((a) => ({
          id: a.id,
          prizeId: a.prize_id,
          prizeName: a.prizeName,
          submissionId: a.submission_id,
          submissionTitle: a.submissionTitle,
          teamName: a.teamName,
          assignedAt: a.assigned_at,
        }))}
        submissions={submissions.map((s) => ({ id: s.id, title: s.title }))}
      />
    </div>
  )
}
