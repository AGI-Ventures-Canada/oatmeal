import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import { resolvePageTenant } from "@/lib/services/tenants"
import { checkHackathonOrganizer } from "@/lib/services/public-hackathons"
import { listJudgingCriteria, listJudges, listJudgeAssignments, getJudgingProgress } from "@/lib/services/judging"
import { listJudgeInvitations } from "@/lib/services/judge-invitations"
import { getHackathonSubmissions } from "@/lib/services/submissions"
import { PageHeader } from "@/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CriteriaConfig } from "@/components/hackathon/judging/criteria-config"
import { JudgeAssignments } from "@/components/hackathon/judging/judge-assignments"
import { ScoringProgress } from "@/components/hackathon/judging/scoring-progress"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function JudgingPage({ params }: PageProps) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const tenant = await resolvePageTenant()
  const { id } = await params

  const result = await checkHackathonOrganizer(id, tenant.id)
  if (result.status !== "ok") notFound()

  const hackathon = result.hackathon
  const [criteria, judges, assignments, progress, submissions, pendingInvitations] = await Promise.all([
    listJudgingCriteria(id),
    listJudges(id),
    listJudgeAssignments(id),
    getJudgingProgress(id),
    getHackathonSubmissions(id),
    listJudgeInvitations(id, "pending"),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/home" },
          { label: hackathon.name, href: `/hackathons/${id}` },
          { label: "Judging" },
        ]}
        title="Judging"
        description={`Manage judging for ${hackathon.name}`}
      />

      <Tabs defaultValue="criteria" className="space-y-6">
        <TabsList>
          <TabsTrigger value="criteria">Criteria</TabsTrigger>
          <TabsTrigger value="assignments">Judges & Assignments</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="criteria" forceMount className="data-[state=inactive]:hidden">
          <CriteriaConfig
            hackathonId={id}
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
        </TabsContent>

        <TabsContent value="assignments" forceMount className="data-[state=inactive]:hidden">
          <JudgeAssignments
            hackathonId={id}
            initialJudges={judges}
            initialAssignments={assignments.map((a) => ({
              id: a.id,
              judgeParticipantId: a.judge_participant_id,
              judgeName: a.judgeName,
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
          />
        </TabsContent>

        <TabsContent value="progress" forceMount className="data-[state=inactive]:hidden">
          <ScoringProgress
            hackathonId={id}
            progress={progress}
            anonymousJudging={hackathon.anonymous_judging}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
