"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FlaskConical, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { HackathonStatus } from "@/lib/db/hackathon-types"
import { getTimelineState } from "@/lib/utils/timeline"

const ALL_STAGES: { status: HackathonStatus; label: string }[] = [
  { status: "draft", label: "Draft" },
  { status: "published", label: "Published" },
  { status: "registration_open", label: "Reg. Open" },
  { status: "active", label: "Active" },
  { status: "judging", label: "Judging" },
  { status: "completed", label: "Completed" },
  { status: "archived", label: "Archived" },
]

interface DebugStageSwitcherProps {
  hackathonId: string
  currentStatus: HackathonStatus
  registrationOpensAt?: string | null
  registrationClosesAt?: string | null
  startsAt?: string | null
  endsAt?: string | null
}

export function DebugStageSwitcher({
  hackathonId,
  currentStatus,
  registrationOpensAt,
  registrationClosesAt,
  startsAt,
  endsAt,
}: DebugStageSwitcherProps) {
  const router = useRouter()
  const [pending, setPending] = useState<HackathonStatus | null>(null)

  const timelineState = getTimelineState({
    status: currentStatus,
    registration_opens_at: registrationOpensAt,
    registration_closes_at: registrationClosesAt,
    starts_at: startsAt,
    ends_at: endsAt,
  })

  async function switchTo(status: HackathonStatus) {
    if (status === currentStatus || pending) return
    setPending(status)
    try {
      const res = await fetch(`/api/dev/hackathons/${hackathonId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error("Failed")
      router.refresh()
    } catch (err) {
      console.error("[DebugStageSwitcher] failed to update status:", err)
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="rounded-lg border border-dashed bg-muted/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
          <FlaskConical className="size-3.5" />
          <span className="font-medium">Dev</span>
        </div>
        <Badge variant={timelineState.variant} className="text-xs">
          {timelineState.label}
        </Badge>
        {ALL_STAGES.map(({ status, label }) => {
          const isActive = status === currentStatus
          const isLoading = pending === status
          return (
            <Button
              key={status}
              size="sm"
              variant={isActive ? "default" : "outline"}
              disabled={!!pending}
              onClick={() => switchTo(status)}
            >
              {isLoading && <Loader2 className="size-3 animate-spin mr-1" />}
              {label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
