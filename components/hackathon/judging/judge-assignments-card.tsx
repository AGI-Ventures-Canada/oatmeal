"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Gavel, CheckCircle2, Circle, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { ScoringPanel } from "./scoring-panel"

const PAGE_SIZE = 20

type JudgeAssignment = {
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
}

interface JudgeAssignmentsCardProps {
  hackathonSlug: string
  assignments: JudgeAssignment[]
}

export function JudgeAssignmentsCard({
  hackathonSlug,
  assignments,
}: JudgeAssignmentsCardProps) {
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    new Set(assignments.filter((a) => a.isComplete).map((a) => a.id))
  )
  const [page, setPage] = useState(0)

  const completed = completedIds.size
  const total = assignments.length
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const pageAssignments = assignments.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleScoreSubmitted(assignmentId: string) {
    setCompletedIds((prev) => new Set([...prev, assignmentId]))

    const currentIdx = assignments.findIndex((a) => a.id === assignmentId)
    const nextUnscored = assignments.find(
      (a, idx) => idx > currentIdx && !completedIds.has(a.id) && a.id !== assignmentId
    )
    if (nextUnscored) {
      setTimeout(() => setOpenAssignmentId(nextUnscored.id), 500)
    } else {
      setTimeout(() => setOpenAssignmentId(null), 500)
    }
  }

  if (assignments.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gavel className="size-4" />
            Your Judging Assignments
          </CardTitle>
          <Badge variant="secondary">
            {completed}/{total} scored
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {pageAssignments.map((a) => {
            const isComplete = completedIds.has(a.id)
            const isOpen = openAssignmentId === a.id

            return (
              <div key={a.id} className={`rounded-lg border ${isOpen ? "border-border" : "border-transparent"}`}>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-auto py-3"
                  onClick={() => setOpenAssignmentId(isOpen ? null : a.id)}
                >
                  {isComplete ? (
                    <CheckCircle2 className="size-4 text-primary shrink-0" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="text-left flex-1">
                    <p className="font-medium text-sm">{a.submissionTitle}</p>
                    {a.teamName && (
                      <p className="text-xs text-muted-foreground">{a.teamName}</p>
                    )}
                  </div>
                  <Badge variant={isComplete ? "default" : "outline"}>
                    {isComplete ? "Scored" : "Pending"}
                  </Badge>
                  <ChevronDown
                    className={`size-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </Button>

                {isOpen && (
                  <div className="border-t px-4 py-4">
                    <ScoringPanel
                      hackathonSlug={hackathonSlug}
                      assignmentId={a.id}
                      onClose={() => setOpenAssignmentId(null)}
                      onScoreSubmitted={() => handleScoreSubmitted(a.id)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <span className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={page === totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
