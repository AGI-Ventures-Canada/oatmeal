"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Users,
  UsersRound,
  FolderOpen,
  Scale,
  MessageCircle,
  ArrowRight,
  CircleCheck,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog"
import { MarkdownEditor } from "@/components/ui/markdown-editor"
import { OverviewAnnouncements } from "@/components/hackathon/overview-announcements"
import { OverviewSchedule } from "@/components/hackathon/overview-schedule"
import type { ActionItem, ActionSeverity } from "@/lib/utils/organizer-actions"
import type { Announcement } from "@/lib/services/announcements"
import type { ScheduleItem } from "@/lib/services/schedule-items"

type QuickStats = {
  participantCount: number
  teamCount: number
  submissionCount: number
  judgingProgress: { totalAssignments: number; completedAssignments: number }
  mentorQueue: { open: number }
}

type Props = {
  slug: string
  hackathonId: string
  stats: QuickStats
  actionItems: ActionItem[]
  announcements: Announcement[]
  scheduleItems: ScheduleItem[]
  challengeReleasedAt: string | null
  challengeExists: boolean
}

const severityOrder: ActionSeverity[] = ["urgent", "warning", "info"]

const severityLabel: Record<ActionSeverity, { text: string; className: string }> = {
  urgent: { text: "urgent", className: "text-destructive" },
  warning: { text: "warning", className: "text-muted-foreground" },
  info: { text: "info", className: "text-muted-foreground" },
}

function buildActionHref(slug: string, item: ActionItem): string | null {
  if (item.action) return null
  if (!item.tab) return null
  const params = new URLSearchParams({ tab: item.tab })
  if (item.subtab && item.subtabKey) params.set(item.subtabKey, item.subtab)
  return `/e/${slug}/manage?${params.toString()}`
}

