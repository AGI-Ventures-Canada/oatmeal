"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  CheckCircle2,
  Trophy,
  Tag,
  Users,
  Zap,
  Settings,
  ChevronRight,
} from "lucide-react"
import type { TrackIntent, JudgingStyle } from "@/lib/db/hackathon-types"
import { TrackConfigPanel } from "./track-config-panel"

export type TrackData = {
  id: string
  name: string
  description: string | null
  intent: TrackIntent
  displayOrder: number
  style: JudgingStyle | null
  totalAssignments: number
  completedAssignments: number
  criteriaCount: number
  judgeCount: number
}

interface PrizeTracksManagerProps {
  hackathonId: string
  initialTracks: TrackData[]
}

const INTENT_OPTIONS: {
  value: TrackIntent
  label: string
  description: string
  detail: string
  styleName: string
  icon: typeof Trophy
}[] = [
  {
    value: "overall_winner",
    label: "Overall Winner",
    description: "Expert judges evaluate all submissions",
    detail: "Best for: Grand Prize, Runner Up, 3rd Place",
    styleName: "Bucket Sort",
    icon: Trophy,
  },
  {
    value: "sponsor_prize",
    label: "Sponsor Prize",
    description: "Check if teams used a specific product/API",
    detail: "Best for: \"Best Use of [Product]\" prizes",
    styleName: "Compliance Checklist",
    icon: Tag,
  },
  {
    value: "crowd_favorite",
    label: "Crowd Favorite",
    description: "Let all attendees vote for their favorite",
    detail: "Best for: People's Choice, Audience Award",
    styleName: "Crowd Vote",
    icon: Users,
  },
  {
    value: "quick_comparison",
    label: "Quick Comparison",
    description: "Judges pick between pairs — fastest method",
    detail: "Best for: Large events, remote judging",
    styleName: "Head-to-Head Arena",
    icon: Zap,
  },
  {
    value: "custom",
    label: "Custom",
    description: "Pick your own evaluation style",
    detail: "For organizers who know exactly what they want",
    styleName: "Bucket Sort",
    icon: Settings,
  },
]

const STYLE_LABELS: Record<string, string> = {
  bucket_sort: "Bucket Sort",
  gate_check: "Gate Check",
  head_to_head: "Head-to-Head",
  top_n: "Top-N",
  compliance: "Compliance",
  crowd: "Crowd Vote",
  points: "Points",
  subjective: "Subjective",
}

const INTENT_ICONS: Record<TrackIntent, typeof Trophy> = {
  overall_winner: Trophy,
  sponsor_prize: Tag,
  crowd_favorite: Users,
  quick_comparison: Zap,
  custom: Settings,
}

type CreateStep = "intent" | "details"

type FormState = {
  name: string
  description: string
  intent: TrackIntent
}

const INTENT_DEFAULT_NAMES: Record<TrackIntent, string> = {
  overall_winner: "Grand Prize",
  sponsor_prize: "Sponsor Prize",
  crowd_favorite: "People's Choice",
  quick_comparison: "Most Innovative",
  custom: "",
}

