"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Megaphone, ArrowRight, Plus, Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Announcement } from "@/lib/services/announcements"

type Props = {
  slug: string
  hackathonId: string
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

export function OverviewAnnouncements({ slug, hackathonId, announcements }: Props) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [priority, setPriority] = useState<"normal" | "urgent">("normal")
  const [saving, setSaving] = useState(false)

  const recent = announcements.slice(0, 3)

  function resetForm() {
    setTitle("")
    setBody("")
    setPriority("normal")
  }

  async function handleSave(publish: boolean) {
    if (!title.trim() || !body.trim()) return
    setSaving(true)
    try {
      const createRes = await fetch(`/api/dashboard/hackathons/${hackathonId}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, priority }),
      })
      if (!createRes.ok) throw new Error("Failed to create")
      const created = await createRes.json()

      if (publish) {
        const pubRes = await fetch(`/api/dashboard/hackathons/${hackathonId}/announcements/${created.id}/publish`, { method: "POST" })
        if (!pubRes.ok) throw new Error("Created but failed to publish")
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

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
        <DialogContent>
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
            <div className="flex items-center gap-2">
              <Label>Priority</Label>
              <div className="flex gap-1">
                <Button variant={priority === "normal" ? "secondary" : "ghost"} size="sm" onClick={() => setPriority("normal")}>Normal</Button>
                <Button variant={priority === "urgent" ? "secondary" : "ghost"} size="sm" onClick={() => setPriority("urgent")}>Urgent</Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleSave(true)} disabled={!title.trim() || !body.trim() || saving} className="flex-1">
                <Send className="size-4 mr-2" />
                {saving ? "Publishing..." : "Publish Now"}
              </Button>
              <Button variant="outline" onClick={() => handleSave(false)} disabled={!title.trim() || !body.trim() || saving}>
                Save Draft
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
