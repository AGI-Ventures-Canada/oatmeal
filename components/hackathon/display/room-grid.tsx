"use client"

import { useEventPoll } from "@/hooks/use-event-poll"
import { FullscreenWrapper } from "./fullscreen-wrapper"
import { EventTimer } from "@/components/hackathon/event-timer"
import { PhaseBadge } from "@/components/hackathon/phase-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { HackathonPhase } from "@/lib/db/hackathon-types"

interface RoomGridProps {
  slug: string
  initialRooms: {
    id: string
    name: string
    endsAt: string | null
    label: string | null
  }[]
}

export function RoomGrid({ slug, initialRooms }: RoomGridProps) {
  const { data } = useEventPoll(slug, { interval: 5000 })

  const rooms = data?.timers.rooms ?? initialRooms
  const phase = (data?.phase ?? null) as HackathonPhase | null

  return (
    <FullscreenWrapper>
      <div className="flex w-full max-w-6xl flex-col items-center gap-8">
        <PhaseBadge phase={phase} />
        {rooms.length === 0 ? (
          <p className="text-2xl text-muted-foreground">No rooms configured</p>
        ) : (
          <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <Card key={room.id}>
                <CardHeader>
                  <CardTitle className="text-center text-xl">
                    {room.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  {room.endsAt ? (
                    <EventTimer
                      endsAt={room.endsAt}
                      label={room.label ?? undefined}
                      size="md"
                    />
                  ) : (
                    <p className="text-muted-foreground">No active timer</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </FullscreenWrapper>
  )
}