function StatCard({ icon: Icon, value, label, href }: { icon: typeof Users; value: string; label: string; href?: string }) {
  const inner = (
    <div className={cn("rounded-lg border p-4", href && "transition-colors hover:bg-muted/50")}>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="size-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  )
  if (href) return <Link href={href}>{inner}</Link>
  return inner
}

export function OrganizerOverview({ slug, hackathonId, stats, actionItems, announcements, scheduleItems, challengeReleasedAt, challengeExists }: Props) {
  const router = useRouter()
  const agendaRef = useRef<HTMLDivElement>(null)

  const judgingValue = stats.judgingProgress.totalAssignments > 0
    ? `${Math.round((stats.judgingProgress.completedAssignments / stats.judgingProgress.totalAssignments) * 100)}%`
    : "—"

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set()
    const stored = localStorage.getItem(`dismissed-actions-${hackathonId}`)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  })

  const challengeReleaseItem = scheduleItems.find((s) => s.trigger_type === "challenge_release")
  const defaultReleaseTime = challengeReleaseItem?.starts_at ? new Date(challengeReleaseItem.starts_at) : null

  const [challengeDialogOpen, setChallengeDialogOpen] = useState(false)
  const [challengeTitle, setChallengeTitle] = useState("")
  const [challengeBody, setChallengeBody] = useState("")
  const [challengeReleaseAt, setChallengeReleaseAt] = useState<Date | null>(defaultReleaseTime)
  const [challengeSaving, setChallengeSaving] = useState(false)
  const [challengeError, setChallengeError] = useState<string | null>(null)
  const [challengeSaved, setChallengeSaved] = useState(false)
  const [challengeExistsLocal, setChallengeExistsLocal] = useState(challengeExists)

  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [releaseSuccess, setReleaseSuccess] = useState(false)
  const [releaseError, setReleaseError] = useState<string | null>(null)
  const [challengeReleasedLocal, setChallengeReleasedLocal] = useState(!!challengeReleasedAt)

  const [agendaHighlight, setAgendaHighlight] = useState(false)

  function dismissAction(id: string) {
    setDismissedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      localStorage.setItem(`dismissed-actions-${hackathonId}`, JSON.stringify([...next]))
      return next
    })
  }

  const visibleActionItems = actionItems.filter((item) => {
    if (dismissedIds.has(item.id)) return false
    if (item.id === "create-challenge" && challengeExistsLocal) return false
    if (item.id === "release-challenge" && challengeReleasedLocal) return false
    return true
  })

  const sortedActionItems = [...visibleActionItems].sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity))
  const urgentCount = visibleActionItems.filter((i) => i.severity === "urgent").length

  function handleHighlightAgenda() {
    agendaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    setAgendaHighlight(true)
    setTimeout(() => setAgendaHighlight(false), 2000)
  }

  async function openChallengeDialog() {
    setChallengeError(null)
    setChallengeSaved(false)
    setChallengeReleaseAt(defaultReleaseTime)
    if (challengeExistsLocal) {
      try {
        const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/challenge`)
        if (res.ok) {
          const data = await res.json()
          setChallengeTitle(data.title ?? "")
          setChallengeBody(data.body ?? "")
        }
      } catch {
        // Fall through with empty fields
      }
    } else {
      setChallengeTitle("")
      setChallengeBody("")
    }
    setChallengeDialogOpen(true)
  }

  async function handleChallengeSave() {
    if (!challengeTitle.trim()) return
    setChallengeSaving(true)
    setChallengeError(null)
    try {
      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/challenge`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: challengeTitle, body: challengeBody }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save challenge")
      }
      if (challengeReleaseAt && challengeReleaseItem) {
        await fetch(`/api/dashboard/hackathons/${hackathonId}/schedule/${challengeReleaseItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Challenge Release", startsAt: challengeReleaseAt.toISOString() }),
        })
      }
      setChallengeExistsLocal(true)
      setChallengeSaved(true)
      setTimeout(() => {
        setChallengeDialogOpen(false)
        setChallengeSaved(false)
      }, 1500)
      router.refresh()
    } catch (err) {
      setChallengeError(err instanceof Error ? err.message : "Failed to save challenge")
    } finally {
      setChallengeSaving(false)
    }
  }

  async function handleChallengeRelease() {
    setReleasing(true)
    setReleaseError(null)
    try {
      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/challenge/release`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to release challenge")
      }
      setChallengeReleasedLocal(true)
      setReleaseSuccess(true)
      router.refresh()
      setTimeout(() => {
        setReleaseDialogOpen(false)
        setReleaseSuccess(false)
      }, 1500)
    } catch (err) {
      setReleaseError(err instanceof Error ? err.message : "Failed to release challenge")
    } finally {
      setReleasing(false)
    }
  }

  function handleChallengeKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !challengeSaving) {
      e.preventDefault()
      handleChallengeSave()
    }
  }

  function handleActionClick(item: ActionItem) {
    if (item.action === "highlight-agenda") {
      handleHighlightAgenda()
    } else if (item.action === "open-challenge-dialog") {
      openChallengeDialog()
    } else if (item.action === "release-challenge") {
      setReleaseError(null)
      setReleaseDialogOpen(true)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} value={String(stats.participantCount)} label="Registered" href={`/e/${slug}/manage?tab=teams`} />
        <StatCard icon={UsersRound} value={String(stats.teamCount)} label="Teams" href={`/e/${slug}/manage?tab=teams`} />
        <StatCard icon={FolderOpen} value={String(stats.submissionCount)} label="Submissions" href={`/e/${slug}/manage?tab=submissions`} />
        <StatCard icon={Scale} value={judgingValue} label="Judged" href={`/e/${slug}/manage?tab=judging`} />
      </div>

      {stats.mentorQueue.open > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <MessageCircle className="size-4 text-primary" />
          <span className="text-sm font-medium">
            {stats.mentorQueue.open} mentor request{stats.mentorQueue.open !== 1 ? "s" : ""} pending
          </span>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-4">
        <div ref={agendaRef} className={cn("lg:col-span-3 space-y-4 transition-all duration-500 rounded-lg", agendaHighlight && "ring-2 ring-primary/50")}>
          <OverviewSchedule
            hackathonId={hackathonId}
            scheduleItems={scheduleItems}
            challengeReleasedAt={challengeReleasedLocal ? challengeReleasedAt ?? new Date().toISOString() : null}
            challengeExists={challengeExistsLocal}
          />
        </div>

        <div className="space-y-4">
          {sortedActionItems.length > 0 ? (
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between border-b pb-3 mb-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Action Items</h3>
                {urgentCount > 0 && (
                  <span className="text-xs font-medium text-destructive-foreground bg-destructive px-2 py-0.5 rounded-full">{urgentCount} urgent</span>
                )}
              </div>
              <div className="space-y-1">
                {sortedActionItems.map((item) => {
                  const severity = severityLabel[item.severity]
                  const href = buildActionHref(slug, item)
                  const hasAction = !!item.action
                  const row = (
                    <span className="flex items-center py-2">
                      <span className="flex-1 min-w-0">
                        <span className="text-sm block">{item.label}</span>
                        {item.hint && <span className="text-xs text-muted-foreground block">{item.hint}</span>}
                      </span>
                      {item.dismissible ? (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismissAction(item.id) }}
                          className="shrink-0 ml-2 p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="size-3.5" />
                        </button>
                      ) : (
                        <>
                          <span className={cn("text-xs font-medium shrink-0 ml-3", severity.className)}>
                            {severity.text}
                          </span>
                          <ArrowRight className={cn("size-3 shrink-0 text-muted-foreground transition-all duration-200", (href || hasAction) ? "ml-0 w-0 opacity-0 group-hover:ml-2 group-hover:w-3 group-hover:opacity-100" : "ml-0 w-0 opacity-0")} />
                        </>
                      )}
                    </span>
                  )
                  if (href) {
                    return (
                      <Link
                        key={item.id}
                        href={href}
                        className="group block rounded-md -mx-2 px-2 hover:bg-muted transition-colors"
                      >
                        {row}
                      </Link>
                    )
                  }
                  if (hasAction) {
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleActionClick(item)}
                        className="group block w-full text-left rounded-md -mx-2 px-2 hover:bg-muted transition-colors"
                      >
                        {row}
                      </button>
                    )
                  }
                  return (
                    <div key={item.id} className="-mx-2 px-2">
                      {row}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border p-4 flex flex-col items-center justify-center text-center py-8">
              <CircleCheck className="size-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">All caught up</p>
            </div>
          )}
          <OverviewAnnouncements slug={slug} hackathonId={hackathonId} announcements={announcements} />
        </div>
      </div>

      <Dialog open={challengeDialogOpen} onOpenChange={setChallengeDialogOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{challengeExistsLocal ? "Edit Challenge" : "Create Challenge"}</DialogTitle>
          </DialogHeader>
          {challengeSaved ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <CheckCircle2 className="size-8 text-primary" />
              <p className="text-sm font-medium">Challenge saved</p>
              {challengeReleaseAt && (
                <p className="text-xs text-muted-foreground">
                  Releases {challengeReleaseAt.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
              )}
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); handleChallengeSave() }}
              onKeyDown={handleChallengeKeyDown}
              autoComplete="off"
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="challenge-title">Title</Label>
                <Input
                  id="challenge-title"
                  name="challenge-title"
                  value={challengeTitle}
                  onChange={(e) => setChallengeTitle(e.target.value)}
                  placeholder="Challenge title"
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="challenge-body">Description</Label>
                <MarkdownEditor
                  id="challenge-body"
                  value={challengeBody}
                  onChange={setChallengeBody}
                  placeholder="Describe the challenge in detail..."
                  rows={8}
                />
                <p className="text-xs text-muted-foreground">Supports markdown: **bold**, _italic_, ## headings, lists, and [links](url)</p>
              </div>
              <div className="space-y-2">
                <Label>Release time</Label>
                <DateTimePicker
                  value={challengeReleaseAt}
                  onChange={setChallengeReleaseAt}
                  placeholder="When should participants see this?"
                />
              </div>
              {challengeError && <p className="text-destructive text-xs">{challengeError}</p>}
              <Button type="submit" disabled={challengeSaving || !challengeTitle.trim()} className="w-full">
                {challengeSaving && <Loader2 className="animate-spin" />}
                Save Challenge
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={releaseDialogOpen} onOpenChange={(open) => { if (!releaseSuccess) setReleaseDialogOpen(open) }}>
        <AlertDialogContent>
          {releaseSuccess ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <CheckCircle2 className="size-8 text-primary" />
              <p className="text-sm font-medium">Challenge released</p>
              <p className="text-xs text-muted-foreground">Participants can now see the challenge</p>
            </div>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Release challenge to participants?</AlertDialogTitle>
                <AlertDialogDescription>Once released, participants will see the challenge on the event page. This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              {releaseError && <p className="text-destructive text-xs">{releaseError}</p>}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={releasing}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={(e) => { e.preventDefault(); handleChallengeRelease() }} disabled={releasing}>
                  {releasing ? "Releasing..." : "Release"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
