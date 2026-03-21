import { notFound } from "next/navigation"
import { getManageHackathon } from "@/lib/services/manage-hackathon"
import { getHackathonSubmissions } from "@/lib/services/submissions"
import { getJudgingProgress, getJudgingSetupStatus, listJudgingCriteria } from "@/lib/services/judging"
import { listPrizes } from "@/lib/services/prizes"
import { countJudgeDisplayProfiles } from "@/lib/services/judge-display"
import { PageHeader } from "@/components/page-header"
import { HackathonPreviewClient } from "@/components/hackathon/preview/hackathon-preview-client"
import { HackathonPageActions } from "@/components/hackathon/hackathon-page-actions"
import { LifecycleStepper } from "@/components/hackathon/lifecycle-stepper"
import { DebugStageSwitcher } from "@/components/hackathon/debug-stage-switcher"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function ManagePage({ params }: PageProps) {
  const { slug } = await params
  const result = await getManageHackathon(slug)

  if (!result.ok) {
    notFound()
  }

  const { hackathon } = result

  const [submissions, judgingProgress, judgingSetupStatus, prizes, judgeDisplayCount, criteria] = await Promise.all([
    getHackathonSubmissions(hackathon.id),
    getJudgingProgress(hackathon.id),
    getJudgingSetupStatus(hackathon.id),
    listPrizes(hackathon.id),
    countJudgeDisplayProfiles(hackathon.id),
    listJudgingCriteria(hackathon.id),
  ])

  const submissionCount = submissions.length

  const isDev = process.env.NODE_ENV === "development"

  return (
    <div className="space-y-6">
      {isDev && (
        <DebugStageSwitcher hackathonId={hackathon.id} currentStatus={hackathon.status} />
      )}
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/home" },
          { label: hackathon.name },
        ]}
        actions={
          <HackathonPageActions
            slug={hackathon.slug}
            isOrganizer={true}
            submissionCount={submissionCount}
          />
        }
      />

      <LifecycleStepper
        hackathonId={hackathon.id}
        hackathonSlug={hackathon.slug}
        status={hackathon.status}
        submissionCount={submissionCount}
        judgingProgress={judgingProgress}
        judgingSetupStatus={judgingSetupStatus}
        startsAt={hackathon.starts_at}
        endsAt={hackathon.ends_at}
        registrationOpensAt={hackathon.registration_opens_at}
        registrationClosesAt={hackathon.registration_closes_at}
        description={hackathon.description}
        bannerUrl={hackathon.banner_url}
        locationType={hackathon.location_type}
        locationName={hackathon.location_name}
        locationUrl={hackathon.location_url}
        sponsorCount={hackathon.sponsors.length}
        prizeCount={prizes.length}
        judgeDisplayCount={judgeDisplayCount}
        criteriaCount={criteria.length}
      />

      <div className="rounded-lg border overflow-hidden">
        <HackathonPreviewClient hackathon={hackathon} isEditable={true} />
      </div>
    </div>
  )
}
