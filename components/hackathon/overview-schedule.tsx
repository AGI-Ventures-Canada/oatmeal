"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toLocalDatetime } from "@/lib/utils/datetime"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Calendar, MapPin, Plus, Pencil, Trash2, Zap, Loader2 } from "lucide-react"
import type { ScheduleItem } from "@/lib/services/schedule-items"

type ScheduleItemData = {
  id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string | null
  location: string | null
  sort_order: number
  trigger_type: "challenge_release" | "submission_deadline" | null
}

const DURATION_PRESETS = [
  { label: "15m", minutes: 15 },
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "2h", minutes: 120 },
] as const

function roundUpTo15Min(date: Date): Date {
  const d = new Date(date)
  const remainder = d.getMinutes() % 15
  if (remainder > 0) d.setMinutes(d.getMinutes() + (15 - remainder))
  d.setSeconds(0, 0)
  return d
}

function computeDefaults(items: ScheduleItemData[]): { startsAt: string; endsAt: string } {
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

function formatShortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}

function isCurrent(item: ScheduleItemData, now: string): boolean {
  if (!item.ends_at) return false
  return item.starts_at <= now && item.ends_at > now
}

type Props = {
  hackathonId: string
  scheduleItems: ScheduleItem[]
  challengeReleasedAt: string | null
  challengeExists: boolean
}

