import { listPrizes, listPrizeAssignments } from "@/lib/services/prizes"
import { getResults } from "@/lib/services/results"
import { listFulfillments, getFulfillmentSummary } from "@/lib/services/prize-fulfillment"
import { listReminders } from "@/lib/services/post-event-reminders"
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TabsUrlSync } from "./_tabs-url-sync"
import { PrizesManager } from "@/components/hackathon/prizes/prizes-manager"
import { ResultsDashboard } from "@/components/hackathon/results/results-dashboard"
import { PrizeFulfillmentTracker } from "@/components/hackathon/prizes/prize-fulfillment-tracker"
import { PostEventPanel } from "@/components/hackathon/post-event-panel"

export type PrizesTabContentProps = {
  hackathonId: string
  activePtab: string
  prizes: Awaited<ReturnType<typeof listPrizes>>
  submissions: Array<{ id: string; title: string }>
  resultsPublishedAt: string | null
  incompleteAssignments: number
  feedbackSurveySentAt: string | null
  feedbackSurveyUrl: string | null
}

export async function PrizesTabContent({
  hackathonId,
  activePtab,
  prizes,
  submissions,
  resultsPublishedAt,
  incompleteAssignments,
  feedbackSurveySentAt,
  feedbackSurveyUrl,
}: PrizesTabContentProps) {
  const [prizeAssignments, results, fulfillments, fulfillmentSummary, reminders] = await Promise.all([
    listPrizeAssignments(hackathonId),
    getResults(hackathonId),
    listFulfillments(hackathonId),
    getFulfillmentSummary(hackathonId),
    listReminders(hackathonId),
  ])

  return (
    <TabsUrlSync paramKey="ptab" value={activePtab} className="space-y-6">
      <div className="overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
        <TabsList>
          <TabsTrigger value="prizes">Prizes</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="fulfillment">Fulfillment</TabsTrigger>
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

      <TabsContent value="fulfillment" forceMount className="data-[state=inactive]:hidden">
        <div className="space-y-8">
          <PrizeFulfillmentTracker
            hackathonId={hackathonId}
            resultsPublishedAt={resultsPublishedAt}
            initialFulfillments={fulfillments.map((f) => ({
              id: f.id,
              prizeAssignmentId: f.prize_assignment_id,
              prizeName: f.prizeName,
              prizeValue: f.prizeValue,
              submissionTitle: f.submissionTitle,
              teamName: f.teamName,
              status: f.status,
              recipientEmail: f.recipient_email,
              recipientName: f.recipient_name,
              shippingAddress: f.shipping_address,
              trackingNumber: f.tracking_number,
              notes: f.notes,
              contactedAt: f.contacted_at,
              shippedAt: f.shipped_at,
              claimedAt: f.claimed_at,
              createdAt: f.created_at,
            }))}
            initialSummary={fulfillmentSummary}
          />
          <PostEventPanel
            hackathonId={hackathonId}
            feedbackSurveySentAt={feedbackSurveySentAt}
            feedbackSurveyUrl={feedbackSurveyUrl}
            initialReminders={reminders.map((r) => ({
              id: r.id,
              type: r.type,
              scheduledFor: r.scheduled_for,
              sentAt: r.sent_at,
              cancelledAt: r.cancelled_at,
              recipientFilter: r.recipient_filter,
              createdAt: r.created_at,
            }))}
          />
        </div>
      </TabsContent>
    </TabsUrlSync>
  )
}
