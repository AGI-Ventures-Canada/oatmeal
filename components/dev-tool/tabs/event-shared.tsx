"use client"

import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export type SeedStatus = {
  teams: number
  submissions: number
  criteria: number
  judges: number
  assignments: number
  scoredAssignments: number
  rooms: number
  prizes: number
  categories: number
  challengeReleased: boolean
  resultsPublished: boolean
  mentorRequests: number
  prizeTracks: number
}

export const EMPTY_SEED_STATUS: SeedStatus = {
  teams: 0, submissions: 0, criteria: 0, judges: 0, assignments: 0,
  scoredAssignments: 0, rooms: 0, prizes: 0, categories: 0,
  challengeReleased: false, resultsPublished: false, mentorRequests: 0,
  prizeTracks: 0,
}

export function Section({ label, children, action }: { label: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

export function PipelineButton({
  icon,
  label,
  subtitle,
  loading,
  onClick,
  done,
  count,
  countLabel,
  blocked,
  blockedHint,
  className,
}: {
  icon: React.ReactNode
  label: string
  subtitle?: string
  loading: boolean
  onClick: () => void
  done?: boolean
  count?: number
  countLabel?: string
  blocked?: boolean
  blockedHint?: string
  className?: string
}) {
  return (
    <div className={className}>
      <Button
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={onClick}
        className={`h-auto min-h-8 text-xs justify-start w-full py-1.5 ${blocked ? "opacity-50" : ""}`}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {done ? <Check className="size-3 text-primary shrink-0" /> : icon}
          <span className="truncate">{label}</span>
        </span>
        {done && count !== undefined && count > 0 && (
          <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1 shrink-0">
            {count} {countLabel}
          </Badge>
        )}
      </Button>
      {subtitle && !blocked && (
        <p className="text-[10px] text-muted-foreground ml-6 mt-0.5">{subtitle}</p>
      )}
      {blocked && blockedHint && (
        <p className="text-[10px] text-muted-foreground ml-6 mt-0.5">{blockedHint}</p>
      )}
    </div>
  )
}
