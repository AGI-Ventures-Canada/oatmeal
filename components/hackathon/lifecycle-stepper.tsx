"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
import { Check, EyeOff, Globe, Gavel, Trophy, Loader2, ArrowRight, AlertTriangle } from "lucide-react"
import type { HackathonStatus } from "@/lib/db/hackathon-types"

const phases = [
  { key: "draft" as const, label: "Draft", icon: EyeOff },
  { key: "published" as const, label: "Published", icon: Globe },
  { key: "judging" as const, label: "Judging", icon: Gavel },
  { key: "completed" as const, label: "Completed", icon: Trophy },
] as const

type PhaseKey = (typeof phases)[number]["key"]

const advanceCta: Record<string, string> = {
  draft: "Publish",
  judging: "Complete Event",
}

const confirmations: Record<string, { title: string; description: string }> = {
  "draft→published": {
    title: "Publish hackathon?",
    description:
      "Your hackathon will become visible on the browse page and open for registration.",
  },
  "published→judging": {
    title: "Start the judging phase?",
    description:
      "Submissions will close and the judging phase will begin. Make sure your judges and criteria are configured.",
  },
  "judging→completed": {
    title: "Mark as completed?",
    description:
      "This will end judging and mark the hackathon as completed. You can still publish results afterward.",
  },
  "published→draft": {
    title: "Revert to draft?",
    description: "Your hackathon will be hidden from the browse page.",
  },
  "judging→published": {
    title: "Revert to published?",
    description: "This will reopen the hackathon for submissions.",
  },
  "completed→judging": {
    title: "Revert to judging?",
    description: "This will reopen the judging phase.",
  },
}

function resolvePhaseIndex(status: HackathonStatus): number {
  switch (status) {
    case "draft":
      return 0
    case "published":
    case "registration_open":
    case "active":
      return 1
    case "judging":
      return 2
    case "completed":
    case "archived":
      return 3
    default:
      return 0
  }
}

interface LifecycleStepperProps {
  hackathonId: string
  hackathonSlug: string
  status: HackathonStatus
  submissionCount?: number
  judgingProgress?: {
    totalAssignments: number
    completedAssignments: number
  }
  judgingSetupStatus?: {
    judgeCount: number
    hasUnassignedSubmissions: boolean
  }
}

