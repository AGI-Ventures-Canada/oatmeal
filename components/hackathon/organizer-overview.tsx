"use client"

import Link from "next/link"
import {
  Users,
  UsersRound,
  FolderOpen,
  Scale,
  MessageCircle,
  AlertTriangle,
  CircleAlert,
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

const statConfig = [
  { key: "participants" as const, label: "Registrations", icon: Users },
  { key: "teams" as const, label: "Teams", icon: UsersRound },
  { key: "submissions" as const, label: "Submissions", icon: FolderOpen },
  { key: "judging" as const, label: "Judging", icon: Scale },
  { key: "mentors" as const, label: "Mentor Queue", icon: MessageCircle },
] as const

function getStatValue(key: (typeof statConfig)[number]["key"], stats: QuickStats): string {
  switch (key) {
    case "participants":
      return String(stats.participantCount)
    case "teams":
      return String(stats.teamCount)
    case "submissions":
      return String(stats.submissionCount)
    case "judging": {
      const { totalAssignments, completedAssignments } = stats.judgingProgress
      if (totalAssignments === 0) return "--"
      return `${Math.round((completedAssignments / totalAssignments) * 100)}%`
    }
    case "mentors":
      return String(stats.mentorQueue.open)
  }
}

const severityConfig: Record<ActionSeverity, { icon: typeof AlertTriangle; className: string }> = {
  urgent: { icon: CircleAlert, className: "text-destructive" },
  warning: { icon: AlertTriangle, className: "text-foreground" },
  info: { icon: Info, className: "text-muted-foreground" },
}

function buildActionHref(slug: string, item: ActionItem): string | null {
  if (!item.tab) return null
  const params = new URLSearchParams({ tab: item.tab })
  if (item.subtab && item.subtabKey) params.set(item.subtabKey, item.subtab)
  return `/e/${slug}/manage?${params.toString()}`
}

export function OrganizerOverview({ slug, stats, actionItems }: Props) {
  if (actionItems.length === 0) return null

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-col gap-4 px-3 py-3 sm:px-5 sm:py-4">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 sm:gap-4">
          {statConfig.map(({ key, label, icon: Icon }) => {
            const value = getStatValue(key, stats)
            return (
              <div key={key} className="flex items-center gap-2 min-w-0">
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-lg font-semibold leading-tight tabular-nums">{value}</p>
                  <p className="text-xs text-muted-foreground truncate">{label}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Action items</p>
          <ul className="space-y-1.5">
            {actionItems.map((item) => {
              const { icon: SeverityIcon, className } = severityConfig[item.severity]
              const href = buildActionHref(slug, item)
              const content = (
                <span className={cn("flex items-center gap-2 text-sm", className)}>
                  <SeverityIcon className="size-3.5 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {href && <ArrowRight className="size-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </span>
              )
              return (
                <li key={item.id}>
                  {href ? (
                    <Link
                      href={href}
                      className="group flex rounded-md px-2 py-1.5 -mx-2 hover:bg-muted transition-colors"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="px-2 py-1.5 -mx-2">{content}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
