"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Gavel, CheckCircle2, Circle } from "lucide-react"
import { ScoringDrawer } from "./scoring-drawer"

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

  const completed = completedIds.size
  const total = assignments.length

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
    <>
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
          <div className="space-y-2">
            {assignments.map((a) => {
              const isComplete = completedIds.has(a.id)
              return (
                <Button
                  key={a.id}
                  variant="ghost"
                  className="w-full justify-start gap-3 h-auto py-3"
                  onClick={() => setOpenAssignmentId(a.id)}
                >
                  {isComplete ? (
                    <CheckCircle2 className="size-4 text-primary shrink-0" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="text-left">
                    <p className="font-medium text-sm">{a.submissionTitle}</p>
                    {a.teamName && (
                      <p className="text-xs text-muted-foreground">{a.teamName}</p>
                    )}
                  </div>
                  <Badge variant={isComplete ? "default" : "outline"} className="ml-auto">
                    {isComplete ? "Scored" : "Pending"}
                  </Badge>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {openAssignmentId && (
        <ScoringDrawer
          hackathonSlug={hackathonSlug}
          assignmentId={openAssignmentId}
          open={true}
          onClose={() => setOpenAssignmentId(null)}
          onScoreSubmitted={() => handleScoreSubmitted(openAssignmentId)}
        />
      )}
    </>
  )
}
