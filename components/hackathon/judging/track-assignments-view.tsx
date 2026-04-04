"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Trophy,
  Tag,
  Users,
  Zap,
  Settings,
  CheckCircle2,
} from "lucide-react"
import type { TrackIntent, JudgingStyle } from "@/lib/db/hackathon-types"
import { BucketSortPanel } from "./bucket-sort-panel"
import { GateCheckPanel } from "./gate-check-panel"

type TrackAssignment = {
  trackId: string
  trackName: string
  intent: TrackIntent
  style: JudgingStyle | null
  roundId: string
  roundName: string
  totalAssignments: number
  completedAssignments: number
}

interface TrackAssignmentsViewProps {
  hackathonSlug: string
  initialTracks: TrackAssignment[]
}

const INTENT_ICONS: Record<TrackIntent, typeof Trophy> = {
  overall_winner: Trophy,
  sponsor_prize: Tag,
  crowd_favorite: Users,
  quick_comparison: Zap,
  custom: Settings,
}

const STYLE_LABELS: Record<string, string> = {
  bucket_sort: "Bucket Sort",
  gate_check: "Gate Check",
  head_to_head: "Head-to-Head",
  top_n: "Top-N",
  compliance: "Compliance",
  crowd: "Crowd Vote",
  points: "Points",
  subjective: "Subjective",
}

const STYLE_DESCRIPTIONS: Record<string, string> = {
  bucket_sort: "Place each submission into a category",
  gate_check: "Answer Yes or No for each criterion",
  head_to_head: "Pick the better project in each pair",
  top_n: "Pick your top submissions",
  compliance: "Check if teams meet the requirements",
  crowd: "Vote for your favorite",
}

export function TrackAssignmentsView({
  hackathonSlug,
  initialTracks,
}: TrackAssignmentsViewProps) {
  const [tracks, setTracks] = useState<TrackAssignment[]>(initialTracks)
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null)
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null)
  const [activeStyle, setActiveStyle] = useState<JudgingStyle | null>(null)

  function openTrack(track: TrackAssignment) {
    if (activeTrackId === track.trackId) {
      setActiveTrackId(null)
      setActiveRoundId(null)
      setActiveStyle(null)
      return
    }
    setActiveTrackId(track.trackId)
    setActiveRoundId(track.roundId)
    setActiveStyle(track.style)
  }

  function handleComplete() {
    setTracks((prev) =>
      prev.map((t) =>
        t.trackId === activeTrackId
          ? { ...t, completedAssignments: t.completedAssignments + 1 }
          : t
      )
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {tracks.map((track) => {
          const Icon = INTENT_ICONS[track.intent] ?? Trophy
          const pct =
            track.totalAssignments > 0
              ? Math.round((track.completedAssignments / track.totalAssignments) * 100)
              : 0
          const isDone = track.completedAssignments >= track.totalAssignments && track.totalAssignments > 0
          const isActive = activeTrackId === track.trackId

          return (
            <Card key={track.trackId} className={isActive ? "ring-2 ring-ring" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Icon className="size-5 mt-0.5 shrink-0 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">{track.trackName}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {track.style && (
                          <Badge variant="secondary" className="text-xs">
                            {STYLE_LABELS[track.style] ?? track.style}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {track.style ? STYLE_DESCRIPTIONS[track.style] ?? "" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isDone && (
                    <Badge variant="outline" className="shrink-0">
                      <CheckCircle2 className="size-3 mr-1" />
                      Done
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {track.totalAssignments > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {track.completedAssignments}/{track.totalAssignments} scored
                      </span>
                      <span className="font-medium">{pct}%</span>
                    </div>
                    <Progress value={pct} />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No assignments yet</p>
                )}
                {track.totalAssignments > 0 && (
                  <Button
                    variant={isDone ? "outline" : "default"}
                    size="sm"
                    className="w-full"
                    onClick={() => openTrack(track)}
                  >
                    {isActive
                      ? "Hide"
                      : isDone
                        ? "Review Responses"
                        : "Continue Judging"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {activeTrackId && activeRoundId && activeStyle === "bucket_sort" && (
        <BucketSortPanel
          hackathonSlug={hackathonSlug}
          roundId={activeRoundId}
          onComplete={handleComplete}
        />
      )}

      {activeTrackId && activeRoundId && activeStyle === "gate_check" && (
        <GateCheckPanel
          hackathonSlug={hackathonSlug}
          roundId={activeRoundId}
          onComplete={handleComplete}
        />
      )}

      {activeTrackId && activeStyle && !["bucket_sort", "gate_check"].includes(activeStyle) && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {STYLE_LABELS[activeStyle] ?? activeStyle} scoring is not yet
              available.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
