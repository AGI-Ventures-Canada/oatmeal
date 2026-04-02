import Link from "next/link"
import { Calendar, ArrowRight, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ScheduleItem } from "@/lib/services/schedule-items"

type Props = {
  slug: string
  scheduleItems: ScheduleItem[]
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function OverviewSchedule({ slug, scheduleItems }: Props) {
  const now = new Date().toISOString()
  const upcoming = scheduleItems.filter((s) => s.starts_at > now || (s.ends_at && s.ends_at > now)).slice(0, 5)
  const display = upcoming.length > 0 ? upcoming : scheduleItems.slice(0, 5)

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
        <div className="relative space-y-0">
          {display.map((item, idx) => (
            <div key={item.id} className="flex gap-3 pb-3 last:pb-0">
              <div className="flex flex-col items-center shrink-0">
                <div className="size-2 rounded-full bg-primary mt-1.5" />
                {idx < display.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                  <span>{formatTime(item.starts_at)}{item.ends_at ? ` – ${formatTime(item.ends_at)}` : ""}</span>
                  {item.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {item.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
