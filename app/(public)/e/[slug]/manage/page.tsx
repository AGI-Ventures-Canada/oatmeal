import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getManageHackathon } from "@/lib/services/manage-hackathon"
import { getHackathonSubmissions } from "@/lib/services/submissions"
import { getJudgingProgress, getJudgingSetupStatus, listJudgingCriteria } from "@/lib/services/judging"
import { listPrizes } from "@/lib/services/prizes"
import { countJudgeDisplayProfiles } from "@/lib/services/judge-display"
import { getManageOverviewStats } from "@/lib/services/manage-overview"
import { listPublishedAnnouncements } from "@/lib/services/announcements"
import { listScheduleItems } from "@/lib/services/schedule-items"
import { getOrganizerActionItems } from "@/lib/utils/organizer-actions"
import { VALID_TABS, VALID_JTABS, VALID_PTABS, VALID_ETABS, DEFAULT_TAB, resolveTab } from "@/lib/utils/manage-tabs"
import { HackathonPreviewClient } from "@/components/hackathon/preview/hackathon-preview-client"
import { HackathonPageActions } from "@/components/hackathon/hackathon-page-actions"
import { SubmissionGallery } from "@/components/hackathon/submission-gallery"
import { LifecycleStepper } from "@/components/hackathon/lifecycle-stepper"
import { OrganizerOverview } from "@/components/hackathon/organizer-overview"
import { TimeRemainingBar } from "@/components/hackathon/time-remaining-bar"
import { DebugStageSwitcher } from "@/components/hackathon/debug-stage-switcher"
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TabsUrlSync } from "./_tabs-url-sync"
import { JudgesTabContent } from "./_judges-tab"
import { PrizesTabContent } from "./_prizes-tab"
import { EventTabContent } from "./_event-tab"
import { RoomsTab } from "./_rooms-tab"
import { TeamsTab } from "./_teams-tab"

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string; jtab?: string; ptab?: string; etab?: string }>
}

function TabLoadingSkeleton() {
  return <div className="h-64 rounded-lg bg-muted animate-pulse" />
}

