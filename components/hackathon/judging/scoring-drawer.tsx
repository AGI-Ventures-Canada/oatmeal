"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer"
import { Loader2, CheckCircle2, ExternalLink, Github } from "lucide-react"
import Image from "next/image"

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

interface ScoringDrawerProps {
  hackathonSlug: string
  assignmentId: string
  open: boolean
  onClose: () => void
  onScoreSubmitted: () => void
}

export function ScoringDrawer({
  hackathonSlug,
  assignmentId,
  open,
  onClose,
  onScoreSubmitted,
}: ScoringDrawerProps) {
  const [detail, setDetail] = useState<AssignmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingNotes, setSavingNotes] = useState(false)
  const notesTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!open || !assignmentId) return

    setLoading(true)
    setSubmitted(false)
    setError(null)

    fetch(`/api/public/hackathons/${hackathonSlug}/judging/assignments/${assignmentId}`)
      .then((res) => res.json())
      .then((data) => {
        setDetail(data)
        const initialScores: Record<string, number> = {}
        for (const c of data.criteria ?? []) {
          initialScores[c.id] = c.currentScore ?? 0
        }
        setScores(initialScores)
        setNotes(data.notes ?? "")
      })
      .catch(() => setError("Failed to load assignment"))
      .finally(() => setLoading(false))
  }, [open, assignmentId, hackathonSlug])

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
          // silent fail for auto-save
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

  async function handleSubmit() {
    if (!detail) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/public/hackathons/${hackathonSlug}/judging/assignments/${assignmentId}/scores`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scores: Object.entries(scores).map(([criteriaId, score]) => ({
              criteriaId,
              score,
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

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="max-h-[90vh]" onKeyDown={handleKeyDown}>
        {loading ? (
          <>
            <DrawerHeader className="sr-only">
              <DrawerTitle>Loading submission</DrawerTitle>
            </DrawerHeader>
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          </>
        ) : submitted ? (
          <>
            <DrawerHeader className="sr-only">
              <DrawerTitle>Scores submitted</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col items-center gap-3 py-12">
              <CheckCircle2 className="size-12 text-primary" />
              <p className="text-lg font-semibold">Scores Submitted</p>
              <p className="text-sm text-muted-foreground">Moving to next assignment...</p>
            </div>
          </>
        ) : detail ? (
          <div className="overflow-y-auto">
            <DrawerHeader>
              <DrawerTitle>{detail.submissionTitle}</DrawerTitle>
              {detail.teamName && (
                <p className="text-sm text-muted-foreground">by {detail.teamName}</p>
              )}
            </DrawerHeader>

            <div className="px-4 space-y-6 pb-4">
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

              {detail.submissionScreenshotUrl && (
                <div className="relative rounded-lg border overflow-hidden h-[200px]">
                  <Image
                    src={detail.submissionScreenshotUrl}
                    alt={detail.submissionTitle}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <div className="space-y-5">
                <h4 className="text-sm font-semibold">Scoring</h4>
                {detail.criteria.map((c) => (
                  <div key={c.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">{c.name}</Label>
                        {c.description && (
                          <p className="text-xs text-muted-foreground">{c.description}</p>
                        )}
                      </div>
                      <Badge variant="secondary">{c.weight}x</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[scores[c.id] ?? 0]}
                        onValueChange={([val]) =>
                          setScores((prev) => ({ ...prev, [c.id]: val }))
                        }
                        min={0}
                        max={c.max_score}
                        step={1}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min={0}
                        max={c.max_score}
                        value={scores[c.id] ?? 0}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(c.max_score, parseInt(e.target.value) || 0))
                          setScores((prev) => ({ ...prev, [c.id]: val }))
                        }}
                        className="w-16 text-center"
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                        data-form-type="other"
                      />
                      <span className="text-xs text-muted-foreground w-8">/{c.max_score}</span>
                    </div>
                  </div>
                ))}
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
            </div>

            <DrawerFooter>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Submit Scores
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        ) : (
          <>
            <DrawerHeader className="sr-only">
              <DrawerTitle>Error loading submission</DrawerTitle>
            </DrawerHeader>
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-destructive">{error || "Failed to load"}</p>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}
