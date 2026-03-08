import { notFound } from "next/navigation"
import { getManageHackathon } from "@/lib/services/manage-hackathon"
import { listJudgingCriteria, listJudges, listJudgeAssignments, getJudgingProgress } from "@/lib/services/judging"
import { listJudgeInvitations } from "@/lib/services/judge-invitations"
import { getHackathonSubmissions } from "@/lib/services/submissions"
import { listPrizes, listPrizeAssignments } from "@/lib/services/prizes"
import { PageHeader } from "@/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CriteriaConfig } from "@/components/hackathon/judging/criteria-config"
import { JudgeAssignments } from "@/components/hackathon/judging/judge-assignments"
import { ScoringProgress } from "@/components/hackathon/judging/scoring-progress"
import { JudgingModeToggle } from "@/components/hackathon/judging/judging-mode-toggle"
import { PrizesManager } from "@/components/hackathon/prizes/prizes-manager"

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string }>
}

const VALID_TABS = ["criteria", "prizes", "assignments", "progress"]

export default async function JudgingPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { tab } = await searchParams
  const defaultTab = tab && VALID_TABS.includes(tab) ? tab : "criteria"

  const result = await getManageHackathon(slug)

  if (!result.ok) {
    notFound()
  }

  const { hackathon } = result

  const [criteria, judges, assignments, progress, submissions, pendingInvitations, prizes, prizeAssignments] = await Promise.all([
    listJudgingCriteria(hackathon.id),
    listJudges(hackathon.id),
    listJudgeAssignments(hackathon.id),
    getJudgingProgress(hackathon.id),
    getHackathonSubmissions(hackathon.id),
    listJudgeInvitations(hackathon.id, "pending"),
    listPrizes(hackathon.id),
    listPrizeAssignments(hackathon.id),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/home" },
          { label: hackathon.name, href: `/e/${slug}/manage` },
          { label: "Judging" },
        ]}
        title="Judging"
        description={`Manage judging for ${hackathon.name}`}
      />

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="criteria">Criteria</TabsTrigger>
            <TabsTrigger value="prizes">Prizes</TabsTrigger>
            <TabsTrigger value="assignments">Judges & Assignments</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="criteria" forceMount className="data-[state=inactive]:hidden">
          <div className="space-y-6">
            <JudgingModeToggle
              hackathonId={hackathon.id}
              initialMode={hackathon.judging_mode}
            />
            <CriteriaConfig
              hackathonId={hackathon.id}
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

        <TabsContent value="prizes" forceMount className="data-[state=inactive]:hidden">
          <PrizesManager
            hackathonId={hackathon.id}
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
            submissions={submissions.map((s) => ({ id: s.id, title: s.title }))}
          />
        </TabsContent>

        <TabsContent value="assignments" forceMount className="data-[state=inactive]:hidden">
          <JudgeAssignments
            hackathonId={hackathon.id}
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
            submissions={submissions.map((s) => ({ id: s.id, title: s.title }))}
            anonymousJudging={hackathon.anonymous_judging}
          />
        </TabsContent>

        <TabsContent value="progress" forceMount className="data-[state=inactive]:hidden">
          <ScoringProgress
            progress={progress}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
