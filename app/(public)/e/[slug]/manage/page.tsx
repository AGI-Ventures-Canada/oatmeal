import { Suspense } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getManageHackathon } from "@/lib/services/manage-hackathon"
import { getHackathonSubmissions } from "@/lib/services/submissions"
import { getJudgingProgress, getJudgingSetupStatus, listJudgingCriteria, listJudges, listJudgeAssignments } from "@/lib/services/judging"
import { listJudgeInvitations } from "@/lib/services/judge-invitations"
import { listPrizes, listPrizeAssignments } from "@/lib/services/prizes"
import { getResults } from "@/lib/services/results"
import { countJudgeDisplayProfiles } from "@/lib/services/judge-display"
import type { JudgingMode } from "@/lib/db/hackathon-types"
import { VALID_TABS, VALID_JTABS, VALID_PTABS, getDefaultTab, resolveTab } from "@/lib/utils/manage-tabs"
import { HackathonPreviewClient } from "@/components/hackathon/preview/hackathon-preview-client"
import { HackathonPageActions } from "@/components/hackathon/hackathon-page-actions"
import { LifecycleStepper } from "@/components/hackathon/lifecycle-stepper"
import { DebugStageSwitcher } from "@/components/hackathon/debug-stage-switcher"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { CriteriaConfig } from "@/components/hackathon/judging/criteria-config"
import { JudgingModeToggle } from "@/components/hackathon/judging/judging-mode-toggle"
import { JudgeAssignments } from "@/components/hackathon/judging/judge-assignments"
import { ScoringProgress } from "@/components/hackathon/judging/scoring-progress"
import { PrizesManager } from "@/components/hackathon/prizes/prizes-manager"
import { ResultsDashboard } from "@/components/hackathon/results/results-dashboard"

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string; jtab?: string; ptab?: string }>
}

type JudgesTabContentProps = {
  hackathonId: string
  activeJtab: string
  criteria: Awaited<ReturnType<typeof listJudgingCriteria>>
  submissions: Array<{ id: string; title: string }>
  judgingMode: JudgingMode
  anonymousJudging: boolean
  judgingProgress: Awaited<ReturnType<typeof getJudgingProgress>>
}

async function JudgesTabContent({
  hackathonId,
  activeJtab,
  criteria,
  submissions,
  judgingMode,
  anonymousJudging,
  judgingProgress,
}: JudgesTabContentProps) {
  const [judges, assignments, pendingInvitations] = await Promise.all([
    listJudges(hackathonId),
    listJudgeAssignments(hackathonId),
    listJudgeInvitations(hackathonId, "pending"),
  ])

  return (
    <Tabs defaultValue={activeJtab} className="space-y-6">
      <div className="overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
        <TabsList>
          <TabsTrigger value="criteria">Criteria</TabsTrigger>
          <TabsTrigger value="assignments">Judges & Assignments</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="criteria" forceMount className="data-[state=inactive]:hidden">
        <div className="space-y-6">
          <JudgingModeToggle hackathonId={hackathonId} initialMode={judgingMode} />
          <CriteriaConfig
            hackathonId={hackathonId}
            initialCriteria={criteria.map((c) => ({
              id: c.id,
              name: c.name,
              description: c.description,
              maxScore: c.max_score,
              weight: Number(c.weight),
              displayOrder: c.display_order,
              createdAt: c.created_at,
            }))}
          />
        </div>
      </TabsContent>

      <TabsContent value="assignments" forceMount className="data-[state=inactive]:hidden">
        <JudgeAssignments
          hackathonId={hackathonId}
          initialJudges={judges}
          initialAssignments={assignments.map((a) => ({
            id: a.id,
            judgeParticipantId: a.judge_participant_id,
            judgeName: a.judgeName,
            judgeEmail: a.judgeEmail,
            submissionId: a.submission_id,
            submissionTitle: a.submissionTitle,
            isComplete: a.is_complete,
            assignedAt: a.assigned_at,
          }))}
          initialInvitations={pendingInvitations.map((inv) => ({
            id: inv.id,
            email: inv.email,
            status: inv.status,
            expiresAt: inv.expires_at,
            createdAt: inv.created_at,
          }))}
          submissions={submissions}
          anonymousJudging={anonymousJudging}
        />
      </TabsContent>

      <TabsContent value="progress" forceMount className="data-[state=inactive]:hidden">
        <ScoringProgress progress={judgingProgress} />
      </TabsContent>
    </Tabs>
  )
}

