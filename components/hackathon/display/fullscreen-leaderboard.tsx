"use client"

import { useEventPoll } from "@/hooks/use-event-poll"
import { FullscreenWrapper } from "./fullscreen-wrapper"
import { PhaseBadge } from "@/components/hackathon/phase-badge"
import type { HackathonPhase } from "@/lib/db/hackathon-types"

interface FullscreenLeaderboardProps {
  slug: string
  hackathonName: string
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border p-6">
      <span className="font-mono text-5xl font-bold tabular-nums text-foreground sm:text-7xl">
        {value}
      </span>
      <span className="text-lg text-muted-foreground">{label}</span>
    </div>
  )
}

export function FullscreenLeaderboard({
  slug,
  hackathonName,
}: FullscreenLeaderboardProps) {
  const { data } = useEventPoll(slug, { interval: 5000 })

  const phase = (data?.phase ?? null) as HackathonPhase | null
  const stats = data?.stats

  return (
    <FullscreenWrapper>
      <div className="flex w-full max-w-5xl flex-col items-center gap-8">
        <h1 className="text-2xl font-bold text-foreground sm:text-4xl">
          {hackathonName}
        </h1>
        <PhaseBadge phase={phase} />
        {stats ? (
          <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Teams"
              value={stats.teamCount.toString()}
            />
            <StatCard
              label="Submissions"
              value={stats.submissionCount.toString()}
            />
            <StatCard
              label="Judging"
              value={`${stats.judgingComplete}/${stats.judgingTotal}`}
            />
            <StatCard
              label="Mentor Queue"
              value={stats.mentorQueueOpen.toString()}
            />
          </div>
        ) : (
          <p className="text-2xl text-muted-foreground">Loading stats...</p>
        )}
      </div>
    </FullscreenWrapper>
  )
}
