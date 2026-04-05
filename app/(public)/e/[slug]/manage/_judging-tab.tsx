import { listPrizes, listJudges, getJudgingProgress, listRounds } from "@/lib/services/judging"
import { listJudgeInvitations } from "@/lib/services/judge-invitations"
import { getResults } from "@/lib/services/results"
import { listFulfillments, getFulfillmentSummary } from "@/lib/services/prize-fulfillment"
import { listReminders } from "@/lib/services/post-event-reminders"
import { JudgingTabClient } from "@/components/hackathon/judging/judging-tab-client"
import { PrizeFulfillmentTracker } from "@/components/hackathon/prizes/prize-fulfillment-tracker"
import { PostEventPanel } from "@/components/hackathon/post-event-panel"

export type JudgingTabContentProps = {
  hackathonId: string
  submissions: Array<{ id: string; title: string }>
  resultsPublishedAt: string | null
  incompleteAssignments: number
  feedbackSurveySentAt: string | null
  feedbackSurveyUrl: string | null
}

export async function JudgingTabContent({
  hackathonId,
  submissions,
  resultsPublishedAt,
  incompleteAssignments: _incompleteAssignments,
  feedbackSurveySentAt,
  feedbackSurveyUrl,
}: JudgingTabContentProps) {
  const [prizes, judges, progress, rounds, pendingInvitations, results, fulfillments, fulfillmentSummary, reminders] = await Promise.all([
    listPrizes(hackathonId),
    listJudges(hackathonId),
    getJudgingProgress(hackathonId),
    listRounds(hackathonId),
    listJudgeInvitations(hackathonId, "pending"),
    getResults(hackathonId),
    listFulfillments(hackathonId),
    getFulfillmentSummary(hackathonId),
    listReminders(hackathonId),
  ])

  return (
    <div className="space-y-8">
      <JudgingTabClient
        hackathonId={hackathonId}
        prizes={prizes.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          value: p.value,
          judgingStyle: p.judging_style,
          assignmentMode: p.assignment_mode,
          maxPicks: p.max_picks,
          roundId: p.round_id,
          displayOrder: p.display_order,
          totalAssignments: p.totalAssignments,
          completedAssignments: p.completedAssignments,
          judgeCount: p.judgeCount,
        }))}
        judges={judges.map((j) => ({
          participantId: j.participantId,
          clerkUserId: j.clerkUserId,
          displayName: j.displayName,
          email: j.email,
          imageUrl: j.imageUrl,
          prizeIds: j.prizeIds,
        }))}
        progress={progress}
        rounds={rounds.map((r) => ({
          id: r.id,
          name: r.name,
          status: r.status,
          isActive: r.status === "active",
          displayOrder: r.displayOrder,
        }))}
        pendingInvitations={pendingInvitations.map((inv) => ({
          id: inv.id,
          email: inv.email,
          status: inv.status,
          createdAt: inv.created_at,
        }))}
        results={results.map((r) => ({
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
        submissions={submissions}
        isPublished={resultsPublishedAt !== null}
      />
      <PrizeFulfillmentTracker
        hackathonId={hackathonId}
        resultsPublishedAt={resultsPublishedAt}
        initialFulfillments={fulfillments.map((f) => ({
          id: f.id,
          prizeAssignmentId: f.prize_assignment_id,
          prizeName: f.prizeName,
          prizeValue: f.prizeValue,
          prizeKind: f.prizeKind,
          submissionTitle: f.submissionTitle,
          teamName: f.teamName,
          status: f.status,
          recipientEmail: f.recipient_email,
          recipientName: f.recipient_name,
          shippingAddress: f.shipping_address,
          trackingNumber: f.tracking_number,
          paymentMethod: f.payment_method,
          paymentDetail: f.payment_detail,
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
  )
}
