"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FlaskConical, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { HackathonStatus } from "@/lib/db/hackathon-types"

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
}

export function DebugStageSwitcher({ hackathonId, currentStatus }: DebugStageSwitcherProps) {
  const router = useRouter()
  const [pending, setPending] = useState<HackathonStatus | null>(null)

  async function switchTo(status: HackathonStatus) {
    if (status === currentStatus || pending) return
    setPending(status)
    try {
      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error("Failed")
      router.refresh()
    } catch {
      // silently reset on error
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
        {ALL_STAGES.map(({ status, label }) => {
          const isActive = status === currentStatus
          const isLoading = pending === status
          return (
            <Button
              key={status}
              size="sm"
              variant={isActive ? "default" : "outline"}
              className="h-7 text-xs px-2.5"
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
