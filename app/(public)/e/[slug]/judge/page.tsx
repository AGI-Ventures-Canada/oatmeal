import { notFound, redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { getPublicHackathon } from "@/lib/services/public-hackathons"
import { JudgeAssignmentsCard } from "@/components/hackathon/judging/judge-assignments-card"
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

  const { getRegistrationInfo } = await import("@/lib/services/hackathons")
  const registrationInfo = await getRegistrationInfo(hackathon.id, userId)

  if (registrationInfo.participantRole !== "judge") {
    redirect(`/e/${slug}`)
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
