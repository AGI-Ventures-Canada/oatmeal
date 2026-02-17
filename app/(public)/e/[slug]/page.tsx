import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { getPublicHackathon } from "@/lib/services/public-hackathons"
import { HackathonPreviewClient } from "@/components/hackathon/preview/hackathon-preview-client"
import { JudgeAssignmentsCard } from "@/components/hackathon/judging/judge-assignments-card"
import { PublicResults } from "@/components/hackathon/results/public-results"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye } from "lucide-react"
import type { Metadata } from "next"

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const hackathon = await getPublicHackathon(slug, { includeUnpublished: true })

  if (!hackathon) {
    return {
      title: "Hackathon Not Found",
    }
  }

  return {
    title: `${hackathon.name} | Oatmeal`,
    description: hackathon.description || `Join ${hackathon.name} hackathon`,
  }
}

export default async function EventPage({ params }: PageProps) {
  const { slug } = await params
  const { orgId, userId } = await auth()

  let hackathon = await getPublicHackathon(slug)
  let isPreview = false
  let isOrganizer = false

  if (hackathon && orgId && hackathon.organizer.clerk_org_id === orgId) {
    isOrganizer = true
  }

  if (!hackathon) {
    const draftHackathon = await getPublicHackathon(slug, { includeUnpublished: true })

    if (draftHackathon && orgId && draftHackathon.organizer.clerk_org_id === orgId) {
      hackathon = draftHackathon
      isPreview = true
      isOrganizer = true
    }
  }

  if (!hackathon) {
    notFound()
  }

  let isRegistered = false
  let participantRole: string | null = null
  let participantCount = 0
  let submission = null
  let teamInfo = null
  let judgeAssignments: {
    id: string
    submissionId: string
    submissionTitle: string
    submissionDescription: string | null
    submissionGithubUrl: string | null
    submissionLiveAppUrl: string | null
    submissionScreenshotUrl: string | null
    teamName: string | null
    isComplete: boolean
    notes: string
  }[] = []

  if (userId) {
    const { getRegistrationInfo, getParticipantTeamInfo } = await import("@/lib/services/hackathons")
    const registrationInfo = await getRegistrationInfo(hackathon.id, userId)
    isRegistered = registrationInfo.isRegistered
    participantRole = registrationInfo.participantRole
    participantCount = registrationInfo.participantCount

    if (isRegistered && participantRole === "participant") {
      const [submissionResult, teamResult] = await Promise.all([
        import("@/lib/services/submissions").then((m) =>
          m.getSubmissionForParticipant(hackathon.id, userId)
        ),
        getParticipantTeamInfo(hackathon.id, userId),
      ])
      submission = submissionResult
      teamInfo = teamResult
    }

    if (hackathon.status === "judging") {
      const { getJudgeAssignments } = await import("@/lib/services/judging")
      judgeAssignments = await getJudgeAssignments(hackathon.id, userId)

      if (hackathon.anonymous_judging) {
        judgeAssignments = judgeAssignments.map((a) => ({ ...a, teamName: null }))
      }
    }
  }

  const { getHackathonSubmissions } = await import("@/lib/services/submissions")
  const rawSubmissions = await getHackathonSubmissions(hackathon.id)
  const gallerySubmissions = rawSubmissions.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    githubUrl: s.github_url,
    liveAppUrl: s.live_app_url,
    demoVideoUrl: s.demo_video_url,
    screenshotUrl: s.screenshot_url,
    submitter: s.submitter_name,
    createdAt: s.created_at,
  }))

  let publicResults: {
    rank: number
    submissionTitle: string
    teamName: string | null
    weightedScore: number | null
    judgeCount: number
    prizes: { id: string; name: string; value: string | null }[]
  }[] = []

  if (hackathon.results_published_at) {
    const { getPublicResults } = await import("@/lib/services/results")
    const results = await getPublicResults(hackathon.id)
    if (results) {
      publicResults = results.map((r) => ({
        rank: r.rank,
        submissionTitle: r.submissionTitle,
        teamName: r.teamName,
        weightedScore: r.weighted_score,
        judgeCount: r.judge_count,
        prizes: r.prizes,
      }))
    }
  }

  return (
    <div>
      {isPreview && (
        <Alert className="rounded-none border-x-0 border-t-0 bg-muted">
          <Eye className="size-4" />
          <AlertDescription>
            This is a preview. Only you can see this page because your hackathon is not published yet.
          </AlertDescription>
        </Alert>
      )}

      <HackathonPreviewClient
        hackathon={hackathon}
        isEditable={isOrganizer}
        isRegistered={isRegistered}
        participantRole={participantRole}
        participantCount={participantCount}
        showActionBar={isOrganizer || participantRole === "judge"}
        hasJudgeAssignments={judgeAssignments.length > 0}
        submission={submission}
        submissions={gallerySubmissions}
        teamInfo={teamInfo}
      />

      <div className="max-w-5xl mx-auto px-4 space-y-8 py-8">
        {judgeAssignments.length > 0 && (
          <div id="judge-assignments">
            <JudgeAssignmentsCard
              hackathonSlug={hackathon.slug}
              assignments={judgeAssignments}
            />
          </div>
        )}

        {publicResults.length > 0 && (
          <PublicResults results={publicResults} />
        )}
      </div>
    </div>
  )
}
