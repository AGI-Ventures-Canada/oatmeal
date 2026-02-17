"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  Shuffle,
  UserPlus,
} from "lucide-react"

type Judge = {
  participantId: string
  clerkUserId: string
  assignmentCount: number
  completedCount: number
}

type Assignment = {
  id: string
  judgeParticipantId: string
  judgeName: string
  submissionId: string
  submissionTitle: string
  isComplete: boolean
  assignedAt: string
}

type Submission = {
  id: string
  title: string
}

interface JudgeAssignmentsProps {
  hackathonId: string
  initialJudges: Judge[]
  initialAssignments: Assignment[]
  submissions: Submission[]
}

export function JudgeAssignments({
  hackathonId,
  initialJudges,
  initialAssignments,
  submissions,
}: JudgeAssignmentsProps) {
  const [judges, setJudges] = useState<Judge[]>(initialJudges)
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)

  const [addJudgeOpen, setAddJudgeOpen] = useState(false)
  const [judgeEmail, setJudgeEmail] = useState("")
  const [addingJudge, setAddingJudge] = useState(false)
  const [addJudgeError, setAddJudgeError] = useState<string | null>(null)
  const [addJudgeSuccess, setAddJudgeSuccess] = useState(false)

  const [removingJudgeId, setRemovingJudgeId] = useState<string | null>(null)
  const [removeJudgeError, setRemoveJudgeError] = useState<string | null>(null)

  const [selectedJudgeId, setSelectedJudgeId] = useState("")
  const [selectedSubmissionId, setSelectedSubmissionId] = useState("")
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignSuccess, setAssignSuccess] = useState(false)

  const [autoAssignCount, setAutoAssignCount] = useState("3")
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [autoAssignError, setAutoAssignError] = useState<string | null>(null)
  const [autoAssignSuccess, setAutoAssignSuccess] = useState(false)

  const [removingAssignmentId, setRemovingAssignmentId] = useState<string | null>(null)
  const [removeAssignmentError, setRemoveAssignmentError] = useState<string | null>(null)

  const base = `/api/dashboard/hackathons/${hackathonId}/judging`

  function openAddJudge() {
    setJudgeEmail("")
    setAddJudgeError(null)
    setAddJudgeSuccess(false)
    setAddJudgeOpen(true)
  }

  async function handleAddJudge(e: React.FormEvent) {
    e.preventDefault()
    const email = judgeEmail.trim()
    if (!email) {
      setAddJudgeError("Email is required")
      return
    }
    setAddingJudge(true)
    setAddJudgeError(null)

    try {
      const res = await fetch(`${base}/judges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to add judge")
      }
      const data = await res.json()
      setJudges((prev) => [
        ...prev,
        {
          participantId: data.participantId,
          clerkUserId: data.clerkUserId,
          assignmentCount: 0,
          completedCount: 0,
        },
      ])
      setAddJudgeSuccess(true)
      setTimeout(() => setAddJudgeOpen(false), 800)
    } catch (err) {
      setAddJudgeError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setAddingJudge(false)
    }
  }

  function handleAddJudgeKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !addingJudge) {
      e.preventDefault()
      handleAddJudge(e as unknown as React.FormEvent)
    }
  }

  async function handleRemoveJudge(participantId: string) {
    setRemovingJudgeId(participantId)
    setRemoveJudgeError(null)

    try {
      const res = await fetch(`${base}/judges/${participantId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to remove judge")
      setJudges((prev) => prev.filter((j) => j.participantId !== participantId))
      setAssignments((prev) =>
        prev.filter((a) => a.judgeParticipantId !== participantId)
      )
    } catch {
      setRemoveJudgeError("Failed to remove judge")
    } finally {
      setRemovingJudgeId(null)
    }
  }

  async function handleManualAssign() {
    if (!selectedJudgeId || !selectedSubmissionId) return
    setAssigning(true)
    setAssignError(null)
    setAssignSuccess(false)

    try {
      const res = await fetch(`${base}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judgeParticipantId: selectedJudgeId,
          submissionId: selectedSubmissionId,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to assign")
      }
      const data = await res.json()
      const judge = judges.find((j) => j.participantId === selectedJudgeId)
      const submission = submissions.find((s) => s.id === selectedSubmissionId)
      setAssignments((prev) => [
        ...prev,
        {
          id: data.id,
          judgeParticipantId: selectedJudgeId,
          judgeName: judge?.clerkUserId ?? selectedJudgeId,
          submissionId: selectedSubmissionId,
          submissionTitle: submission?.title ?? selectedSubmissionId,
          isComplete: false,
          assignedAt: new Date().toISOString(),
        },
      ])
      setJudges((prev) =>
        prev.map((j) =>
          j.participantId === selectedJudgeId
            ? { ...j, assignmentCount: j.assignmentCount + 1 }
            : j
        )
      )
      setAssignSuccess(true)
      setTimeout(() => setAssignSuccess(false), 2000)
      setSelectedJudgeId("")
      setSelectedSubmissionId("")
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setAssigning(false)
    }
  }

  async function handleAutoAssign() {
    const count = parseInt(autoAssignCount)
    if (!count || count < 1) return
    setAutoAssigning(true)
    setAutoAssignError(null)
    setAutoAssignSuccess(false)

    try {
      const res = await fetch(`${base}/auto-assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionsPerJudge: count }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to auto-assign")
      }
      const data = await res.json()
      if (data.assignments) {
        setAssignments(data.assignments)
      }
      if (data.judges) {
        setJudges(data.judges)
      }
      setAutoAssignSuccess(true)
      setTimeout(() => setAutoAssignSuccess(false), 3000)
    } catch (err) {
      setAutoAssignError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setAutoAssigning(false)
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    setRemovingAssignmentId(assignmentId)
    setRemoveAssignmentError(null)

    const assignment = assignments.find((a) => a.id === assignmentId)

    try {
      const res = await fetch(`${base}/assignments/${assignmentId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to remove assignment")
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId))
      if (assignment) {
        setJudges((prev) =>
          prev.map((j) =>
            j.participantId === assignment.judgeParticipantId
              ? {
                  ...j,
                  assignmentCount: Math.max(0, j.assignmentCount - 1),
                  completedCount: assignment.isComplete
                    ? Math.max(0, j.completedCount - 1)
                    : j.completedCount,
                }
              : j
          )
        )
      }
    } catch {
      setRemoveAssignmentError("Failed to remove assignment")
    } finally {
      setRemovingAssignmentId(null)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Judges</h3>
            <p className="text-sm text-muted-foreground">
              Manage judges assigned to this hackathon
            </p>
          </div>
          <Dialog open={addJudgeOpen} onOpenChange={setAddJudgeOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openAddJudge}>
                <Plus className="mr-2 size-4" />
                Add Judge
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Judge</DialogTitle>
              </DialogHeader>
              {addJudgeSuccess ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <CheckCircle2 className="size-10 text-primary" />
                  <p className="text-sm font-medium">Judge added</p>
                </div>
              ) : (
                <form
                  onSubmit={handleAddJudge}
                  onKeyDown={handleAddJudgeKeyDown}
                  autoComplete="off"
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="judge-email">Email</Label>
                    <Input
                      id="judge-email"
                      name="judge-email"
                      type="email"
                      value={judgeEmail}
                      onChange={(e) => setJudgeEmail(e.target.value)}
                      placeholder="judge@example.com"
                      autoComplete="off"
                      data-1p-ignore
                      data-lpignore="true"
                      data-form-type="other"
                    />
                  </div>
                  {addJudgeError && (
                    <p className="text-sm text-destructive">{addJudgeError}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAddJudgeOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addingJudge}>
                      {addingJudge && (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      )}
                      Add Judge
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {removeJudgeError && (
          <p className="text-sm text-destructive">{removeJudgeError}</p>
        )}

        {judges.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No judges added yet. Add judges to begin assignment.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {judges.map((judge) => {
              const progress =
                judge.assignmentCount > 0
                  ? Math.round(
                      (judge.completedCount / judge.assignmentCount) * 100
                    )
                  : 0
              return (
                <div
                  key={judge.participantId}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {judge.clerkUserId}
                      </span>
                      <Badge variant="secondary">
                        {judge.assignmentCount} assigned
                      </Badge>
                      <Badge variant="outline">
                        {judge.completedCount} completed
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={progress} className="max-w-48" />
                      <span className="text-xs text-muted-foreground">
                        {progress}%
                      </span>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        disabled={removingJudgeId === judge.participantId}
                      >
                        {removingJudgeId === judge.participantId ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove judge?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove the judge and all their assignments.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            handleRemoveJudge(judge.participantId)
                          }
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Assign Submissions</h3>
          <p className="text-sm text-muted-foreground">
            Manually assign a submission to a judge, or auto-assign in bulk
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label>Judge</Label>
            <Select value={selectedJudgeId} onValueChange={setSelectedJudgeId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select judge" />
              </SelectTrigger>
              <SelectContent>
                {judges.map((j) => (
                  <SelectItem key={j.participantId} value={j.participantId}>
                    {j.clerkUserId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Submission</Label>
            <Select
              value={selectedSubmissionId}
              onValueChange={setSelectedSubmissionId}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select submission" />
              </SelectTrigger>
              <SelectContent>
                {submissions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            onClick={handleManualAssign}
            disabled={assigning || !selectedJudgeId || !selectedSubmissionId}
          >
            {assigning ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 size-4" />
            )}
            Assign
          </Button>
        </div>

        {assignError && (
          <p className="text-sm text-destructive">{assignError}</p>
        )}
        {assignSuccess && (
          <p className="text-sm text-primary">Assignment created</p>
        )}

        <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
          <div className="space-y-2">
            <Label htmlFor="auto-assign-count">Submissions per judge</Label>
            <Input
              id="auto-assign-count"
              name="auto-assign-count"
              type="number"
              min={1}
              value={autoAssignCount}
              onChange={(e) => setAutoAssignCount(e.target.value)}
              className="w-24"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAutoAssign}
            disabled={autoAssigning || judges.length === 0}
          >
            {autoAssigning ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Shuffle className="mr-2 size-4" />
            )}
            Auto-Assign
          </Button>
          {autoAssignError && (
            <p className="text-sm text-destructive">{autoAssignError}</p>
          )}
          {autoAssignSuccess && (
            <p className="text-sm text-primary">Auto-assignment complete</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Assignments</h3>
          <p className="text-sm text-muted-foreground">
            {assignments.length} total assignment{assignments.length !== 1 ? "s" : ""}
          </p>
        </div>

        {removeAssignmentError && (
          <p className="text-sm text-destructive">{removeAssignmentError}</p>
        )}

        {assignments.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No assignments yet. Assign submissions to judges above.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judge</TableHead>
                  <TableHead>Submission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.judgeName}
                    </TableCell>
                    <TableCell>{a.submissionTitle}</TableCell>
                    <TableCell>
                      {a.isComplete ? (
                        <Badge variant="default">Complete</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(a.assignedAt)}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive"
                            disabled={removingAssignmentId === a.id}
                          >
                            {removingAssignmentId === a.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove assignment?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the assignment of &quot;{a.submissionTitle}&quot; from {a.judgeName}. Any existing scores will be deleted.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveAssignment(a.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
