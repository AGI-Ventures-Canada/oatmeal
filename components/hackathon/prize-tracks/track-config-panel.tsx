"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Play,
  Calculator,
} from "lucide-react"
import type { JudgingStyle, RoundStatus } from "@/lib/db/hackathon-types"

type BucketDef = {
  id: string
  level: number
  label: string
  description: string | null
  displayOrder: number
}

type RoundData = {
  id: string
  name: string
  style: JudgingStyle | null
  status: RoundStatus
  advancement: string
  advancementConfig: Record<string, unknown>
  displayOrder: number
  buckets: BucketDef[]
}

type TrackDetail = {
  id: string
  name: string
  description: string | null
  intent: string
  rounds: RoundData[]
}

interface TrackConfigPanelProps {
  hackathonId: string
  trackId: string
}

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

const ROUND_STATUS_LABELS: Record<RoundStatus, string> = {
  planned: "Planned",
  active: "Active",
  complete: "Complete",
  advanced: "Advanced",
}

const ROUND_STATUS_VARIANTS: Record<RoundStatus, "default" | "secondary" | "outline" | "destructive"> = {
  planned: "secondary",
  active: "default",
  complete: "outline",
  advanced: "outline",
}

export function TrackConfigPanel({ hackathonId, trackId }: TrackConfigPanelProps) {
  const [detail, setDetail] = useState<TrackDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/prize-tracks/${trackId}`
      )
      if (!res.ok) throw new Error("Failed to load track details")
      const data = await res.json()
      setDetail(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [hackathonId, trackId])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error || !detail) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-destructive">{error ?? "Track not found"}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchDetail}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {detail.name} Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {detail.rounds.map((round) => (
          <RoundConfig
            key={round.id}
            hackathonId={hackathonId}
            trackId={trackId}
            round={round}
            onRefresh={fetchDetail}
          />
        ))}
      </CardContent>
    </Card>
  )
}

function RoundConfig({
  hackathonId,
  trackId,
  round,
  onRefresh,
}: {
  hackathonId: string
  trackId: string
  round: RoundData
  onRefresh: () => void
}) {
  const [buckets, setBuckets] = useState<BucketDef[]>(round.buckets)
  const [editingBuckets, setEditingBuckets] = useState(false)
  const [draftBuckets, setDraftBuckets] = useState<
    { level: number; label: string; description: string }[]
  >([])
  const [saving, setSaving] = useState(false)
  const [activating, setActivating] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startEditBuckets() {
    setDraftBuckets(
      buckets.map((b) => ({
        level: b.level,
        label: b.label,
        description: b.description ?? "",
      }))
    )
    setEditingBuckets(true)
    setError(null)
    setSaveSuccess(false)
  }

  function addBucket() {
    const nextLevel = draftBuckets.length > 0 ? Math.max(...draftBuckets.map((b) => b.level)) + 1 : 1
    setDraftBuckets([...draftBuckets, { level: nextLevel, label: "", description: "" }])
  }

  function removeBucket(index: number) {
    setDraftBuckets(draftBuckets.filter((_, i) => i !== index))
  }

  function moveBucket(index: number, direction: "up" | "down") {
    const newBuckets = [...draftBuckets]
    const swapIndex = direction === "up" ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newBuckets.length) return

    const tempLevel = newBuckets[index].level
    newBuckets[index].level = newBuckets[swapIndex].level
    newBuckets[swapIndex].level = tempLevel

    ;[newBuckets[index], newBuckets[swapIndex]] = [newBuckets[swapIndex], newBuckets[index]]
    setDraftBuckets(newBuckets)
  }

  function updateDraftBucket(index: number, field: "label" | "description", value: string) {
    setDraftBuckets(
      draftBuckets.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    )
  }

  async function saveBuckets() {
    const valid = draftBuckets.every((b) => b.label.trim())
    if (!valid) {
      setError("All buckets must have a label")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/prize-tracks/${trackId}/rounds/${round.id}/buckets`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buckets: draftBuckets.map((b, i) => ({
              level: i + 1,
              label: b.label.trim(),
              description: b.description.trim() || null,
            })),
          }),
        }
      )

      if (!res.ok) throw new Error("Failed to save bucket definitions")

      const data = await res.json()
      setBuckets(data.buckets ?? data)
      setSaveSuccess(true)
      setTimeout(() => {
        setEditingBuckets(false)
        setSaveSuccess(false)
      }, 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleActivate() {
    setActivating(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/prize-tracks/${trackId}/rounds/${round.id}/activate`,
        { method: "POST" }
      )
      if (!res.ok) throw new Error("Failed to activate round")
      onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setActivating(false)
    }
  }

  async function handleCalculateResults() {
    setCalculating(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/prize-tracks/${trackId}/rounds/${round.id}/calculate-results`,
        { method: "POST" }
      )
      if (!res.ok) throw new Error("Failed to calculate results")
      await res.json()
      setError(null)
      onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setCalculating(false)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">{round.name}</h4>
          <Badge variant={ROUND_STATUS_VARIANTS[round.status]}>
            {ROUND_STATUS_LABELS[round.status]}
          </Badge>
          {round.style && (
            <Badge variant="outline">
              {STYLE_LABELS[round.style] ?? round.style}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {round.status === "planned" && (
            <Button
              size="sm"
              variant="outline"
              disabled={activating}
              onClick={handleActivate}
            >
              {activating ? (
                <Loader2 className="mr-2 size-3.5 animate-spin" />
              ) : (
                <Play className="mr-2 size-3.5" />
              )}
              Activate
            </Button>
          )}
          {(round.status === "active" || round.status === "complete") && (
            <Button
              size="sm"
              variant="outline"
              disabled={calculating}
              onClick={handleCalculateResults}
            >
              {calculating ? (
                <Loader2 className="mr-2 size-3.5 animate-spin" />
              ) : (
                <Calculator className="mr-2 size-3.5" />
              )}
              Calculate Results
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {round.style === "bucket_sort" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-medium text-muted-foreground">
              Bucket Definitions
            </h5>
            {!editingBuckets && (
              <Button size="sm" variant="ghost" onClick={startEditBuckets}>
                Edit
              </Button>
            )}
          </div>

          {editingBuckets ? (
            <div className="space-y-3">
              {saveSuccess ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <CheckCircle2 className="size-8 text-primary" />
                  <p className="text-sm font-medium">Buckets saved</p>
                </div>
              ) : (
                <>
                  {draftBuckets.map((bucket, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 rounded-md border p-3"
                    >
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          disabled={index === 0}
                          onClick={() => moveBucket(index, "up")}
                        >
                          <ChevronUp className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          disabled={index === draftBuckets.length - 1}
                          onClick={() => moveBucket(index, "down")}
                        >
                          <ChevronDown className="size-3.5" />
                        </Button>
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <Input
                          value={bucket.label}
                          onChange={(e) =>
                            updateDraftBucket(index, "label", e.target.value)
                          }
                          placeholder="Bucket label"
                          autoComplete="off"
                          data-1p-ignore
                          data-lpignore="true"
                          data-form-type="other"
                        />
                        <Input
                          value={bucket.description}
                          onChange={(e) =>
                            updateDraftBucket(index, "description", e.target.value)
                          }
                          placeholder="Description (optional)"
                          autoComplete="off"
                          data-1p-ignore
                          data-lpignore="true"
                          data-form-type="other"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive shrink-0"
                        onClick={() => removeBucket(index)}
                        disabled={draftBuckets.length <= 2}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addBucket}
                  >
                    <Plus className="mr-2 size-3.5" />
                    Add Bucket
                  </Button>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingBuckets(false)}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" disabled={saving} onClick={saveBuckets}>
                      {saving && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                      Save Buckets
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {buckets.map((bucket) => (
                <div
                  key={bucket.id}
                  className="flex items-start gap-3 rounded-md bg-muted px-3 py-2"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {bucket.level}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{bucket.label}</p>
                    {bucket.description && (
                      <p className="text-xs text-muted-foreground">
                        {bucket.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {buckets.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No bucket definitions. Click Edit to add categories.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {round.style === "gate_check" && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-muted-foreground">
            Gate Check
          </h5>
          <p className="text-xs text-muted-foreground">
            Binary pass/fail criteria. Judges answer Yes or No for each gate.
            Configure criteria in the Criteria tab.
          </p>
        </div>
      )}

      {round.style && !["bucket_sort", "gate_check"].includes(round.style) && (
        <div className="rounded-md bg-muted px-3 py-2">
          <p className="text-sm text-muted-foreground">
            {STYLE_LABELS[round.style] ?? round.style} configuration coming
            soon.
          </p>
        </div>
      )}
    </div>
  )
}