export function OverviewSchedule({ hackathonId, scheduleItems: serverItems, challengeReleasedAt, challengeExists }: Props) {
  const router = useRouter()
  const now = new Date().toISOString()

  const [allItems, setAllItems] = useState<ScheduleItemData[]>(serverItems as ScheduleItemData[])
  useEffect(() => { setAllItems(serverItems as ScheduleItemData[]) }, [serverItems])
  const items = allItems.filter((i) => i.trigger_type !== "challenge_release" || challengeExists)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ScheduleItemData | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startsAt, setStartsAt] = useState<Date | null>(null)
  const [endsAt, setEndsAt] = useState<Date | null>(null)
  const [location, setLocation] = useState("")
  const [saving, setSaving] = useState(false)
  const [activeDuration, setActiveDuration] = useState<number | null>(30)
  const challengeReleased = !!challengeReleasedAt

  function applyDuration(minutes: number) {
    if (!startsAt) return
    setEndsAt(new Date(startsAt.getTime() + minutes * 60_000))
    setActiveDuration(minutes)
  }

  function openCreate() {
    setEditing(null)
    setTitle("")
    setDescription("")
    const defaults = computeDefaults(items)
    setStartsAt(defaults.startsAt ? new Date(defaults.startsAt) : null)
    setEndsAt(defaults.endsAt ? new Date(defaults.endsAt) : null)
    setLocation("")
    setActiveDuration(30)
    setError(null)
    setDialogOpen(true)
  }

  function openEdit(item: ScheduleItemData) {
    setEditing(item)
    setTitle(item.title)
    setDescription(item.description ?? "")
    setStartsAt(new Date(item.starts_at))
    setEndsAt(item.ends_at ? new Date(item.ends_at) : null)
    setLocation(item.location ?? "")
    if (item.starts_at && item.ends_at) {
      const diffMin = Math.round((new Date(item.ends_at).getTime() - new Date(item.starts_at).getTime()) / 60_000)
      const match = DURATION_PRESETS.find((p) => p.minutes === diffMin)
      setActiveDuration(match ? match.minutes : null)
    } else {
      setActiveDuration(null)
    }
    setError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!title.trim() || !startsAt) return
    setSaving(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        title,
        startsAt: startsAt!.toISOString(),
      }
      if (description.trim()) payload.description = description
      if (endsAt) payload.endsAt = endsAt.toISOString()
      if (location.trim()) payload.location = location

      const url = editing
        ? `/api/dashboard/hackathons/${hackathonId}/schedule/${editing.id}`
        : `/api/dashboard/hackathons/${hackathonId}/schedule`
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to save")
      const saved = await res.json()
      if (editing) {
        setAllItems((prev) => prev.map((i) => (i.id === saved.id ? saved : i)).sort((a, b) => a.starts_at.localeCompare(b.starts_at) || (a.sort_order ?? 0) - (b.sort_order ?? 0)))
      } else {
        setAllItems((prev) => [...prev, saved].sort((a, b) => a.starts_at.localeCompare(b.starts_at) || (a.sort_order ?? 0) - (b.sort_order ?? 0)))
      }
      setDialogOpen(false)
      router.refresh()
    } catch {
      setError("Failed to save agenda item")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const prev = allItems
    setAllItems((current) => current.filter((i) => i.id !== id))
    try {
      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/schedule/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      router.refresh()
    } catch {
      setAllItems(prev)
      setError("Failed to delete agenda item")
    }
  }

  function getTriggerStatus(item: ScheduleItemData): "scheduled" | "released" | "closed" | null {
    if (!item.trigger_type) return null
    if (item.trigger_type === "challenge_release") {
      return challengeReleased || new Date(item.starts_at) <= new Date() ? "released" : "scheduled"
    }
    if (item.trigger_type === "submission_deadline") {
      return new Date(item.starts_at) <= new Date() ? "closed" : "scheduled"
    }
    return null
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !saving) {
      e.preventDefault()
      handleSave()
    }
  }

  const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
    scheduled: "secondary",
    released: "default",
    closed: "outline",
  }

  const statusLabel: Record<string, string> = {
    scheduled: "Scheduled",
    released: "Released",
    closed: "Closed",
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Agenda</h3>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add Item</span>
        </Button>
      </div>

      {error && <p className="text-destructive text-xs mb-3">{error}</p>}

      {items.length === 0 ? (
        <div className="text-center py-6">
          <Calendar className="size-8 mx-auto mb-2 opacity-50 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Set event dates to generate your agenda</p>
        </div>
      ) : (
        <div className="space-y-0">
          {items.map((item, idx) => {
            const current = isCurrent(item, now)
            const isTrigger = !!item.trigger_type
            const status = getTriggerStatus(item)
            return (
              <div
                key={item.id}
                className={`group ${current ? "rounded-md bg-primary/5 -mx-2 px-2 py-2" : "py-2"}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs tabular-nums text-muted-foreground shrink-0 w-16 pt-0.5 text-right">
                    {formatShortTime(item.starts_at)}
                  </span>
                  <div className="flex flex-col items-center shrink-0 pt-1.5">
                    {isTrigger ? (
                      <Zap className="size-3 text-primary" />
                    ) : (
                      <div className={current ? "size-2.5 rounded-full bg-primary" : "size-2 rounded-full bg-muted-foreground/40"} />
                    )}
                    {idx < items.length - 1 && <div className="w-px flex-1 bg-border mt-1 min-h-3" />}
                  </div>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => openEdit(item)}
                    onKeyDown={(e) => { if (e.key === "Enter") openEdit(item) }}
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {current && <Badge variant="secondary">Now</Badge>}
                      {status && (
                        <Badge variant={statusVariant[status] ?? "secondary"} className="text-xs">
                          {statusLabel[status] ?? status}
                        </Badge>
                      )}
                    </div>
                    {item.location && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="size-3" />
                        {item.location}
                      </span>
                    )}
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(item)}
                      className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    {!isTrigger && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete agenda item?</AlertDialogTitle>
                            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit agenda item" : "Add agenda item"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); handleSave() }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="sched-title">Title</Label>
              <Input
                id="sched-title"
                name="sched-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Opening Ceremony"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sched-desc">Description (optional)</Label>
              <Textarea
                id="sched-desc"
                name="sched-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description..."
                rows={2}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              />
            </div>
            <div className="space-y-2">
              <Label>Starts at</Label>
              <DateTimePicker
                value={startsAt}
                onChange={(d) => {
                  setStartsAt(d)
                  if (activeDuration && d) {
                    setEndsAt(new Date(d.getTime() + activeDuration * 60_000))
                  }
                }}
                placeholder="Select start date and time"
              />
            </div>
            <div className="space-y-2">
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
                <DateTimePicker
                  value={endsAt}
                  onChange={setEndsAt}
                  placeholder="Select end date and time"
                />
              )}
              {activeDuration !== null && endsAt && (
                <p className="text-xs text-muted-foreground">
                  Ends at {endsAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sched-location">Location (optional)</Label>
              <Input
                id="sched-location"
                name="sched-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Main Hall, Zoom link"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              />
            </div>
            <Button type="submit" disabled={saving || !title.trim() || !startsAt} className="w-full">
              {saving && <Loader2 className="animate-spin" />}
              {editing ? "Update" : "Add"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
