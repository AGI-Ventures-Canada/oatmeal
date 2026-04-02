"use client"

import Link from "next/link"
import {
  Users,
  UsersRound,
  FolderOpen,
  Scale,
  MessageCircle,
  CircleAlert,
  AlertTriangle,
  Info,
  ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ActionItem, ActionSeverity } from "@/lib/utils/organizer-actions"

type QuickStats = {
  participantCount: number
  teamCount: number
  submissionCount: number
  judgingProgress: { totalAssignments: number; completedAssignments: number }
  mentorQueue: { open: number }
}

type Props = {
  slug: string
  stats: QuickStats
  actionItems: ActionItem[]
}

const severityConfig: Record<ActionSeverity, { icon: typeof AlertTriangle; dot: string }> = {
  urgent: { icon: CircleAlert, dot: "bg-destructive" },
  warning: { icon: AlertTriangle, dot: "bg-foreground" },
  info: { icon: Info, dot: "bg-muted-foreground" },
}

function buildActionHref(slug: string, item: ActionItem): string | null {
  if (!item.tab) return null
  const params = new URLSearchParams({ tab: item.tab })
  if (item.subtab && item.subtabKey) params.set(item.subtabKey, item.subtab)
  return `/e/${slug}/manage?${params.toString()}`
}

function StatPill({ icon: Icon, value, label }: { icon: typeof Users; value: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="size-3.5" />
      <span className="font-medium tabular-nums text-foreground">{value}</span>
      <span className="hidden sm:inline">{label}</span>
    </div>
  )
}

export function OrganizerOverview({ slug, stats, actionItems }: Props) {
  const judgingValue = stats.judgingProgress.totalAssignments > 0
    ? `${Math.round((stats.judgingProgress.completedAssignments / stats.judgingProgress.totalAssignments) * 100)}%`
    : "--"

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <StatPill icon={Users} value={String(stats.participantCount)} label="registered" />
        <StatPill icon={UsersRound} value={String(stats.teamCount)} label="teams" />
        <StatPill icon={FolderOpen} value={String(stats.submissionCount)} label="submitted" />
        <StatPill icon={Scale} value={judgingValue} label="judged" />
        {stats.mentorQueue.open > 0 && (
          <StatPill icon={MessageCircle} value={String(stats.mentorQueue.open)} label="mentor requests" />
        )}
      </div>

      {actionItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actionItems.map((item) => {
            const { dot } = severityConfig[item.severity]
            const href = buildActionHref(slug, item)
            const content = (
              <span className="inline-flex items-center gap-1.5 text-xs">
                <span className={cn("size-1.5 rounded-full shrink-0", dot)} />
                <span>{item.label}</span>
                {href && <ArrowRight className="size-2.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </span>
            )
            return href ? (
              <Link
                key={item.id}
                href={href}
                className="group rounded-md border px-2.5 py-1.5 hover:bg-muted transition-colors"
              >
                {content}
              </Link>
            ) : (
              <span key={item.id} className="rounded-md border px-2.5 py-1.5">
                {content}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