export function PrizeTracksManager({
  hackathonId,
  initialTracks,
}: PrizeTracksManagerProps) {
  const [tracks, setTracks] = useState<TrackData[]>(initialTracks)
  const [createOpen, setCreateOpen] = useState(false)
  const [createStep, setCreateStep] = useState<CreateStep>("intent")
  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    intent: "overall_winner",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [editingTrack, setEditingTrack] = useState<TrackData | null>(null)
  const [editForm, setEditForm] = useState({ name: "", description: "" })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState(false)

  function openCreate() {
    setCreateStep("intent")
    setForm({ name: "", description: "", intent: "overall_winner" })
    setError(null)
    setSuccess(false)
    setCreateOpen(true)
  }

  function selectIntent(intent: TrackIntent) {
    setForm({
      name: INTENT_DEFAULT_NAMES[intent],
      description: "",
      intent,
    })
    setCreateStep("details")
  }

  function openEdit(track: TrackData) {
    setEditingTrack(track)
    setEditForm({ name: track.name, description: track.description ?? "" })
    setEditError(null)
    setEditSuccess(false)
    setEditOpen(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) {
      setError("Name is required")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/prize-tracks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description: form.description.trim() || null,
            intent: form.intent,
            displayOrder: tracks.length,
          }),
        }
      )

      if (!res.ok) throw new Error("Failed to create prize track")

      const data = await res.json()
      setTracks((prev) => [
        ...prev,
        {
          id: data.id,
          name,
          description: form.description.trim() || null,
          intent: form.intent,
          displayOrder: tracks.length,
          style: (data.rounds?.[0]?.style as JudgingStyle) ?? null,
          totalAssignments: 0,
          completedAssignments: 0,
          criteriaCount: 0,
          judgeCount: 0,
        },
      ])

      setSuccess(true)
      setTimeout(() => setCreateOpen(false), 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingTrack) return
    const name = editForm.name.trim()
    if (!name) {
      setEditError("Name is required")
      return
    }

    setEditSaving(true)
    setEditError(null)

    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/prize-tracks/${editingTrack.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description: editForm.description.trim() || null,
          }),
        }
      )

      if (!res.ok) throw new Error("Failed to update prize track")

      setTracks((prev) =>
        prev.map((t) =>
          t.id === editingTrack.id
            ? { ...t, name, description: editForm.description.trim() || null }
            : t
        )
      )

      setEditSuccess(true)
      setTimeout(() => setEditOpen(false), 800)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/prize-tracks/${id}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error("Failed to delete")
      setTracks((prev) => prev.filter((t) => t.id !== id))
      if (expandedTrackId === id) setExpandedTrackId(null)
    } catch {
      setError("Failed to delete prize track")
    } finally {
      setDeletingId(null)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !saving) {
      e.preventDefault()
      handleCreate(e as unknown as React.FormEvent)
    }
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !editSaving) {
      e.preventDefault()
      handleEdit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Prize Tracks</h3>
          <p className="text-sm text-muted-foreground">
            Each track has its own evaluation style, criteria, and judges
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 size-4" />
              <span className="hidden sm:inline">Add Prize Track</span>
              <span className="sm:hidden">Add Track</span>
            </Button>
          </DialogTrigger>
          <DialogContent className={createStep === "intent" ? "sm:max-w-lg" : undefined}>
            <DialogHeader>
              <DialogTitle>
                {createStep === "intent"
                  ? "What kind of prize is this?"
                  : "Prize track details"}
              </DialogTitle>
            </DialogHeader>
            {success ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <CheckCircle2 className="size-10 text-primary" />
                <p className="text-sm font-medium">Prize track created</p>
              </div>
            ) : createStep === "intent" ? (
              <div className="space-y-2">
                {INTENT_OPTIONS.map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => selectIntent(option.value)}
                      className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="size-5 mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{option.label}</span>
                            <Badge variant="secondary" className="text-xs">
                              {option.styleName}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {option.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {option.detail}
                          </p>
                        </div>
                        <ChevronRight className="size-4 mt-1 shrink-0 text-muted-foreground" />
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <form onSubmit={handleCreate} onKeyDown={handleKeyDown} autoComplete="off" className="space-y-4">
                <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
                  {(() => {
                    const Icon = INTENT_ICONS[form.intent]
                    return <Icon className="size-4 shrink-0" />
                  })()}
                  <span>{INTENT_OPTIONS.find((o) => o.value === form.intent)?.label}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-auto px-2 py-1 text-xs"
                    onClick={() => setCreateStep("intent")}
                  >
                    Change
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="track-name">Name</Label>
                  <Input
                    id="track-name"
                    name="track-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Grand Prize"
                    autoFocus
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="track-description">Description</Label>
                  <Textarea
                    id="track-description"
                    name="track-description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="What does the winner receive?"
                    rows={2}
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCreateStep("intent")}>
                    Back
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Create Track
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {error && !createOpen && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Prize Track</DialogTitle>
          </DialogHeader>
          {editSuccess ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="size-10 text-primary" />
              <p className="text-sm font-medium">Prize track updated</p>
            </div>
          ) : (
            <form onSubmit={handleEdit} onKeyDown={handleEditKeyDown} autoComplete="off" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-track-name">Name</Label>
                <Input
                  id="edit-track-name"
                  name="edit-track-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  autoFocus
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-track-description">Description</Label>
                <Textarea
                  id="edit-track-description"
                  name="edit-track-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2}
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
              </div>
              {editError && <p className="text-sm text-destructive">{editError}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editSaving}>
                  {editSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Update
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {tracks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Trophy className="mx-auto size-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium mb-1">No prize tracks yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Add prize tracks to configure how judges evaluate submissions
          </p>
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            Add your first prize track
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {tracks.map((track) => {
              const Icon = INTENT_ICONS[track.intent] ?? Trophy
              const pct =
                track.totalAssignments > 0
                  ? Math.round(
                      (track.completedAssignments / track.totalAssignments) * 100
                    )
                  : 0
              const isExpanded = expandedTrackId === track.id

              return (
                <Card
                  key={track.id}
                  className={isExpanded ? "ring-2 ring-ring sm:col-span-2" : ""}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2 min-w-0">
                        <Icon className="size-4 mt-1 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">
                            {track.name}
                          </CardTitle>
                          {track.style && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {STYLE_LABELS[track.style] ?? track.style}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEdit(track)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive"
                              disabled={deletingId === track.id}
                            >
                              {deletingId === track.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="size-3.5" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete &quot;{track.name}&quot;?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this prize track, its
                                rounds, bucket definitions, and all associated
                                responses.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(track.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    {track.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {track.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{track.criteriaCount} criteria</span>
                      <span>{track.judgeCount} judges</span>
                    </div>
                    {track.totalAssignments > 0 ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {track.completedAssignments}/{track.totalAssignments}{" "}
                            scored
                          </span>
                          <span className="font-medium">{pct}%</span>
                        </div>
                        <Progress value={pct} />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No assignments yet
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        setExpandedTrackId(isExpanded ? null : track.id)
                      }
                    >
                      {isExpanded ? "Hide Configuration" : "Configure"}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {expandedTrackId && (
            <TrackConfigPanel
              hackathonId={hackathonId}
              trackId={expandedTrackId}
            />
          )}
        </div>
      )}
    </div>
  )
}
