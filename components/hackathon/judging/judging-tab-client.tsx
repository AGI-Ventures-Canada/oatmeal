"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  UserPlus,
  Trash2,
  MoreHorizontal,
  Trophy,
  Users,
  Calculator,
  Globe,
  GlobeLock,
  Loader2,
  Clock,
  Mail,
  Layers,
  Vote,
  ListChecks,
  ArrowUpDown,
  Award,
  UserMinus,
} from "lucide-react"
import { AddJudgeDialog } from "./add-judge-dialog"
import { AddPrizeDialog } from "./add-prize-dialog"

type PrizeData = {
  id: string
  name: string
  description: string | null
  value: string | null
  judgingStyle: string | null
  assignmentMode: string | null
  maxPicks: number | null
  roundId: string | null
  displayOrder: number
  totalAssignments: number
  completedAssignments: number
  judgeCount: number
}

type JudgeData = {
  participantId: string
  clerkUserId: string
  displayName: string
  email: string | null
  imageUrl: string | null
  prizeIds: string[]
}

type RoundData = {
  id: string
  name: string
  status: string
  isActive: boolean
  displayOrder: number
}

type InvitationData = {
  id: string
  email: string
  status: string
  createdAt: string
}

type ResultData = {
  id: string
  rank: number
  submissionId: string
  submissionTitle: string
  teamName: string | null
  totalScore: number | null
  weightedScore: number | null
  judgeCount: number
  publishedAt: string | null
  prizes: { id: string; name: string; value: string | null }[]
}

interface JudgingTabClientProps {
  hackathonId: string
  prizes: PrizeData[]
  judges: JudgeData[]
  progress: { totalAssignments: number; completedAssignments: number; judges: { participantId: string; clerkUserId: string; displayName: string; completed: number; total: number }[] }
  rounds: RoundData[]
  pendingInvitations: InvitationData[]
  results: ResultData[]
  submissions: Array<{ id: string; title: string }>
  isPublished: boolean
}

