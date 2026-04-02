"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Calendar, ArrowRight, MapPin, Plus } from "lucide-react"
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
import type { ScheduleItem } from "@/lib/services/schedule-items"

type Props = {
  slug: string
  hackathonId: string
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

function roundUpTo15Min(date: Date): Date {
  const d = new Date(date)
  const remainder = d.getMinutes() % 15
  if (remainder > 0) d.setMinutes(d.getMinutes() + (15 - remainder))
  d.setSeconds(0, 0)
  return d
}

function toLocalDatetime(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const h = String(date.getHours()).padStart(2, "0")
  const min = String(date.getMinutes()).padStart(2, "0")
  return `${y}-${m}-${d}T${h}:${min}`
}

function computeDefaults(items: ScheduleItem[]): { startsAt: string; endsAt: string } {
  let start: Date
  if (items.length > 0) {
    const sorted = [...items].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    const last = sorted[sorted.length - 1]
    start = last.ends_at ? new Date(last.ends_at) : new Date(new Date(last.starts_at).getTime() + 30 * 60_000)
    if (start < new Date()) start = roundUpTo15Min(new Date())
  } else {
    start = roundUpTo15Min(new Date())
  }
  const end = new Date(start.getTime() + 30 * 60_000)
  return { startsAt: toLocalDatetime(start), endsAt: toLocalDatetime(end) }
}

const DURATION_PRESETS = [
  { label: "15m", minutes: 15 },
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "2h", minutes: 120 },
] as const

export function OverviewSchedule({ slug, hackathonId, scheduleItems }: Props) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [location, setLocation] = useState("")
  const [activeDuration, setActiveDuration] = useState<number | null>(30)
  const [saving, setSaving] = useState(false)

  const now = new Date().toISOString()
  const upcoming = scheduleItems.filter((s) => s.starts_at > now || (s.ends_at && s.ends_at > now)).slice(0, 6)
  const display = upcoming.length > 0 ? upcoming : scheduleItems.slice(0, 6)

  function prefillDefaults() {
    const defaults = computeDefaults(scheduleItems)
    setStartsAt(defaults.startsAt)
    setEndsAt(defaults.endsAt)
    setActiveDuration(30)
  }

  function resetForm() {
    setTitle("")
    setDescription("")
    setStartsAt("")
    setEndsAt("")
    setLocation("")
    setActiveDuration(30)
  }

  function applyDuration(minutes: number) {
    if (!startsAt) return
    const end = new Date(new Date(startsAt).getTime() + minutes * 60_000)
    setEndsAt(toLocalDatetime(end))
    setActiveDuration(minutes)
  }

  async function handleAdd() {
    if (!title.trim() || !startsAt) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        title,
        startsAt: new Date(startsAt).toISOString(),
      }
      if (description.trim()) payload.description = description
      if (endsAt) payload.endsAt = new Date(endsAt).toISOString()
      if (location.trim()) payload.location = location

      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to create")
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
          <Button variant="outline" size="sm" onClick={() => { prefillDefaults(); setDialogOpen(true) }}>
            <Plus className="size-4 mr-1" />
            Add item
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
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-1 text-muted-foreground"
            onClick={() => { prefillDefaults(); setDialogOpen(true) }}
          >
            <Plus className="size-3 mr-1" />
            Add item
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Schedule Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Opening Ceremony"
                autoFocus
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description..."
                rows={2}
              />
            </div>
            <div>
              <Label>Starts at</Label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => {
                  setStartsAt(e.target.value)
                  if (activeDuration && e.target.value) {
                    const end = new Date(new Date(e.target.value).getTime() + activeDuration * 60_000)
                    setEndsAt(toLocalDatetime(end))
                  }
                }}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              />
            </div>
            <div>
              <Label>Duration</Label>
              <div className="flex gap-1">
                {DURATION_PRESETS.map((p) => (
                  <Button
                    key={p.minutes}
                    type="button"
                    variant={activeDuration === p.minutes ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => applyDuration(p.minutes)}
                    disabled={!startsAt}
                  >
                    {p.label}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant={activeDuration === null ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveDuration(null)}
                >
                  Custom
                </Button>
              </div>
              {activeDuration === null && (
                <Input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="mt-2"
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
              )}
              {activeDuration !== null && endsAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Ends at {new Date(endsAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </p>
              )}
            </div>
            <div>
              <Label>Location (optional)</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Main Hall, Zoom link"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              />
            </div>
            <Button onClick={handleAdd} disabled={!title.trim() || !startsAt || saving} className="w-full">
              {saving ? "Adding..." : "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