export default async function ManagePage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { tab, jtab, ptab, etab } = await searchParams
  const result = await getManageHackathon(slug)

  if (!result.ok) {
    notFound()
  }

  const { hackathon } = result

  const [
    submissions,
    judgingProgress,
    judgingSetupStatus,
    prizes,
    judgeDisplayCount,
    criteria,
    overviewStats,
    announcements,
    scheduleItems,
  ] = await Promise.all([
    getHackathonSubmissions(hackathon.id),
    getJudgingProgress(hackathon.id),
    getJudgingSetupStatus(hackathon.id),
    listPrizes(hackathon.id),
    countJudgeDisplayProfiles(hackathon.id),
    listJudgingCriteria(hackathon.id),
    getManageOverviewStats(hackathon.id),
    listPublishedAnnouncements(hackathon.id),
    listScheduleItems(hackathon.id),
  ])

  const submissionCount = submissions.length
  const incompleteAssignments = judgingProgress.totalAssignments - judgingProgress.completedAssignments
  const isDev = process.env.NODE_ENV === "development"

  const actionItems = getOrganizerActionItems({
    status: hackathon.status,
    phase: hackathon.phase,
    submissionCount,
    participantCount: overviewStats.participantCount,
    teamCount: overviewStats.teamCount,
    judgingProgress,
    judgingSetupStatus,
    criteriaCount: criteria.length,
    prizeCount: prizes.length,
    judgeDisplayCount,
    mentorQueue: overviewStats.mentorQueue,
    challengeReleased: overviewStats.challengeReleased,
    resultsPublishedAt: hackathon.results_published_at,
    winnerEmailsSentAt: hackathon.winner_emails_sent_at,
    description: hackathon.description,
    bannerUrl: hackathon.banner_url,
    startsAt: hackathon.starts_at,
    endsAt: hackathon.ends_at,
    registrationOpensAt: hackathon.registration_opens_at,
    registrationClosesAt: hackathon.registration_closes_at,
  })

  const activeTab = resolveTab(tab, VALID_TABS, DEFAULT_TAB)
  const activeJtab = resolveTab(jtab, VALID_JTABS, "criteria")
  const activePtab = resolveTab(ptab, VALID_PTABS, "prizes")
  const activeEtab = resolveTab(etab, VALID_ETABS, "challenge")

  const submissionsForSelect = submissions.map((s) => ({ id: s.id, title: s.title }))

  const submissionsForGallery = submissions.map((s) => ({
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

  return (
    <div className="space-y-6">
      {isDev && (
        <DebugStageSwitcher
          hackathonId={hackathon.id}
          currentStatus={hackathon.status}
          registrationOpensAt={hackathon.registration_opens_at}
          registrationClosesAt={hackathon.registration_closes_at}
          startsAt={hackathon.starts_at}
          endsAt={hackathon.ends_at}
        />
      )}

      <TabsUrlSync paramKey="tab" value={activeTab} className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
            <TabsList variant="line">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="edit">Event Page</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
              <TabsTrigger value="rooms">Rooms</TabsTrigger>
              <TabsTrigger value="submissions">Submissions{submissionCount > 0 && <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">{submissionCount}</span>}</TabsTrigger>
              <TabsTrigger value="judges">Judges</TabsTrigger>
              <TabsTrigger value="prizes">Prizes</TabsTrigger>
              <TabsTrigger value="event">Engage</TabsTrigger>
            </TabsList>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <HackathonPageActions
              slug={hackathon.slug}
              isOrganizer={true}
            />
          </div>
        </div>

        <TabsContent value="overview" forceMount className="data-[state=inactive]:hidden">
          <div className="space-y-4">
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
              phase={hackathon.phase}
            />
            <TimeRemainingBar
              status={hackathon.status}
              registrationOpensAt={hackathon.registration_opens_at}
              registrationClosesAt={hackathon.registration_closes_at}
              startsAt={hackathon.starts_at}
              endsAt={hackathon.ends_at}
            />
            <OrganizerOverview
              slug={hackathon.slug}
              hackathonId={hackathon.id}
              stats={{
                participantCount: overviewStats.participantCount,
                teamCount: overviewStats.teamCount,
                submissionCount,
                judgingProgress,
                mentorQueue: overviewStats.mentorQueue,
              }}
              actionItems={actionItems}
              announcements={announcements}
              scheduleItems={scheduleItems}
            />
          </div>
        </TabsContent>

        <TabsContent value="edit" forceMount className="data-[state=inactive]:hidden">
          <div className="rounded-lg border overflow-hidden">
            <HackathonPreviewClient hackathon={hackathon} isEditable={true} />
          </div>
        </TabsContent>

        <TabsContent value="judges" forceMount className="data-[state=inactive]:hidden">
          <Suspense fallback={<TabLoadingSkeleton />}>
            <JudgesTabContent
              hackathonId={hackathon.id}
              activeJtab={activeJtab}
              criteria={criteria}
              submissions={submissionsForSelect}
              judgingMode={hackathon.judging_mode}
              anonymousJudging={hackathon.anonymous_judging}
              judgingProgress={judgingProgress}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="prizes" forceMount className="data-[state=inactive]:hidden">
          <Suspense fallback={<TabLoadingSkeleton />}>
            <PrizesTabContent
              hackathonId={hackathon.id}
              activePtab={activePtab}
              prizes={prizes}
              submissions={submissionsForSelect}
              resultsPublishedAt={hackathon.results_published_at}
              incompleteAssignments={incompleteAssignments}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="teams" forceMount className="data-[state=inactive]:hidden">
          <TeamsTab hackathonId={hackathon.id} />
        </TabsContent>

        <TabsContent value="rooms" forceMount className="data-[state=inactive]:hidden">
          <RoomsTab hackathonId={hackathon.id} />
        </TabsContent>

        <TabsContent value="submissions" forceMount className="data-[state=inactive]:hidden">
          <SubmissionGallery submissions={submissionsForGallery} />
        </TabsContent>

        <TabsContent value="event" forceMount className="data-[state=inactive]:hidden">
          <EventTabContent hackathonId={hackathon.id} activeEtab={activeEtab} hackathonStatus={hackathon.status} hackathonPhase={hackathon.phase} />
        </TabsContent>
      </TabsUrlSync>
    </div>
  )
}
