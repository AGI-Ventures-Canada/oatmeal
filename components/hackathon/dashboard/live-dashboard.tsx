"use client"

import { useEventPoll } from "@/hooks/use-event-poll"
import { PhaseBadge } from "@/components/hackathon/phase-badge"
import { EventTimer } from "@/components/hackathon/event-timer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface LiveDashboardProps {
  slug: string
  hackathonName: string
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}

function JudgingCard({
  complete,
  total,
}: {
  complete: number
  total: number
}) {
  const percent = total > 0 ? Math.round((complete / total) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground">Judging Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-4xl font-bold tabular-nums">
          {complete}/{total}
        </p>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export function LiveDashboard({ slug, hackathonName }: LiveDashboardProps) {
  const { data, isStale } = useEventPoll(slug, { interval: 5000 })

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold md:text-4xl">{hackathonName}</h1>
          <PhaseBadge phase={data.phase} />
        </div>
        {isStale && (
          <Badge variant="destructive">Connection lost</Badge>
        )}
      </div>

      {data.timers.global && (
        <div className="flex justify-center py-4">
          <EventTimer
            endsAt={data.timers.global.endsAt}
            label={data.timers.global.label}
            size="lg"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Teams" value={data.stats.teamCount} />
        <StatCard label="Submissions" value={data.stats.submissionCount} />
        <JudgingCard
          complete={data.stats.judgingComplete}
          total={data.stats.judgingTotal}
        />
        <StatCard label="Mentor Queue" value={data.stats.mentorQueueOpen} />
      </div>

      {data.timers.rooms.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Room Timers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.timers.rooms.map((room) => (
              <Card key={room.id}>
                <CardHeader>
                  <CardTitle>{room.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {room.endsAt ? (
                    <EventTimer
                      endsAt={room.endsAt}
                      label={room.label ?? undefined}
                      size="md"
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm">No active timer</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
