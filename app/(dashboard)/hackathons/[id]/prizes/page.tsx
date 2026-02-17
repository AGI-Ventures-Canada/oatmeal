import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import { resolvePageTenant } from "@/lib/services/tenants"
import { checkHackathonOrganizer } from "@/lib/services/public-hackathons"
import { listPrizes, listPrizeAssignments } from "@/lib/services/prizes"
import { getHackathonSubmissions } from "@/lib/services/submissions"
import { PageHeader } from "@/components/page-header"
import { PrizesManager } from "@/components/hackathon/prizes/prizes-manager"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function PrizesPage({ params }: PageProps) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const tenant = await resolvePageTenant()
  const { id } = await params

  const result = await checkHackathonOrganizer(id, tenant.id)
  if (result.status !== "ok") notFound()

  const hackathon = result.hackathon
  const [prizes, assignments, submissions] = await Promise.all([
    listPrizes(id),
    listPrizeAssignments(id),
    getHackathonSubmissions(id),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/home" },
          { label: hackathon.name, href: `/hackathons/${id}` },
          { label: "Prizes" },
        ]}
        title="Prizes"
        description={`Manage prizes for ${hackathon.name}`}
      />

      <PrizesManager
        hackathonId={id}
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