const STYLE_META: Record<string, { label: string; icon: typeof Trophy; color: string }> = {
  bucket_sort: { label: "Bucket Sort", icon: ArrowUpDown, color: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  gate_check: { label: "Gate Check", icon: ListChecks, color: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  crowd_vote: { label: "Crowd Vote", icon: Vote, color: "bg-green-500/10 text-green-700 dark:text-green-400" },
  judges_pick: { label: "Judge's Pick", icon: Award, color: "bg-purple-500/10 text-purple-700 dark:text-purple-400" },
}

export function JudgingTabClient({
  hackathonId,
  prizes: initialPrizes,
  judges: initialJudges,
  progress: initialProgress,
  rounds,
  pendingInvitations: initialInvitations,
  results: initialResults,
  submissions,
  isPublished: initialIsPublished,
}: JudgingTabClientProps) {
  const router = useRouter()
  const [showAddJudge, setShowAddJudge] = useState(false)
  const [showAddPrize, setShowAddPrize] = useState(false)
  const [deletingPrize, setDeletingPrize] = useState<string | null>(null)
  const [removingJudge, setRemovingJudge] = useState<string | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [results, setResults] = useState(initialResults)
  const [isPublished, setIsPublished] = useState(initialIsPublished)
  const [error, setError] = useState<string | null>(null)

  const base = `/api/dashboard/hackathons/${hackathonId}`

  const overallPercent = initialProgress.totalAssignments > 0
    ? Math.round((initialProgress.completedAssignments / initialProgress.totalAssignments) * 100)
    : 0

  async function handleDeletePrize(prizeId: string) {
    setDeletingPrize(prizeId)
    try {
      const res = await fetch(`${base}/prizes/${prizeId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      router.refresh()
    } catch {
      setError("Failed to delete prize")
    } finally {
      setDeletingPrize(null)
    }
  }

  async function handleRemoveJudge(participantId: string) {
    setRemovingJudge(participantId)
    try {
      const res = await fetch(`${base}/judging/judges/${participantId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to remove")
      router.refresh()
    } catch {
      setError("Failed to remove judge")
    } finally {
      setRemovingJudge(null)
    }
  }

  async function handleCancelInvitation(invitationId: string) {
    try {
      const res = await fetch(`${base}/judging/invitations/${invitationId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to cancel")
      router.refresh()
    } catch {
      setError("Failed to cancel invitation")
    }
  }

  async function handleAssignJudge(prizeId: string, judgeParticipantId: string) {
    try {
      const res = await fetch(`${base}/prizes/${prizeId}/assign-judge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judgeParticipantId }),
      })
      if (!res.ok) throw new Error("Failed to assign")
      router.refresh()
    } catch {
      setError("Failed to assign judge to prize")
    }
  }

  async function handleUnassignJudge(prizeId: string, judgeParticipantId: string) {
    try {
      const res = await fetch(`${base}/prizes/${prizeId}/judges/${judgeParticipantId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to unassign")
      router.refresh()
    } catch {
      setError("Failed to remove judge from prize")
    }
  }

  async function handleCalculateResults() {
    setCalculating(true)
    setError(null)
    try {
      const res = await fetch(`${base}/results/calculate`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to calculate")
      }
      const resultsRes = await fetch(`${base}/results`)
      if (resultsRes.ok) {
        const data = await resultsRes.json()
        setResults(data.results)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to calculate results")
    } finally {
      setCalculating(false)
    }
  }

  async function handlePublish() {
    setPublishing(true)
    setError(null)
    try {
      const res = await fetch(`${base}/results/publish`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to publish")
      setIsPublished(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish")
    } finally {
      setPublishing(false)
    }
  }

  async function handleUnpublish() {
    setPublishing(true)
    setError(null)
    try {
      const res = await fetch(`${base}/results/unpublish`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to unpublish")
      setIsPublished(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unpublish")
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {initialProgress.totalAssignments > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {initialProgress.completedAssignments} of {initialProgress.totalAssignments} assignments scored
            </span>
            <span className="font-medium">{overallPercent}%</span>
          </div>
          <Progress value={overallPercent} />
        </div>
      )}

      <JudgesSection
        judges={initialJudges}
        invitations={initialInvitations}
        hackathonId={hackathonId}
        onAddJudge={() => setShowAddJudge(true)}
        onRemoveJudge={handleRemoveJudge}
        onCancelInvitation={handleCancelInvitation}
        removingJudge={removingJudge}
      />

      <PrizesSection
        prizes={initialPrizes}
        judges={initialJudges}
        rounds={rounds}
        onAddPrize={() => setShowAddPrize(true)}
        onDeletePrize={handleDeletePrize}
        onAssignJudge={handleAssignJudge}
        onUnassignJudge={handleUnassignJudge}
        deletingPrize={deletingPrize}
      />

      {(initialPrizes.length > 0 || results.length > 0) && (
        <ResultsSection
          hackathonId={hackathonId}
          results={results}
          isPublished={isPublished}
          calculating={calculating}
          publishing={publishing}
          onCalculate={handleCalculateResults}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
          incompleteAssignments={initialProgress.totalAssignments - initialProgress.completedAssignments}
        />
      )}

      <AddJudgeDialog
        hackathonId={hackathonId}
        open={showAddJudge}
        onOpenChange={setShowAddJudge}
        onSuccess={() => router.refresh()}
      />

      <AddPrizeDialog
        hackathonId={hackathonId}
        open={showAddPrize}
        onOpenChange={setShowAddPrize}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}

function JudgesSection({
  judges,
  invitations,
  hackathonId,
  onAddJudge,
  onRemoveJudge,
  onCancelInvitation,
  removingJudge,
}: {
  judges: JudgeData[]
  invitations: InvitationData[]
  hackathonId: string
  onAddJudge: () => void
  onRemoveJudge: (id: string) => void
  onCancelInvitation: (id: string) => void
  removingJudge: string | null
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4" />
          Judges
          {judges.length > 0 && (
            <Badge variant="secondary">{judges.length}</Badge>
          )}
        </CardTitle>
        <Button size="sm" variant="outline" onClick={onAddJudge}>
          <UserPlus className="mr-2 size-4" />
          <span className="hidden sm:inline">Add Judge</span>
        </Button>
      </CardHeader>
      <CardContent>
        {judges.length === 0 && invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No judges yet. Add judges to start assigning them to prizes.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {judges.map((judge) => (
                <div
                  key={judge.participantId}
                  className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm"
                >
                  <Avatar size="sm">
                    {judge.imageUrl && <AvatarImage src={judge.imageUrl} alt={judge.displayName} />}
                    <AvatarFallback>{judge.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{judge.displayName}</span>
                  {judge.prizeIds.length > 0 && (
                    <Badge variant="secondary" className="text-xs">{judge.prizeIds.length} prize{judge.prizeIds.length !== 1 ? "s" : ""}</Badge>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-6">
                        <MoreHorizontal className="size-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        disabled={removingJudge === judge.participantId}
                        onClick={() => onRemoveJudge(judge.participantId)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Remove Judge
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-1.5 text-sm text-muted-foreground"
                >
                  <Mail className="size-3.5" />
                  <span>{inv.email}</span>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="mr-1 size-3" />
                    Invited
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => onCancelInvitation(inv.id)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PrizesSection({
  prizes,
  judges,
  rounds,
  onAddPrize,
  onDeletePrize,
  onAssignJudge,
  onUnassignJudge,
  deletingPrize,
}: {
  prizes: PrizeData[]
  judges: JudgeData[]
  rounds: RoundData[]
  onAddPrize: () => void
  onDeletePrize: (id: string) => void
  onAssignJudge: (prizeId: string, judgeParticipantId: string) => void
  onUnassignJudge: (prizeId: string, judgeParticipantId: string) => void
  deletingPrize: string | null
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Trophy className="size-4" />
          Prizes
        </h3>
        <Button size="sm" onClick={onAddPrize}>
          <Plus className="mr-2 size-4" />
          <span className="hidden sm:inline">Add Prize</span>
        </Button>
      </div>

      {rounds.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Layers className="size-4 text-muted-foreground shrink-0" />
          {rounds.map((round, i) => (
            <div key={round.id} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-muted-foreground">&rarr;</span>}
              <Badge variant={round.isActive ? "default" : "outline"}>
                {round.name}
                {round.isActive && " (Active)"}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {prizes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="size-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground text-center">
              No prizes yet. Add a prize to set up judging.
            </p>
            <Button size="sm" variant="outline" className="mt-4" onClick={onAddPrize}>
              <Plus className="mr-2 size-4" />
              Add First Prize
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {prizes.map((prize) => {
            const style = prize.judgingStyle ? STYLE_META[prize.judgingStyle] : null
            const StyleIcon = style?.icon ?? Trophy
            const pct = prize.totalAssignments > 0
              ? Math.round((prize.completedAssignments / prize.totalAssignments) * 100)
              : 0
            const assignedJudges = judges.filter((j) => j.prizeIds.includes(prize.id))
            const isCrowdVote = prize.judgingStyle === "crowd_vote"

            return (
              <Card key={prize.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{prize.name}</span>
                        {prize.value && (
                          <Badge variant="secondary">{prize.value}</Badge>
                        )}
                        {style && (
                          <Badge variant="outline" className={style.color}>
                            <StyleIcon className="mr-1 size-3" />
                            {style.label}
                          </Badge>
                        )}
                      </div>
                      {prize.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{prize.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {prize.totalAssignments > 0 && (
                        <div className="flex items-center gap-2 w-24">
                          <Progress value={pct} className="h-1.5" />
                          <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                        </div>
                      )}

                      <AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 size-4" />
                                Delete Prize
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete &ldquo;{prize.name}&rdquo;?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will delete the prize and all its judge assignments, bucket definitions, and results. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDeletePrize(prize.id)}
                              disabled={deletingPrize === prize.id}
                            >
                              {deletingPrize === prize.id ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                              ) : null}
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {!isCrowdVote && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {assignedJudges.map((j) => (
                        <button
                          key={j.participantId}
                          type="button"
                          onClick={() => onUnassignJudge(prize.id, j.participantId)}
                          className="group flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs transition-colors hover:border-destructive hover:bg-destructive/10"
                        >
                          <Avatar size="sm">
                            {j.imageUrl && <AvatarImage src={j.imageUrl} alt={j.displayName} />}
                            <AvatarFallback className="text-[10px]">{j.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="truncate max-w-[100px]">{j.displayName}</span>
                          <UserMinus className="size-3 text-muted-foreground group-hover:text-destructive" />
                        </button>
                      ))}

                      {judges.length > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 rounded-full gap-1.5">
                              <Plus className="size-3" />
                              <span className="hidden sm:inline">
                                {assignedJudges.length === 0 ? "Assign Judges" : "Add"}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-1" align="start">
                            {judges
                              .filter((j) => !j.prizeIds.includes(prize.id))
                              .map((judge) => (
                                <button
                                  key={judge.participantId}
                                  type="button"
                                  onClick={() => onAssignJudge(prize.id, judge.participantId)}
                                  className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                                >
                                  <Avatar size="sm">
                                    {judge.imageUrl && <AvatarImage src={judge.imageUrl} alt={judge.displayName} />}
                                    <AvatarFallback className="text-[10px]">{judge.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <span className="truncate">{judge.displayName}</span>
                                </button>
                              ))}
                            {judges.filter((j) => !j.prizeIds.includes(prize.id)).length === 0 && (
                              <p className="px-2 py-3 text-sm text-muted-foreground text-center">
                                All judges assigned
                              </p>
                            )}
                          </PopoverContent>
                        </Popover>
                      )}

                      {judges.length === 0 && (
                        <span className="text-xs text-muted-foreground">Add judges above first</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ResultsSection({
  hackathonId,
  results,
  isPublished,
  calculating,
  publishing,
  onCalculate,
  onPublish,
  onUnpublish,
  incompleteAssignments,
}: {
  hackathonId: string
  results: ResultData[]
  isPublished: boolean
  calculating: boolean
  publishing: boolean
  onCalculate: () => void
  onPublish: () => void
  onUnpublish: () => void
  incompleteAssignments: number
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Calculator className="size-4" />
          Results
          {isPublished && <Badge>Published</Badge>}
        </h3>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={calculating}>
                {calculating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Calculator className="mr-2 size-4" />}
                Recalculate
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Recalculate Results?</AlertDialogTitle>
                <AlertDialogDescription>
                  Rankings update automatically as judges score. Use this to force a full recalculation if results look stale.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onCalculate}>Calculate</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {isPublished ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={publishing}>
                  {publishing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <GlobeLock className="mr-2 size-4" />}
                  Unpublish
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Unpublish Results?</AlertDialogTitle>
                  <AlertDialogDescription>Results will no longer be visible to participants.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onUnpublish}>Unpublish</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={publishing || results.length === 0}>
                  {publishing ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Globe className="mr-2 size-4" />}
                  Publish
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Publish Results?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Results will be visible to all participants. Winner notification emails will be sent.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onPublish}>Publish</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {incompleteAssignments > 0 && (
        <p className="text-sm text-muted-foreground">
          {incompleteAssignments} assignment{incompleteAssignments !== 1 ? "s" : ""} not yet completed.
        </p>
      )}

      {results.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No results yet. Calculate results after judges have submitted their scores.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Rank</TableHead>
                <TableHead>Submission</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Judges</TableHead>
                <TableHead>Prizes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-bold text-lg">#{r.rank}</TableCell>
                  <TableCell className="font-medium">{r.submissionTitle}</TableCell>
                  <TableCell className="text-muted-foreground">{r.teamName || "\u2014"}</TableCell>
                  <TableCell className="text-right font-mono">
                    {r.weightedScore !== null ? Number(r.weightedScore).toFixed(2) : "\u2014"}
                  </TableCell>
                  <TableCell className="text-right">{r.judgeCount}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.prizes.map((p) => (
                        <Badge key={p.id} variant="secondary">{p.name}</Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
