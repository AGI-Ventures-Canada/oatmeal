import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import { resolvePageTenant } from "@/lib/services/tenants"
import { checkHackathonOrganizer } from "@/lib/services/public-hackathons"
import { getResults } from "@/lib/services/results"
import { getJudgingProgress } from "@/lib/services/judging"
import { PageHeader } from "@/components/page-header"
import { ResultsDashboard } from "@/components/hackathon/results/results-dashboard"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function ResultsPage({ params }: PageProps) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const tenant = await resolvePageTenant()
  const { id } = await params

  const result = await checkHackathonOrganizer(id, tenant.id)
  if (result.status !== "ok") notFound()

  const hackathon = result.hackathon
  const [results, progress] = await Promise.all([
    getResults(id),
    getJudgingProgress(id),
  ])

  const incompleteAssignments = progress.totalAssignments - progress.completedAssignments

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/home" },
          { label: hackathon.name, href: `/hackathons/${id}` },
          { label: "Results" },
        ]}
        title="Results"
        description={`View and publish results for ${hackathon.name}`}
      />

      <ResultsDashboard
        hackathonId={id}
        initialResults={results.map((r) => ({
          id: r.id,
          rank: r.rank,
          submissionId: r.submission_id,
          submissionTitle: r.submissionTitle,
          teamName: r.teamName,
          totalScore: r.total_score,
          weightedScore: r.weighted_score,
          judgeCount: r.judge_count,
          publishedAt: r.published_at,
          prizes: r.prizes,
        }))}
        isPublished={hackathon.results_published_at !== null}
        incompleteAssignments={incompleteAssignments}
      />
    </div>
  )
}