export function LifecycleStepper({ hackathonId, hackathonSlug, status, submissionCount = 0, judgingProgress, judgingSetupStatus }: LifecycleStepperProps) {
  const router = useRouter()
  const [currentStatus, setCurrentStatus] = useState(status)
  const [updating, setUpdating] = useState(false)
  const [pendingTarget, setPendingTarget] = useState<PhaseKey | null>(null)

  const currentIndex = resolvePhaseIndex(currentStatus)
  const nextPhase = currentIndex < phases.length - 1 ? phases[currentIndex + 1] : null

  async function commitStatusChange(newStatus: PhaseKey) {
    setUpdating(true)
    try {
      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      setCurrentStatus(newStatus)
      router.refresh()
    } catch {
      // keep current status on failure
    } finally {
      setUpdating(false)
      setPendingTarget(null)
    }
  }

  function requestTransition(target: PhaseKey) {
    if (target === phases[currentIndex]?.key || updating) return
    setPendingTarget(target)
  }

  const confirmation = pendingTarget
    ? confirmations[`${phases[currentIndex].key}→${pendingTarget}`] ?? {
        title: `Switch to ${pendingTarget}?`,
        description: `This will change the hackathon status to "${pendingTarget}".`,
      }
    : null

  const isPublishedPhase = phases[currentIndex]?.key === "published"
  const hasJudges = (judgingSetupStatus?.judgeCount ?? 0) > 0
  const allSubmissionsAssigned = hasJudges && !judgingSetupStatus?.hasUnassignedSubmissions
  const publishedCtaText = !hasJudges
    ? "Assign Judges"
    : judgingSetupStatus?.hasUnassignedSubmissions
      ? "Assign Submissions"
      : "Close Submissions"

  function getCtaText() {
    if (isPublishedPhase) return publishedCtaText
    return advanceCta[phases[currentIndex].key]
  }

  function handleCtaClick() {
    if (isPublishedPhase) {
      if (allSubmissionsAssigned) {
        requestTransition("judging")
      } else {
        router.push(`/e/${hackathonSlug}/manage/judging?tab=assignments`)
      }
    } else if (nextPhase) {
      requestTransition(nextPhase.key)
    }
  }

  return (
    <>
      <div className="rounded-lg border bg-card">
        <div className="px-5 py-4">
          <div className="flex items-start">
            {phases.map((phase, index) => {
              const isCompleted = index < currentIndex
              const isCurrent = index === currentIndex
              const isFuture = index > currentIndex
              const Icon = phase.icon
              const isClickable = !isCurrent && !updating && Math.abs(index - currentIndex) === 1
              const isConnectorWithCta = nextPhase && index === currentIndex

              return (
                <div
                  key={phase.key}
                  className={cn(
                    "flex items-start min-w-0",
                    index < phases.length - 1 ? "flex-1" : "flex-none"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => isClickable && requestTransition(phase.key)}
                    disabled={!isClickable}
                    className={cn(
                      "group/phase flex flex-col items-center gap-1.5 rounded-md px-2 pt-1 pb-1.5 transition-colors shrink-0",
                      isClickable && "hover:bg-muted cursor-pointer",
                      !isClickable && isCurrent && "cursor-default",
                      !isClickable && isFuture && "cursor-default opacity-40"
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
                        isCompleted && "bg-primary text-primary-foreground",
                        isCurrent && "bg-primary text-primary-foreground",
                        isFuture && "border-2 border-muted-foreground/30"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="size-3.5" strokeWidth={2.5} />
                      ) : (
                        <Icon className="size-3.5" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium whitespace-nowrap",
                        isCompleted && "text-muted-foreground",
                        isCurrent && "text-foreground",
                        isFuture && "text-muted-foreground"
                      )}
                    >
                      {phase.label}
                    </span>
                  </button>

                  {index < phases.length - 1 && (
                    <div className="flex-1 flex items-center self-stretch pt-1" style={{ height: "2.5rem" }}>
                      {isConnectorWithCta ? (
                        <div className="flex-1 flex items-center">
                          <div
                            className={cn(
                              "h-px flex-1",
                              index < currentIndex ? "bg-primary" : "bg-border"
                            )}
                          />
                          <Button
                            size="sm"
                            onClick={handleCtaClick}
                            disabled={updating}
                            className="shrink-0 gap-1.5 mx-2"
                          >
                            {updating ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <>
                                {getCtaText()}
                                <ArrowRight className="size-3.5" />
                              </>
                            )}
                          </Button>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "h-px flex-1 mx-1",
                            index < currentIndex ? "bg-primary" : "bg-border"
                          )}
                        />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <AlertDialog
        open={!!pendingTarget}
        onOpenChange={(open) => !open && setPendingTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmation?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          {pendingTarget === "judging" && submissionCount === 0 && (
            <div className="flex items-start gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <AlertTriangle className="size-5 shrink-0 text-destructive" />
              <div className="text-sm text-destructive">
                <p className="font-medium">No submissions yet</p>
                <p className="text-destructive/80">
                  There are currently no submitted projects. Starting judging now means there will be nothing to judge.
                </p>
              </div>
            </div>
          )}
          {pendingTarget === "completed" && judgingProgress && judgingProgress.totalAssignments > 0 && judgingProgress.completedAssignments < judgingProgress.totalAssignments && (
            <div className="flex items-start gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <AlertTriangle className="size-5 shrink-0 text-destructive" />
              <div className="text-sm text-destructive">
                <p className="font-medium">Judging incomplete</p>
                <p className="text-destructive/80">
                  {judgingProgress.completedAssignments} of {judgingProgress.totalAssignments} assignments have been scored. All submissions must be judged before completing the event.
                </p>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingTarget && commitStatusChange(pendingTarget)}
              disabled={updating || (pendingTarget === "completed" && judgingProgress && judgingProgress.totalAssignments > 0 && judgingProgress.completedAssignments < judgingProgress.totalAssignments)}
            >
              {updating && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
