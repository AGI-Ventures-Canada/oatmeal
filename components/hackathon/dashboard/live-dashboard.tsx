"use client"

import { useEventPoll } from "@/hooks/use-event-poll"
import { PhaseBadge } from "@/components/hackathon/phase-badge"
import { EventTimer } from "@/components/hackathon/event-timer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Megaphone, MapPin } from "lucide-react"
import { timeAgo } from "@/lib/utils/datetime"
import type { PollAnnouncement, PollScheduleItem } from "@/lib/services/polling"

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

function formatShortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
}

function isCurrentItem(item: PollScheduleItem, now: string): boolean {
  if (!item.ends_at) return false
  return item.starts_at <= now && item.ends_at > now
}

function ScheduleWidget({ items }: { items: PollScheduleItem[] }) {
  if (items.length === 0) return null
  const now = new Date().toISOString()
  const upcoming = items.filter((s) => s.starts_at > now || (s.ends_at && s.ends_at > now)).slice(0, 8)
  const display = upcoming.length > 0 ? upcoming : items.slice(0, 8)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="size-4" />
          Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {display.map((item, idx) => {
          const current = isCurrentItem(item, now)
          return (
            <div key={item.id} className={current ? "rounded-md bg-primary/5 -mx-2 px-2 py-2" : "py-2"}>
              <div className="flex items-start gap-3">
                <span className="text-xs tabular-nums text-muted-foreground shrink-0 w-16 pt-0.5 text-right">
                  {formatShortTime(item.starts_at)}
                </span>
                <div className="flex flex-col items-center shrink-0 pt-1.5">
                  <div className={current ? "size-2.5 rounded-full bg-primary" : "size-2 rounded-full bg-muted-foreground/40"} />
                  {idx < display.length - 1 && <div className="w-px flex-1 bg-border mt-1 min-h-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    {current && <Badge variant="secondary">Now</Badge>}
                  </div>
                  {item.location && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="size-3" />
                      {item.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function AnnouncementsWidget({ items }: { items: PollAnnouncement[] }) {
  if (items.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="size-4" />
          Announcements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.slice(0, 5).map((a) => (
          <div key={a.id}>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{a.title}</p>
              {a.priority === "urgent" && <Badge variant="destructive">urgent</Badge>}
              <span className="text-xs text-muted-foreground ml-auto shrink-0">{timeAgo(a.published_at)}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{a.body}</p>
          </div>
        ))}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ScheduleWidget items={data.scheduleItems} />
        <AnnouncementsWidget items={data.announcements} />
      </div>
    </div>
  )
}
