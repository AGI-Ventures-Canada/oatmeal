import Link from "next/link"
import { Megaphone, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Announcement } from "@/lib/services/announcements"

type Props = {
  slug: string
  announcements: Announcement[]
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function OverviewAnnouncements({ slug, announcements }: Props) {
  const recent = announcements.slice(0, 3)

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Megaphone className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Announcements</h3>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/e/${slug}/manage?tab=event&etab=announcements`}>
            View all
            <ArrowRight className="size-3" />
          </Link>
        </Button>
      </div>

      {recent.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-2">No announcements yet</p>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/e/${slug}/manage?tab=event&etab=announcements`}>Create one</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {recent.map((a) => (
            <div key={a.id} className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{a.title}</p>
                  {a.priority === "urgent" && <Badge variant="destructive">urgent</Badge>}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{a.body}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {a.published_at ? timeAgo(a.published_at) : "draft"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
