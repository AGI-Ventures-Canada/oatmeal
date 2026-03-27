import { listJudges, listJudgeAssignments, getJudgingProgress, listJudgingCriteria } from "@/lib/services/judging"
import { listJudgeInvitations } from "@/lib/services/judge-invitations"
import type { JudgingMode } from "@/lib/db/hackathon-types"
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TabsUrlSync } from "./_tabs-url-sync"
import { CriteriaConfig } from "@/components/hackathon/judging/criteria-config"
import { JudgingModeToggle } from "@/components/hackathon/judging/judging-mode-toggle"
import { JudgeAssignments } from "@/components/hackathon/judging/judge-assignments"
import { ScoringProgress } from "@/components/hackathon/judging/scoring-progress"

export type JudgesTabContentProps = {
  hackathonId: string
  activeJtab: string
  criteria: Awaited<ReturnType<typeof listJudgingCriteria>>
  submissions: Array<{ id: string; title: string }>
  judgingMode: JudgingMode
  anonymousJudging: boolean
  judgingProgress: Awaited<ReturnType<typeof getJudgingProgress>>
}

export async function JudgesTabContent({
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
    <TabsUrlSync paramKey="jtab" defaultValue={activeJtab} className="space-y-6">
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
    </TabsUrlSync>
  )
}
