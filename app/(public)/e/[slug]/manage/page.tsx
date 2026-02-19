import { notFound } from "next/navigation"
import { getManageHackathon } from "@/lib/services/manage-hackathon"
import { getHackathonSubmissions } from "@/lib/services/submissions"
import { getJudgingProgress, getJudgingSetupStatus } from "@/lib/services/judging"
import { PageHeader } from "@/components/page-header"
import { HackathonPreviewClient } from "@/components/hackathon/preview/hackathon-preview-client"
import { HackathonPageActions } from "@/components/hackathon/hackathon-page-actions"
import { LifecycleStepper } from "@/components/hackathon/lifecycle-stepper"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function ManagePage({ params }: PageProps) {
  const { slug } = await params
  const result = await getManageHackathon(slug)

  if (!result) {
    notFound()
  }

  const { hackathon } = result

  const [submissions, judgingProgress, judgingSetupStatus] = await Promise.all([
    getHackathonSubmissions(hackathon.id),
    getJudgingProgress(hackathon.id),
    getJudgingSetupStatus(hackathon.id),
  ])

  const submissionCount = submissions.length

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/home" },
          { label: hackathon.name },
        ]}
        actions={
          <HackathonPageActions
            slug={hackathon.slug}
            status={hackathon.status}
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
      />

      <div className="rounded-lg border overflow-hidden">
        <HackathonPreviewClient hackathon={hackathon} isEditable={true} />
      </div>
    </div>
  )
}
