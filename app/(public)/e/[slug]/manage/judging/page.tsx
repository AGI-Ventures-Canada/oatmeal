import { notFound } from "next/navigation"
import { getManageHackathon } from "@/lib/services/manage-hackathon"
import { listJudgingCriteria, listJudges, listJudgeAssignments, getJudgingProgress } from "@/lib/services/judging"
import { listJudgeInvitations } from "@/lib/services/judge-invitations"
import { getHackathonSubmissions } from "@/lib/services/submissions"
import { PageHeader } from "@/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CriteriaConfig } from "@/components/hackathon/judging/criteria-config"
import { JudgeAssignments } from "@/components/hackathon/judging/judge-assignments"
import { ScoringProgress } from "@/components/hackathon/judging/scoring-progress"

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function JudgingPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { tab } = await searchParams
  const defaultTab = tab === "assignments" || tab === "progress" ? tab : "criteria"

  const result = await getManageHackathon(slug)

  if (!result.ok) {
    notFound()
  }

  const { hackathon } = result

  const [criteria, judges, assignments, progress, submissions, pendingInvitations] = await Promise.all([
    listJudgingCriteria(hackathon.id),
    listJudges(hackathon.id),
    listJudgeAssignments(hackathon.id),
    getJudgingProgress(hackathon.id),
    getHackathonSubmissions(hackathon.id),
    listJudgeInvitations(hackathon.id, "pending"),
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
        <TabsList>
          <TabsTrigger value="criteria">Criteria</TabsTrigger>
          <TabsTrigger value="assignments">Judges & Assignments</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="criteria" forceMount className="data-[state=inactive]:hidden">
          <CriteriaConfig
            hackathonId={hackathon.id}
            initialCriteria={criteria.map((c) => ({
              id: c.id,
              name: c.name,
              description: c.description,
              weight: Number(c.weight),
              displayOrder: c.display_order,
              createdAt: c.created_at,
            }))}
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