type PrizesTabContentProps = {
  hackathonId: string
  activePtab: string
  prizes: Awaited<ReturnType<typeof listPrizes>>
  submissions: Array<{ id: string; title: string }>
  resultsPublishedAt: string | null
  incompleteAssignments: number
}

async function PrizesTabContent({
  hackathonId,
  activePtab,
  prizes,
  submissions,
  resultsPublishedAt,
  incompleteAssignments,
}: PrizesTabContentProps) {
  const [prizeAssignments, results] = await Promise.all([
    listPrizeAssignments(hackathonId),
    getResults(hackathonId),
  ])

  return (
    <Tabs defaultValue={activePtab} className="space-y-6">
      <div className="overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
        <TabsList>
          <TabsTrigger value="prizes">Prizes</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="prizes" forceMount className="data-[state=inactive]:hidden">
        <PrizesManager
          hackathonId={hackathonId}
          initialPrizes={prizes.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            value: p.value,
            displayOrder: p.display_order,
            createdAt: p.created_at,
          }))}
          initialAssignments={prizeAssignments.map((a) => ({
            id: a.id,
            prizeId: a.prize_id,
            prizeName: a.prizeName,
            submissionId: a.submission_id,
            submissionTitle: a.submissionTitle,
            teamName: a.teamName,
            assignedAt: a.assigned_at,
          }))}
          submissions={submissions}
        />
      </TabsContent>

      <TabsContent value="results" forceMount className="data-[state=inactive]:hidden">
        <ResultsDashboard
          hackathonId={hackathonId}
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
          isPublished={resultsPublishedAt !== null}
          incompleteAssignments={incompleteAssignments}
        />
      </TabsContent>
    </Tabs>
  )
}

function TabLoadingSkeleton() {
  return <div className="h-64 rounded-lg bg-muted animate-pulse" />
}

export default async function ManagePage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { tab, jtab, ptab } = await searchParams
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
  ] = await Promise.all([
    getHackathonSubmissions(hackathon.id),
    getJudgingProgress(hackathon.id),
    getJudgingSetupStatus(hackathon.id),
    listPrizes(hackathon.id),
    countJudgeDisplayProfiles(hackathon.id),
    listJudgingCriteria(hackathon.id),
  ])

  const submissionCount = submissions.length
  const incompleteAssignments = judgingProgress.totalAssignments - judgingProgress.completedAssignments
  const isDev = process.env.NODE_ENV === "development"

  const activeTab = resolveTab(tab, VALID_TABS, getDefaultTab(hackathon.status))
  const activeJtab = resolveTab(jtab, VALID_JTABS, "criteria")
  const activePtab = resolveTab(ptab, VALID_PTABS, "prizes")

  const submissionsForSelect = submissions.map((s) => ({ id: s.id, title: s.title }))

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

      <Tabs defaultValue={activeTab} className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Breadcrumb className="shrink-0">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/home">Dashboard</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{hackathon.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2">
              <HackathonPageActions
                slug={hackathon.slug}
                isOrganizer={true}
                submissionCount={submissionCount}
              />
            </div>
            <div className="overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
              <TabsList variant="line">
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="judges">Judges</TabsTrigger>
                <TabsTrigger value="prizes">Prizes</TabsTrigger>
              </TabsList>
            </div>
          </div>
        </div>

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
      </Tabs>
    </div>
  )
}
