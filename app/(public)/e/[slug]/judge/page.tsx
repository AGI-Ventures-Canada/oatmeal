import { notFound, redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { getPublicHackathon } from "@/lib/services/public-hackathons"
import { JudgeAssignmentsCard } from "@/components/hackathon/judging/judge-assignments-card"
import { SubjectiveScoringView } from "@/components/hackathon/judging/subjective-scoring-view"
import { PageHeader } from "@/components/page-header"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function JudgePage({ params }: PageProps) {
  const { slug } = await params
  const { userId, orgId } = await auth()

  if (!userId) {
    redirect(`/e/${slug}`)
  }

  const hackathon = await getPublicHackathon(slug)
  if (!hackathon) {
    notFound()
  }

  const isViewingAsParticipant = !orgId || orgId !== hackathon.organizer.clerk_org_id
  if (!isViewingAsParticipant) {
    redirect(`/e/${slug}`)
  }

  const { getRegistrationInfo } = await import("@/lib/services/hackathons")
  const registrationInfo = await getRegistrationInfo(hackathon.id, userId)

  if (registrationInfo.participantRole !== "judge") {
    redirect(`/e/${slug}`)
  }

  const isSubjective = hackathon.judging_mode === "subjective"

  if (isSubjective) {
    const { getJudgePicks } = await import("@/lib/services/judge-picks")
    const { getJudgeAssignments } = await import("@/lib/services/judging")

    const [picks, assignments] = await Promise.all([
      getJudgePicks(hackathon.id, registrationInfo.participantId!),
      getJudgeAssignments(hackathon.id, userId),
    ])

    const submissions = assignments.map((a) => ({
      id: a.submissionId,
      title: hackathon.anonymous_judging ? a.submissionTitle : a.submissionTitle,
      description: a.submissionDescription,
      githubUrl: a.submissionGithubUrl,
      liveAppUrl: a.submissionLiveAppUrl,
      screenshotUrl: a.submissionScreenshotUrl,
      teamName: hackathon.anonymous_judging ? null : a.teamName,
      viewedAt: a.viewedAt,
    }))

    const prizes = hackathon.prizes.map((p) => ({
      id: p.id,
      name: p.name,
    }))

    const mappedPicks = picks.map((p) => ({
      id: p.id,
      prizeId: p.prize_id,
      submissionId: p.submission_id,
      rank: p.rank,
      reason: p.reason,
    }))

    return (
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: hackathon.name, href: `/e/${slug}` },
            { label: "Judging" },
          ]}
          title="Judging"
          description="Review submissions and pick your favorites for each prize category"
        />

        {submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            You don&apos;t have any assignments yet.
          </p>
        ) : (
          <SubjectiveScoringView
            hackathonSlug={slug}
            prizes={prizes}
            submissions={submissions}
            initialPicks={mappedPicks}
          />
        )}
      </div>
    )
  }

  const { getJudgeAssignments } = await import("@/lib/services/judging")
  let judgeAssignments = await getJudgeAssignments(hackathon.id, userId)

  if (hackathon.anonymous_judging) {
    judgeAssignments = judgeAssignments.map((a) => ({ ...a, teamName: null }))
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: hackathon.name, href: `/e/${slug}` },
          { label: "Judging" },
        ]}
        title="Judging"
        description="Review and score your assigned submissions"
      />

      {judgeAssignments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          You don&apos;t have any assignments yet.
        </p>
      ) : (
        <JudgeAssignmentsCard
          hackathonSlug={slug}
          assignments={judgeAssignments}
        />
      )}
    </div>
  )
}
