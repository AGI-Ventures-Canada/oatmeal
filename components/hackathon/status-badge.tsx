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
import { Globe, EyeOff, ChevronDown, Loader2, Check } from "lucide-react"
import type { HackathonStatus } from "@/lib/db/hackathon-types"

interface StatusBadgeProps {
  hackathonId: string
  status: HackathonStatus
}

export function StatusBadge({ hackathonId, status }: StatusBadgeProps) {
  const router = useRouter()
  const [currentStatus, setCurrentStatus] = useState(status)
  const [updating, setUpdating] = useState(false)

  const isDraft = currentStatus === "draft"

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
          variant={isDraft ? "outline" : "default"}
          size="sm"
          className="gap-1.5"
        >
          {updating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isDraft ? (
            <EyeOff className="size-4" />
          ) : (
            <Globe className="size-4" />
          )}
          {isDraft ? "Draft" : "Published"}
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          onClick={() => handleStatusChange("draft")}
          className="flex items-start gap-3 py-2.5"
        >
          <EyeOff className="size-4 mt-0.5 shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">Draft</span>
            <span className="text-xs text-muted-foreground">Only you can see this</span>
          </div>
          {isDraft && <Check className="size-4 ml-auto shrink-0" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleStatusChange("published")}
          className="flex items-start gap-3 py-2.5"
        >
          <Globe className="size-4 mt-0.5 shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">Published</span>
            <span className="text-xs text-muted-foreground">Visible on browse page</span>
          </div>
          {!isDraft && <Check className="size-4 ml-auto shrink-0" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
