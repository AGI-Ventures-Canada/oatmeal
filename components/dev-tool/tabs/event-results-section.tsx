"use client"

import { Calculator, Send } from "lucide-react"
import { PipelineButton, type SeedStatus } from "./event-shared"

interface EventResultsSectionProps {
  seedStatus: SeedStatus
  pending: string | null
  devAction: (path: string, method?: string, body?: unknown) => Promise<unknown>
}

export function EventResultsSection({ seedStatus, pending, devAction }: EventResultsSectionProps) {
  const isLoading = !!pending
  const hasScores = seedStatus.scoredAssignments > 0

  return (
    <div className="space-y-3">
      <PipelineButton
        icon={<Calculator className="size-3" />}
        label="Calculate Results"
        subtitle="Aggregate scores and rank submissions"
        loading={isLoading}
        blocked={!hasScores}
        blockedHint="needs scores (seed data first)"
        onClick={() => devAction("/calculate-results")}
      />
      <PipelineButton
        icon={<Send className="size-3" />}
        label="Publish Results"
        subtitle="Make results visible and notify participants"
        loading={isLoading}
        done={seedStatus.resultsPublished}
        blocked={!hasScores}
        blockedHint="needs scores (seed data first)"
        onClick={() => devAction("/publish-results")}
      />
      {!hasScores && (
        <p className="text-[10px] text-muted-foreground">
          Seed teams, submissions, judging, and scores in the Seed tab first.
        </p>
      )}
    </div>
  )
}
