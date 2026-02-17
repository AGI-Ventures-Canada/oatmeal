"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2, Users } from "lucide-react"

interface ScoringProgressProps {
  hackathonId: string
  progress: {
    totalAssignments: number
    completedAssignments: number
    judges: {
      participantId: string
      clerkUserId: string
      completed: number
      total: number
    }[]
  }
  anonymousJudging: boolean
}

export function ScoringProgress({
  hackathonId,
  progress,
  anonymousJudging: initialAnonymous,
}: ScoringProgressProps) {
  const [anonymous, setAnonymous] = useState(initialAnonymous)
  const [toggling, setToggling] = useState(false)

  const overallPercent =
    progress.totalAssignments > 0
      ? Math.round(
          (progress.completedAssignments / progress.totalAssignments) * 100
        )
      : 0

  async function handleToggleAnonymous(checked: boolean) {
    setToggling(true)
    const previous = anonymous
    setAnonymous(checked)

    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/settings`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ anonymousJudging: checked }),
        }
      )
      if (!res.ok) {
        setAnonymous(previous)
      }
    } catch {
      setAnonymous(previous)
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Scoring Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {progress.completedAssignments} of {progress.totalAssignments}{" "}
              assignments scored
            </span>
            <span className="font-medium">{overallPercent}%</span>
          </div>
          <Progress value={overallPercent} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="anonymous-judging">Anonymous judging</Label>
              {toggling && (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
            <Switch
              id="anonymous-judging"
              checked={anonymous}
              onCheckedChange={handleToggleAnonymous}
              disabled={toggling}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-4" />
            Judge Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          {progress.judges.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No judges assigned yet.
            </p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judge</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="w-[120px] text-right">
                      Progress
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {progress.judges.map((judge) => {
                    const judgePercent =
                      judge.total > 0
                        ? Math.round((judge.completed / judge.total) * 100)
                        : 0
                    return (
                      <TableRow key={judge.participantId}>
                        <TableCell className="font-medium">
                          {judge.clerkUserId}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {judge.completed} / {judge.total}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Progress
                              value={judgePercent}
                              className="h-1.5 w-16"
                            />
                            <span className="w-9 text-right text-muted-foreground">
                              {judgePercent}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
