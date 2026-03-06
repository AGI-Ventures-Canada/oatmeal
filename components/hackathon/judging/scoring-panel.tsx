"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  CheckCircle2,
  ExternalLink,
  Github,
  Maximize2,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  decimalWeightToPercentage,
} from "@/lib/utils/judging"

type CriterionWithScore = {
  id: string
  name: string
  description: string | null
  max_score: number
  weight: number
  currentScore: number | null
}

type AssignmentDetail = {
  id: string
  submissionId: string
  submissionTitle: string
  submissionDescription: string | null
  submissionGithubUrl: string | null
  submissionLiveAppUrl: string | null
  submissionScreenshotUrl: string | null
  teamName: string | null
  isComplete: boolean
  notes: string
  criteria: CriterionWithScore[]
}

interface ScoringPanelProps {
  hackathonSlug: string
  assignmentId: string
  onClose: () => void
  onScoreSubmitted: () => void
  cancelLabel?: string
}

export function ScoringPanel({
  hackathonSlug,
  assignmentId,
  onClose,
  onScoreSubmitted,
  cancelLabel = "Cancel",
}: ScoringPanelProps) {
  const [detail, setDetail] = useState<AssignmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [scores, setScores] = useState<Record<string, number | null>>({})
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingNotes, setSavingNotes] = useState(false)
  const [screenshotOpen, setScreenshotOpen] = useState(false)
  const notesTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    setLoading(true)
    setSubmitted(false)
    setError(null)

    fetch(`/api/public/hackathons/${hackathonSlug}/judging/assignments/${assignmentId}`)
      .then((res) => res.json())
      .then((data) => {
        setDetail(data)
        const initialScores: Record<string, number | null> = {}
        for (const criterion of data.criteria ?? []) {
          initialScores[criterion.id] =
            criterion.currentScore === 0 || criterion.currentScore === 1
              ? criterion.currentScore
              : null
        }
        setScores(initialScores)
        setNotes(data.notes ?? "")
      })
      .catch(() => setError("Failed to load assignment"))
      .finally(() => setLoading(false))
  }, [assignmentId, hackathonSlug])

  const debouncedSaveNotes = useCallback(
    (value: string) => {
      clearTimeout(notesTimeoutRef.current)
      notesTimeoutRef.current = setTimeout(async () => {
        setSavingNotes(true)
        try {
          await fetch(
            `/api/public/hackathons/${hackathonSlug}/judging/assignments/${assignmentId}/notes`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ notes: value }),
            }
          )
        } catch {
          return
        } finally {
          setSavingNotes(false)
        }
      }, 1000)
    },
    [hackathonSlug, assignmentId]
  )

  function handleNotesChange(value: string) {
    setNotes(value)
    debouncedSaveNotes(value)
  }

  function setBinaryScore(criteriaId: string, score: 0 | 1) {
    setScores((prev) => ({ ...prev, [criteriaId]: score }))
  }

  async function handleSubmit() {
    if (!detail) return
    setSubmitting(true)
    setError(null)

    if (detail.criteria.some((criterion) => scores[criterion.id] === null)) {
      setError("Mark each criterion as good or bad before submitting")
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch(
        `/api/public/hackathons/${hackathonSlug}/judging/assignments/${assignmentId}/scores`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scores: detail.criteria.map((criterion) => ({
              criteriaId: criterion.id,
              score: scores[criterion.id] as 0 | 1,
            })),
            notes,
          }),
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to submit")
      }

      setSubmitted(true)
      onScoreSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit scores")
    } finally {
      setSubmitting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !submitting) {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <CheckCircle2 className="size-10 text-primary" />
        <p className="text-base font-semibold">Scores Submitted</p>
        <p className="text-sm text-muted-foreground">Moving to next assignment...</p>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-destructive">{error || "Failed to load"}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6" onKeyDown={handleKeyDown}>
      {detail.submissionScreenshotUrl && (
        <>
          <div className="group relative overflow-hidden rounded-lg border">
            <Image
              src={detail.submissionScreenshotUrl}
              alt={detail.submissionTitle}
              width={1920}
              height={1080}
              unoptimized
              className="h-[180px] w-full object-cover"
            />
            <button
              type="button"
              onClick={() => setScreenshotOpen(true)}
              className="absolute top-2 right-2 flex items-center gap-1.5 rounded-md bg-background/80 px-2 py-1 text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Maximize2 className="size-3" />
              View full
            </button>
          </div>

          <Dialog open={screenshotOpen} onOpenChange={setScreenshotOpen}>
            <DialogContent className="w-full max-w-6xl p-2">
              <DialogTitle className="sr-only">
                {detail.submissionTitle} screenshot
              </DialogTitle>
              <DialogDescription className="sr-only">
                Full-size submission screenshot
              </DialogDescription>
              <Image
                src={detail.submissionScreenshotUrl}
                alt={detail.submissionTitle}
                width={1920}
                height={1080}
                unoptimized
                className="h-auto w-full rounded-md"
              />
            </DialogContent>
          </Dialog>
        </>
      )}

      {detail.submissionDescription && (
        <p className="text-sm text-muted-foreground">{detail.submissionDescription}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {detail.submissionGithubUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={detail.submissionGithubUrl} target="_blank" rel="noopener noreferrer">
              <Github className="mr-2 size-3.5" />
              GitHub
            </a>
          </Button>
        )}
        {detail.submissionLiveAppUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={detail.submissionLiveAppUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 size-3.5" />
              Live Demo
            </a>
          </Button>
        )}
      </div>

      <div className="space-y-5">
        <h4 className="text-sm font-semibold">Pass / Fail</h4>
        {detail.criteria.map((criterion) => {
          const score = scores[criterion.id]

          return (
            <div key={criterion.id} className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Label className="text-sm font-medium">{criterion.name}</Label>
                  {criterion.description && (
                    <p className="text-xs text-muted-foreground">{criterion.description}</p>
                  )}
                </div>
                <Badge variant="secondary">
                  {decimalWeightToPercentage(criterion.weight)}%
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={score === 1 ? "default" : "outline"}
                  onClick={() => setBinaryScore(criterion.id, 1)}
                >
                  <ThumbsUp className="mr-2 size-4" />
                  Good
                </Button>
                <Button
                  type="button"
                  variant={score === 0 ? "destructive" : "outline"}
                  onClick={() => setBinaryScore(criterion.id, 0)}
                >
                  <ThumbsDown className="mr-2 size-4" />
                  Bad
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Notes</Label>
          {savingNotes && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
        </div>
        <Textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Add your notes about this submission..."
          rows={3}
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          Submit Scores
        </Button>
        <Button variant="outline" onClick={onClose}>
          {cancelLabel}
        </Button>
      </div>
    </div>
  )
}
