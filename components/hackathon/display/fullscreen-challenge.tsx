"use client"

import { useEventPoll } from "@/hooks/use-event-poll"
import { FullscreenWrapper } from "./fullscreen-wrapper"
import { PhaseBadge } from "@/components/hackathon/phase-badge"
import type { HackathonPhase } from "@/lib/db/hackathon-types"

interface FullscreenChallengeProps {
  slug: string
  initialTitle: string | null
  initialReleased: boolean
  hackathonName: string
}

export function FullscreenChallenge({
  slug,
  initialTitle,
  initialReleased,
  hackathonName,
}: FullscreenChallengeProps) {
  const { data } = useEventPoll(slug, { interval: 5000 })

  const released = data?.challenge?.released ?? initialReleased
  const title = data?.challenge?.title ?? initialTitle
  const phase = (data?.phase ?? null) as HackathonPhase | null

  return (
    <FullscreenWrapper>
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-2xl font-bold text-foreground sm:text-4xl">
          {hackathonName}
        </h1>
        <PhaseBadge phase={phase} />
        {released ? (
          <p className="max-w-4xl text-center text-4xl font-bold text-foreground sm:text-6xl">
            {title}
          </p>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-2xl text-muted-foreground sm:text-3xl">
              Challenge not yet released
            </p>
            <div className="h-3 w-3 animate-pulse rounded-full bg-muted-foreground" />
          </div>
        )}
      </div>
    </FullscreenWrapper>
  )
}
