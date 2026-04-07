"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calculator, Globe, GlobeLock, Loader2, AlertTriangle, Trophy } from "lucide-react"

type ResultEntry = {
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
  prizeTrackId?: string | null
}

type TrackInfo = {
  id: string
  name: string
}

interface ResultsDashboardProps {
  hackathonId: string
  initialResults: ResultEntry[]
  isPublished: boolean
  incompleteAssignments: number
  tracks?: TrackInfo[]
}

const ALL_TRACKS = "__all__"

export function ResultsDashboard({
  hackathonId,
  initialResults,
  isPublished: initialIsPublished,
  incompleteAssignments,
  tracks = [],
}: ResultsDashboardProps) {
  const router = useRouter()
  const [results, setResults] = useState<ResultEntry[]>(initialResults)
  const [isPublished, setIsPublished] = useState(initialIsPublished)
  const [calculating, setCalculating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTrack, setSelectedTrack] = useState(ALL_TRACKS)

  const filteredResults = selectedTrack === ALL_TRACKS
    ? results
    : results.filter((r) => r.prizeTrackId === selectedTrack)

  const hasTrackData = tracks.length > 0 && results.some((r) => r.prizeTrackId)

  async function handleCalculate() {
    setCalculating(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/results/calculate`,
        { method: "POST" }
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to calculate")
      }
      await res.json()

      const resultsRes = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/results`
      )
      if (resultsRes.ok) {
        const data = await resultsRes.json()
        setResults(data.results)
      }

      setError(null)
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
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/results/publish`,
        { method: "POST" }
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to publish")
      }
      setIsPublished(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish results")
    } finally {
      setPublishing(false)
    }
  }

  async function handleUnpublish() {
    setPublishing(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/results/unpublish`,
        { method: "POST" }
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to unpublish")
      }
      setIsPublished(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unpublish results")
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Results</h3>
          <p className="text-sm text-muted-foreground">
            Rankings update automatically as judges score. Publish when ready.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={calculating}>
                {calculating ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Calculator className="mr-2 size-4" />
                )}
                Recalculate
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Recalculate Results?</AlertDialogTitle>
                <AlertDialogDescription>
                  Rankings already update automatically as judges score. Use this to force a full recalculation if results look stale.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleCalculate}>
                  Calculate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {isPublished ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={publishing}>
                  {publishing ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <GlobeLock className="mr-2 size-4" />
                  )}
                  Unpublish
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Unpublish Results?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Results will no longer be visible to participants. The hackathon will return to judging status.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleUnpublish}>Unpublish</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={publishing || results.length === 0}>
                  {publishing ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Globe className="mr-2 size-4" />
                  )}
                  Publish Results
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Publish Results?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Results will be visible to all participants and the public. Winner notification emails will be sent. The hackathon status will change to completed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePublish}>Publish</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {incompleteAssignments > 0 && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertDescription>
            {incompleteAssignments} judge assignment{incompleteAssignments !== 1 ? "s" : ""} not yet completed. Results may be incomplete.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {isPublished && (
        <Badge variant="default">Published</Badge>
      )}

      {hasTrackData && (
        <div className="flex items-center gap-2">
          <Select value={selectedTrack} onValueChange={setSelectedTrack}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Filter by track" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TRACKS}>All tracks</SelectItem>
              {tracks.map((track) => (
                <SelectItem key={track.id} value={track.id}>
                  {track.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTrack !== ALL_TRACKS && (
            <span className="text-sm text-muted-foreground">
              {filteredResults.length} result{filteredResults.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {results.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Trophy className="mx-auto size-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No results yet. Calculate results after judges have submitted their scores.
          </p>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No results for this track yet.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Rank</TableHead>
                <TableHead>Submission</TableHead>
                <TableHead>Team</TableHead>
                {hasTrackData && selectedTrack === ALL_TRACKS && (
                  <TableHead>Track</TableHead>
                )}
                <TableHead className="text-right">Weighted Score</TableHead>
                <TableHead className="text-right">Judges</TableHead>
                <TableHead>Prizes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-bold text-lg">
                    #{r.rank}
                  </TableCell>
                  <TableCell className="font-medium">{r.submissionTitle}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.teamName || "\u2014"}
                  </TableCell>
                  {hasTrackData && selectedTrack === ALL_TRACKS && (
                    <TableCell className="text-muted-foreground">
                      {tracks.find((t) => t.id === r.prizeTrackId)?.name || "\u2014"}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-mono">
                    {r.weightedScore !== null ? Number(r.weightedScore).toFixed(2) : "\u2014"}
                  </TableCell>
                  <TableCell className="text-right">{r.judgeCount}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.prizes.map((p) => (
                        <Badge key={p.id} variant="secondary">
                          {p.name}
                        </Badge>
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
