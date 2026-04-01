"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Globe, Users, Zap, EyeOff, Gavel, CheckCircle2, ChevronDown, Loader2, Check } from "lucide-react"
import type { HackathonStatus } from "@/lib/db/hackathon-types"

interface StatusBadgeProps {
  hackathonId: string
  status: HackathonStatus
}

const statusConfig: Record<string, { icon: typeof EyeOff; label: string; description: string }> = {
  draft: { icon: EyeOff, label: "Draft", description: "Only you can see this" },
  published: { icon: Globe, label: "Published", description: "Visible on browse page, registration not open" },
  registration_open: { icon: Users, label: "Registration Open", description: "Open for participants to register" },
  active: { icon: Zap, label: "Live", description: "Hackathon is actively running" },
  judging: { icon: Gavel, label: "Judging", description: "Judges are scoring submissions" },
  completed: { icon: CheckCircle2, label: "Completed", description: "Results published" },
}

const allowedTransitions: HackathonStatus[] = ["draft", "published", "registration_open", "active", "judging", "completed"]

export function StatusBadge({ hackathonId, status }: StatusBadgeProps) {
  const router = useRouter()
  const [currentStatus, setCurrentStatus] = useState(status)
  const [updating, setUpdating] = useState(false)

  const config = statusConfig[currentStatus] ?? statusConfig.draft

  async function handleStatusChange(newStatus: HackathonStatus) {
    if (newStatus === currentStatus) return

    setUpdating(true)

    try {
      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        throw new Error("Failed to update status")
      }

      setCurrentStatus(newStatus)
      router.refresh()
    } catch {
      setCurrentStatus(currentStatus)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={updating}>
        <Button
          variant={currentStatus === "draft" ? "outline" : "default"}
          size="sm"
          className="gap-1.5"
        >
          {updating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <config.icon className="size-4" />
          )}
          {config.label}
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {allowedTransitions.map((s) => {
          const cfg = statusConfig[s]
          if (!cfg) return null
          const Icon = cfg.icon
          return (
            <DropdownMenuItem
              key={s}
              onClick={() => handleStatusChange(s)}
              className="flex items-start gap-3 py-2.5"
            >
              <Icon className="size-4 mt-0.5 shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{cfg.label}</span>
                <span className="text-xs text-muted-foreground">{cfg.description}</span>
              </div>
              {currentStatus === s && <Check className="size-4 ml-auto shrink-0" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
