import Link from "next/link"
import { Calendar, ArrowRight, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ScheduleItem } from "@/lib/services/schedule-items"

type Props = {
  slug: string
  scheduleItems: ScheduleItem[]
}

function formatShortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}

function isCurrent(item: ScheduleItem, now: string): boolean {
  if (!item.ends_at) return false
  return item.starts_at <= now && item.ends_at > now
}

export function OverviewSchedule({ slug, scheduleItems }: Props) {
  const now = new Date().toISOString()
  const upcoming = scheduleItems.filter((s) => s.starts_at > now || (s.ends_at && s.ends_at > now)).slice(0, 6)
  const display = upcoming.length > 0 ? upcoming : scheduleItems.slice(0, 6)

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Schedule</h3>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/e/${slug}/manage?tab=event&etab=schedule`}>
            View all
            <ArrowRight className="size-3" />
          </Link>
        </Button>
      </div>

      {display.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-2">No schedule items</p>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/e/${slug}/manage?tab=event&etab=schedule`}>Add items</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-0">
          {display.map((item, idx) => {
            const current = isCurrent(item, now)
            return (
              <div
                key={item.id}
                className={current ? "rounded-md bg-primary/5 -mx-2 px-2 py-2" : "py-2"}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs tabular-nums text-muted-foreground shrink-0 w-16 pt-0.5 text-right">
                    {formatShortTime(item.starts_at)}
                  </span>
                  <div className="flex flex-col items-center shrink-0 pt-1.5">
                    <div className={current ? "size-2.5 rounded-full bg-primary" : "size-2 rounded-full bg-muted-foreground/40"} />
                    {idx < display.length - 1 && <div className="w-px flex-1 bg-border mt-1 min-h-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {current && <Badge variant="secondary">Now</Badge>}
                    </div>
                    {item.location && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="size-3" />
                        {item.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
