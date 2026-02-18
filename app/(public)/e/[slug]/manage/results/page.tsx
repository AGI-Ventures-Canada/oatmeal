import { notFound } from "next/navigation"
import { getManageHackathon } from "@/lib/services/manage-hackathon"
import { getResults } from "@/lib/services/results"
import { getJudgingProgress } from "@/lib/services/judging"
import { PageHeader } from "@/components/page-header"
import { ResultsDashboard } from "@/components/hackathon/results/results-dashboard"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function ResultsPage({ params }: PageProps) {
  const { slug } = await params
  const result = await getManageHackathon(slug)

  if (!result) {
    notFound()
  }

  const { hackathon } = result

  const [results, progress] = await Promise.all([
    getResults(hackathon.id),
    getJudgingProgress(hackathon.id),
  ])

  const incompleteAssignments = progress.totalAssignments - progress.completedAssignments

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/home" },
          { label: hackathon.name, href: `/e/${slug}/manage` },
          { label: "Results" },
        ]}
        title="Results"
        description={`View and publish results for ${hackathon.name}`}
      />

      <ResultsDashboard
        hackathonId={hackathon.id}
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
