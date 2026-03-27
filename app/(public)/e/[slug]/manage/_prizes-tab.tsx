import { listPrizes, listPrizeAssignments } from "@/lib/services/prizes"
import { getResults } from "@/lib/services/results"
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TabsUrlSync } from "./_tabs-url-sync"
import { PrizesManager } from "@/components/hackathon/prizes/prizes-manager"
import { ResultsDashboard } from "@/components/hackathon/results/results-dashboard"

export type PrizesTabContentProps = {
  hackathonId: string
  activePtab: string
  prizes: Awaited<ReturnType<typeof listPrizes>>
  submissions: Array<{ id: string; title: string }>
  resultsPublishedAt: string | null
  incompleteAssignments: number
}

export async function PrizesTabContent({
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
    <TabsUrlSync paramKey="ptab" defaultValue={activePtab} className="space-y-6">
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
    </TabsUrlSync>
  )
}
