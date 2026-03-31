"use client"

import { useEventPoll } from "@/hooks/use-event-poll"
import { FullscreenWrapper } from "./fullscreen-wrapper"
import { EventTimer } from "@/components/hackathon/event-timer"
import { PhaseBadge } from "@/components/hackathon/phase-badge"
import type { HackathonPhase } from "@/lib/db/hackathon-types"

interface FullscreenTimerProps {
  slug: string
  initialEndsAt: string | null
  initialLabel: string | null
  initialPhase: HackathonPhase | null
  hackathonName: string
  roomId?: string
}

export function FullscreenTimer({
  slug,
  initialEndsAt,
  initialLabel,
  initialPhase,
  hackathonName,
  roomId,
}: FullscreenTimerProps) {
  const { data } = useEventPoll(slug, { interval: 3000 })

  let endsAt = initialEndsAt
  let label = initialLabel
  let phase = initialPhase

  if (data) {
    phase = data.phase as HackathonPhase | null

    if (roomId) {
      const room = data.timers.rooms.find((r) => r.id === roomId)
      if (room?.endsAt) {
        endsAt = room.endsAt
        label = room.label ?? room.name
      }
    } else if (data.timers.global) {
      endsAt = data.timers.global.endsAt
      label = data.timers.global.label
    }
  }

  return (
    <FullscreenWrapper>
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-2xl font-bold text-foreground sm:text-4xl">
          {hackathonName}
        </h1>
        <PhaseBadge phase={phase} />
        {endsAt ? (
          <EventTimer
            endsAt={endsAt}
            label={label ?? undefined}
            size="lg"
          />
        ) : (
          <p className="text-2xl text-muted-foreground">No active timer</p>
        )}
      </div>
    </FullscreenWrapper>
  )
}
