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
import { OverviewAnnouncements } from "@/components/hackathon/overview-announcements"
import { OverviewSchedule } from "@/components/hackathon/overview-schedule"
import type { ActionItem, ActionSeverity } from "@/lib/utils/organizer-actions"
import type { Announcement } from "@/lib/services/announcements"
import type { ScheduleItem } from "@/lib/services/schedule-items"

type QuickStats = {
  participantCount: number
  teamCount: number
  submissionCount: number
  judgingProgress: { totalAssignments: number; completedAssignments: number }
  mentorQueue: { open: number }
}

type Props = {
  slug: string
  hackathonId: string
  stats: QuickStats
  actionItems: ActionItem[]
  announcements: Announcement[]
  scheduleItems: ScheduleItem[]
}

const severityOrder: ActionSeverity[] = ["urgent", "warning", "info"]

const severityLabel: Record<ActionSeverity, { text: string; className: string }> = {
  urgent: { text: "urgent", className: "text-destructive" },
  warning: { text: "warning", className: "text-muted-foreground" },
  info: { text: "info", className: "text-muted-foreground" },
}

function buildActionHref(slug: string, item: ActionItem): string | null {
  if (!item.tab) return null
  const params = new URLSearchParams({ tab: item.tab })
  if (item.subtab && item.subtabKey) params.set(item.subtabKey, item.subtab)
  return `/e/${slug}/manage?${params.toString()}`
}

function StatCard({ icon: Icon, value, label, href }: { icon: typeof Users; value: string; label: string; href?: string }) {
  const inner = (
    <div className={cn("rounded-lg border p-4", href && "transition-colors hover:bg-muted/50")}>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="size-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  )
  if (href) return <Link href={href}>{inner}</Link>
  return inner
}

export function OrganizerOverview({ slug, hackathonId, stats, actionItems, announcements, scheduleItems }: Props) {
  const judgingValue = stats.judgingProgress.totalAssignments > 0
    ? `${Math.round((stats.judgingProgress.completedAssignments / stats.judgingProgress.totalAssignments) * 100)}%`
    : "—"

  const sortedActionItems = [...actionItems].sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity))
  const urgentCount = actionItems.filter((i) => i.severity === "urgent").length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} value={String(stats.participantCount)} label="Registered" href={`/e/${slug}/manage?tab=teams`} />
        <StatCard icon={UsersRound} value={String(stats.teamCount)} label="Teams" href={`/e/${slug}/manage?tab=teams`} />
        <StatCard icon={FolderOpen} value={String(stats.submissionCount)} label="Submissions" href={`/e/${slug}/manage?tab=submissions`} />
        <StatCard icon={Scale} value={judgingValue} label="Judged" href={`/e/${slug}/manage?tab=judging`} />
      </div>

      {stats.mentorQueue.open > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <MessageCircle className="size-4 text-primary" />
          <span className="text-sm font-medium">
            {stats.mentorQueue.open} mentor request{stats.mentorQueue.open !== 1 ? "s" : ""} pending
          </span>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-4">
          <OverviewSchedule slug={slug} hackathonId={hackathonId} scheduleItems={scheduleItems} />
        </div>

        <div className="space-y-4">
          {actionItems.length > 0 ? (
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between border-b pb-3 mb-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Action Items</h3>
                {urgentCount > 0 && (
                  <span className="text-xs font-medium text-destructive-foreground bg-destructive px-2 py-0.5 rounded-full">{urgentCount} urgent</span>
                )}
              </div>
              <div className="space-y-1">
                {sortedActionItems.map((item) => {
                  const severity = severityLabel[item.severity]
                  const href = buildActionHref(slug, item)
                  const row = (
                    <span className="flex items-center py-2">
                      <span className="flex-1 min-w-0">
                        <span className="text-sm block">{item.label}</span>
                        {item.hint && <span className="text-xs text-muted-foreground block">{item.hint}</span>}
                      </span>
                      <span className={cn("text-xs font-medium shrink-0 ml-3", severity.className)}>
                        {severity.text}
                      </span>
                      <ArrowRight className={cn("size-3 shrink-0 text-muted-foreground transition-all duration-200", href ? "ml-0 w-0 opacity-0 group-hover:ml-2 group-hover:w-3 group-hover:opacity-100" : "ml-0 w-0 opacity-0")} />
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
          <OverviewAnnouncements slug={slug} hackathonId={hackathonId} announcements={announcements} />
        </div>
      </div>
    </div>
  )
}
