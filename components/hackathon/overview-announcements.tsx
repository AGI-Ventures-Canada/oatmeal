"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Megaphone, ArrowRight, Plus, Send, Clock, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Announcement, AnnouncementAudience } from "@/lib/services/announcements"

type Props = {
  slug: string
  hackathonId: string
  announcements: Announcement[]
}

const AUDIENCE_OPTIONS: { value: AnnouncementAudience; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "attendees", label: "Attendees" },
  { value: "judges", label: "Judges" },
  { value: "mentors", label: "Mentors" },
  { value: "organizers", label: "Organizers" },
  { value: "submitted", label: "Teams who submitted" },
  { value: "not_submitted", label: "Teams without submission" },
]

function timeAgo(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff > 0) {
    const hours = Math.floor(diff / 3_600_000)
    if (hours >= 24) return `in ${Math.floor(hours / 24)}d`
    if (hours >= 1) return `in ${hours}h`
    return `in ${Math.floor(diff / 60_000)}m`
  }
  const ms = -diff
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function toLocalDatetime(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const h = String(date.getHours()).padStart(2, "0")
  const min = String(date.getMinutes()).padStart(2, "0")
  return `${y}-${m}-${d}T${h}:${min}`
}

type PublishMode = "now" | "schedule" | "draft"

export function OverviewAnnouncements({ slug, hackathonId, announcements }: Props) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [priority, setPriority] = useState<"normal" | "urgent">("normal")
  const [audience, setAudience] = useState<AnnouncementAudience>("everyone")
  const [publishMode, setPublishMode] = useState<PublishMode>("now")
  const [scheduledAt, setScheduledAt] = useState("")
  const [saving, setSaving] = useState(false)

  const recent = announcements.slice(0, 3)

  function resetForm() {
    setTitle("")
    setBody("")
    setPriority("normal")
    setAudience("everyone")
    setPublishMode("now")
    setScheduledAt("")
  }

  async function handleSubmit() {
    if (!title.trim() || !body.trim()) return
    if (publishMode === "schedule" && !scheduledAt) return
    setSaving(true)
    try {
      const createRes = await fetch(`/api/dashboard/hackathons/${hackathonId}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, priority, audience }),
      })
      if (!createRes.ok) throw new Error("Failed to create")
      const created = await createRes.json()

      if (publishMode === "now") {
        const pubRes = await fetch(`/api/dashboard/hackathons/${hackathonId}/announcements/${created.id}/publish`, { method: "POST" })
        if (!pubRes.ok) throw new Error("Created but failed to publish")
      } else if (publishMode === "schedule") {
        const schedRes = await fetch(`/api/dashboard/hackathons/${hackathonId}/announcements/${created.id}/schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduledAt: new Date(scheduledAt).toISOString() }),
        })
        if (!schedRes.ok) throw new Error("Created but failed to schedule")
      }

      setDialogOpen(false)
      resetForm()
      router.refresh()
    } catch {
      // stay in dialog on error
    } finally {
      setSaving(false)
    }
  }

  const isScheduled = (a: Announcement) => a.published_at && new Date(a.published_at) > new Date()
  const audienceLabel = (a: Announcement) => {
    if (!a.audience || a.audience === "everyone") return null
    return AUDIENCE_OPTIONS.find((o) => o.value === a.audience)?.label
  }

  const canSubmit = title.trim() && body.trim() && (publishMode !== "schedule" || scheduledAt) && !saving

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
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4 mr-1" />
            Create one
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
                  {isScheduled(a) && <Badge variant="secondary">scheduled</Badge>}
                  {audienceLabel(a) && (
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <Users className="size-3" />
                      {audienceLabel(a)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{a.body}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {a.published_at ? timeAgo(a.published_at) : "draft"}
              </span>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-3 mr-1" />
            New announcement
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Announcement title"
                autoFocus
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your announcement..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <div className="flex gap-1 mt-1">
                  <Button variant={priority === "normal" ? "secondary" : "ghost"} size="sm" onClick={() => setPriority("normal")}>Normal</Button>
                  <Button variant={priority === "urgent" ? "secondary" : "ghost"} size="sm" onClick={() => setPriority("urgent")}>Urgent</Button>
                </div>
              </div>
              <div>
                <Label>Audience</Label>
                <Select value={audience} onValueChange={(v) => setAudience(v as AnnouncementAudience)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIENCE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Publish</Label>
              <div className="flex gap-1 mt-1">
                <Button variant={publishMode === "now" ? "secondary" : "ghost"} size="sm" onClick={() => setPublishMode("now")}>Now</Button>
                <Button variant={publishMode === "schedule" ? "secondary" : "ghost"} size="sm" onClick={() => { setPublishMode("schedule"); if (!scheduledAt) setScheduledAt(toLocalDatetime(new Date(Date.now() + 3_600_000))) }}>
                  <Clock className="size-3 mr-1" />
                  Schedule
                </Button>
                <Button variant={publishMode === "draft" ? "secondary" : "ghost"} size="sm" onClick={() => setPublishMode("draft")}>Draft</Button>
              </div>
              {publishMode === "schedule" && (
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="mt-2"
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
              )}
            </div>
            <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
              {publishMode === "now" && <><Send className="size-4 mr-2" />{saving ? "Publishing..." : "Publish Now"}</>}
              {publishMode === "schedule" && <><Clock className="size-4 mr-2" />{saving ? "Scheduling..." : "Schedule"}</>}
              {publishMode === "draft" && <>{saving ? "Saving..." : "Save Draft"}</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
