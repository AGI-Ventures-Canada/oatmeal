import Link from "next/link"
import {
  Users,
  UsersRound,
  FolderOpen,
  Scale,
  MessageCircle,
  ArrowRight,
  CircleCheck,
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

const severityLabel: Record<ActionSeverity, { text: string; className: string }> = {
  urgent: { text: "urgent", className: "text-destructive" },
  warning: { text: "warning", className: "text-primary" },
  info: { text: "info", className: "text-muted-foreground" },
}

function buildActionHref(slug: string, item: ActionItem): string | null {
  if (!item.tab) return null
  const params = new URLSearchParams({ tab: item.tab })
  if (item.subtab && item.subtabKey) params.set(item.subtabKey, item.subtab)
  return `/e/${slug}/manage?${params.toString()}`
}

function StatCard({ icon: Icon, value, label }: { icon: typeof Users; value: string; label: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="size-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  )
}

export function OrganizerOverview({ slug, stats, actionItems }: Props) {
  const judgingValue = stats.judgingProgress.totalAssignments > 0
    ? `${Math.round((stats.judgingProgress.completedAssignments / stats.judgingProgress.totalAssignments) * 100)}%`
    : "—"

  const urgentCount = actionItems.filter((i) => i.severity === "urgent").length

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Users} value={String(stats.participantCount)} label="Registered" />
          <StatCard icon={UsersRound} value={String(stats.teamCount)} label="Teams" />
          <StatCard icon={FolderOpen} value={String(stats.submissionCount)} label="Submissions" />
          <StatCard icon={Scale} value={judgingValue} label="Judged" />
        </div>
        {stats.mentorQueue.open > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <MessageCircle className="size-4 text-primary" />
            <span className="text-sm font-medium">
              {stats.mentorQueue.open} mentor request{stats.mentorQueue.open !== 1 ? "s" : ""} pending
            </span>
          </div>
        )}
      </div>

      <div>
        {actionItems.length > 0 ? (
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Action Items</h3>
              {urgentCount > 0 && (
                <span className="text-xs font-medium text-destructive">{urgentCount} urgent</span>
              )}
            </div>
            <div className="space-y-1">
              {actionItems.map((item) => {
                const severity = severityLabel[item.severity]
                const href = buildActionHref(slug, item)
                const row = (
                  <span className="flex items-center gap-3 py-2">
                    <span className="flex-1 text-sm">{item.label}</span>
                    <span className={cn("text-xs font-medium shrink-0", severity.className)}>
                      {severity.text}
                    </span>
                    {href && <ArrowRight className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </span>
                )
                return href ? (
                  <Link
                    key={item.id}
                    href={href}
                    className="group block rounded-md -mx-2 px-2 hover:bg-muted transition-colors"
                  >
                    {row}
                  </Link>
                ) : (
                  <div key={item.id} className="-mx-2 px-2">
                    {row}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border p-4 flex flex-col items-center justify-center text-center py-8">
            <CircleCheck className="size-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">All caught up</p>
          </div>
        )}
      </div>
    </div>
  )
}
