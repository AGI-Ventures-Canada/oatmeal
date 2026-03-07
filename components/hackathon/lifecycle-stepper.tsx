"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Check,
  EyeOff,
  Globe,
  Gavel,
  Trophy,
  Gift,
  Loader2,
  AlertTriangle,
  Users,
} from "lucide-react"
import type { HackathonStatus } from "@/lib/db/hackathon-types"

const phases = [
  { key: "draft" as const, label: "Draft", icon: EyeOff },
  { key: "published" as const, label: "Go Live", icon: Globe },
  { key: "judging" as const, label: "Judging", icon: Gavel },
  { key: "completed" as const, label: "Completed", icon: Trophy },
] as const

type PhaseKey = (typeof phases)[number]["key"]

const confirmations: Record<string, { title: string; description: string }> = {
  "draft→published": {
    title: "Go live with hackathon?",
    description:
      "Your hackathon will become visible on the browse page and open for registration.",
  },
  "published→judging": {
    title: "Start the judging phase?",
    description:
      "Submissions will close and the judging phase will begin. Make sure your judges and criteria are configured.",
  },
  "judging→completed": {
    title: "Complete the event?",
    description:
      "Judging will close and results will be published on the event page. Participants will be notified of the winner.",
  },
  "published→draft": {
    title: "Take offline?",
    description: "Your hackathon will be hidden from the browse page.",
  },
  "judging→published": {
    title: "Revert to published?",
    description: "This will reopen the hackathon for submissions.",
  },
  "judging→draft": {
    title: "Revert to draft?",
    description:
      "The hackathon will be taken offline and hidden from the browse page.",
  },
  "completed→judging": {
    title: "Revert to judging?",
    description: "This will reopen the judging phase.",
  },
  "completed→published": {
    title: "Revert to published?",
    description:
      "Results will be unpublished and the hackathon will reopen for submissions.",
  },
  "completed→draft": {
    title: "Revert to draft?",
    description:
      "Results will be unpublished and the hackathon will be taken offline.",
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
  startsAt?: string | null
  endsAt?: string | null
  registrationOpensAt?: string | null
  registrationClosesAt?: string | null
  description?: string | null
  bannerUrl?: string | null
  locationType?: "in_person" | "virtual" | null
  locationName?: string | null
  locationUrl?: string | null
  sponsorCount?: number
  prizeCount?: number
}

type HoverAction = {
  title: string
  description: string
  buttonText: string
  onClick: () => void
}

export function LifecycleStepper({
  hackathonId,
  hackathonSlug,
  status,
  submissionCount = 0,
  judgingProgress,
  judgingSetupStatus,
  startsAt,
  endsAt,
  registrationOpensAt,
  registrationClosesAt,
  description,
  bannerUrl,
  locationType,
  locationName,
  locationUrl,
  sponsorCount = 0,
  prizeCount = 0,
}: LifecycleStepperProps) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [currentStatus, setCurrentStatus] = useState(status)
  const [updating, setUpdating] = useState(false)
  const [pendingTarget, setPendingTarget] = useState<PhaseKey | null>(null)

  const currentIndex = resolvePhaseIndex(currentStatus)

  async function commitStatusChange(newStatus: PhaseKey) {
    const now = new Date().toISOString()

    setUpdating(true)
    try {
      if (newStatus === "completed") {
        const calcRes = await fetch(
          `/api/dashboard/hackathons/${hackathonId}/results/calculate`,
          {
            method: "POST",
          },
        )
        if (calcRes.ok) {
          const publishRes = await fetch(
            `/api/dashboard/hackathons/${hackathonId}/results/publish`,
            {
              method: "POST",
            },
          )
          if (publishRes.ok) {
            setCurrentStatus(newStatus)
            router.refresh()
            return
          }
        }
        const res = await fetch(
          `/api/dashboard/hackathons/${hackathonId}/settings`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          },
        )
        if (!res.ok) throw new Error("Failed to update status")
        setCurrentStatus(newStatus)
        router.refresh()
        return
      }

      if (
        phases[currentIndex]?.key === "completed" &&
        (newStatus === "judging" ||
          newStatus === "published" ||
          newStatus === "draft")
      ) {
        await fetch(
          `/api/dashboard/hackathons/${hackathonId}/results/unpublish`,
          {
            method: "POST",
          },
        )
      }

      const body: Record<string, unknown> = { status: newStatus }
      if (newStatus === "judging") {
        if (!endsAt || new Date(endsAt) > new Date()) body.endsAt = now
        if (
          !registrationClosesAt ||
          new Date(registrationClosesAt) > new Date()
        )
          body.registrationClosesAt = now
      }

      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/settings`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      )
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

  function getNodeAction(phaseIndex: number): HoverAction | null {
    if (updating) return null
    const distance = phaseIndex - currentIndex
    if (distance === 0) return null

    const phaseKey = phases[phaseIndex].key
    const currentKey = phases[currentIndex].key

    if (distance === 1) {
      if (currentKey === "draft" && phaseKey === "published")
        return {
          title: "Go Live",
          description: "Make the event open for registrations",
          buttonText: "Go Live",
          onClick: () => requestTransition("published"),
        }
      if (currentKey === "published" && phaseKey === "judging") {
        if (judgingSetupStatus?.hasUnassignedSubmissions)
          return {
            title: "Assign Submissions",
            description: "Some submissions don't have judges assigned yet",
            buttonText: "Assign Submissions",
            onClick: () =>
              router.push(`/e/${hackathonSlug}/manage/judging?tab=assignments`),
          }
        return {
          title: "Start Judging",
          description: "Close submissions and begin judging",
          buttonText: "Start Judging",
          onClick: () => requestTransition("judging"),
        }
      }
      if (currentKey === "judging" && phaseKey === "completed")
        return {
          title: "End Event",
          description: "End the event and publish results",
          buttonText: "End Event",
          onClick: () => requestTransition("completed"),
        }
    }

    if (distance < 0) {
      if (phaseKey === "draft")
        return {
          title: "Revert to Draft",
          description:
            "Take the hackathon offline and hide it from the browse page",
          buttonText: "Revert to Draft",
          onClick: () => requestTransition("draft"),
        }
      if (phaseKey === "published")
        return {
          title: "Reopen Submissions",
          description: "Reopen the hackathon for new submissions",
          buttonText: "Reopen",
          onClick: () => requestTransition("published"),
        }
      if (phaseKey === "judging")
        return {
          title: "Reopen Judging",
          description: "Revert to the judging phase",
          buttonText: "Reopen",
          onClick: () => requestTransition("judging"),
        }
    }

    return null
  }

  const confirmation = pendingTarget
    ? (confirmations[`${phases[currentIndex].key}→${pendingTarget}`] ?? {
        title: `Switch to ${pendingTarget}?`,
        description: `This will change the hackathon status to "${pendingTarget}".`,
      })
    : null

  const missingDates = [
    !registrationOpensAt && "Registration opens",
    !registrationClosesAt && "Registration closes",
    !startsAt && "Event starts",
    !endsAt && "Event ends",
  ].filter(Boolean) as string[]
  const hasAllDates = missingDates.length === 0

  const goLiveWarnings = [
    !description && "No description",
    !bannerUrl && "No banner image",
    !locationType && "Location not set",
    locationType === "in_person" && !locationName && "Venue details missing",
    locationType === "virtual" && !locationUrl && "Virtual link missing",
    sponsorCount === 0 && "No sponsors",
  ].filter(Boolean) as string[]

  const judgeCount = judgingSetupStatus?.judgeCount ?? 0
  const hasJudges = judgeCount > 0
  const judgesLabel = hasJudges
    ? judgeCount === 1
      ? "1 judge"
      : `${judgeCount} judges`
    : "Assign Judges"

  const hasPrizes = prizeCount > 0
  const prizesLabel = hasPrizes
    ? prizeCount === 1
      ? "1 prize"
      : `${prizeCount} prizes`
    : "Set up Prizes"

  return (
    <>
      <div className="rounded-lg border bg-card">
        <div className="px-3 py-3 sm:px-5 sm:py-4">
          <div className="flex items-start">
            {phases.map((phase, index) => {
              const isCompleted = index < currentIndex
              const isCurrent = index === currentIndex
              const isFuture = index > currentIndex
              const Icon = phase.icon
              const nodeAction = getNodeAction(index)
              const isActionable = !!nodeAction
              const isFutureDistant = isFuture && !isActionable

              const nodeElement = (
                <button
                  type="button"
                  className={cn(
                    "group/phase flex flex-col items-center gap-1.5 rounded-md px-2 pt-1 pb-1.5 transition-colors shrink-0",
                    isActionable && "hover:bg-muted cursor-pointer",
                    isCurrent && "cursor-default",
                    isFutureDistant && "cursor-default opacity-50",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
                      isCompleted && "bg-muted-foreground text-background",
                      isCurrent && "bg-primary text-primary-foreground",
                      isFuture && "border-2 border-muted-foreground/30",
                    )}
                  >
                    {isCompleted ? (
                      phase.key === "draft" && currentIndex === 1 ? (
                        <EyeOff className="size-3.5" />
                      ) : (
                        <Check className="size-3.5" strokeWidth={2.5} />
                      )
                    ) : (
                      <Icon className="size-3.5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "hidden sm:block text-xs font-medium whitespace-nowrap",
                      isCompleted && "text-muted-foreground",
                      isCurrent && "text-foreground",
                      isFuture && "text-muted-foreground",
                    )}
                  >
                    {isCurrent && phase.key === "published"
                      ? "Live"
                      : phase.key === "draft" && currentIndex === 1
                        ? "Take Offline"
                        : phase.label}
                  </span>
                </button>
              )

              const actionContent = nodeAction && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{nodeAction.title}</p>
                  <p className="text-muted-foreground">
                    {nodeAction.description}
                  </p>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={nodeAction.onClick}
                  >
                    {nodeAction.buttonText}
                  </Button>
                </div>
              )

              let wrappedNode
              if (nodeAction) {
                if (isMobile) {
                  wrappedNode = (
                    <Popover>
                      <PopoverTrigger asChild>{nodeElement}</PopoverTrigger>
                      <PopoverContent
                        side="top"
                        align="center"
                        className="w-auto max-w-64"
                      >
                        {actionContent}
                      </PopoverContent>
                    </Popover>
                  )
                } else {
                  wrappedNode = (
                    <HoverCard openDelay={200}>
                      <HoverCardTrigger asChild>{nodeElement}</HoverCardTrigger>
                      <HoverCardContent
                        side="top"
                        align="center"
                        className="w-auto max-w-64"
                      >
                        {actionContent}
                      </HoverCardContent>
                    </HoverCard>
                  )
                }
              } else if (isFutureDistant) {
                wrappedNode = (
                  <Tooltip>
                    <TooltipTrigger asChild>{nodeElement}</TooltipTrigger>
                    <TooltipContent side="top">{phase.label}</TooltipContent>
                  </Tooltip>
                )
              } else {
                wrappedNode = nodeElement
              }

              return (
                <div
                  key={phase.key}
                  className={cn(
                    "flex items-start min-w-0",
                    index < phases.length - 1 ? "flex-1" : "flex-none",
                  )}
                >
                  {wrappedNode}

                  {index < phases.length - 1 && (
                    <div className="flex-1 flex items-start self-stretch pt-1">
                      {index === 0 ? (
                        <div className="flex-1 flex items-start">
                          <div
                            className={cn(
                              "h-px flex-1 mt-4",
                              index < currentIndex
                                ? "bg-muted-foreground"
                                : "bg-border",
                            )}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/e/${hackathonSlug}/manage/judging`)
                            }
                            className="flex flex-col items-center gap-1.5 shrink-0 mx-1.5 rounded-md px-2 pb-1.5 hover:bg-muted transition-colors cursor-pointer"
                          >
                            <div
                              className={cn(
                                "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
                                currentIndex > 0
                                  ? "bg-muted-foreground text-background"
                                  : "border-2 border-muted-foreground/30 text-muted-foreground",
                              )}
                            >
                              <Users className="size-3.5" />
                            </div>
                            <span className="hidden sm:block text-xs font-medium whitespace-nowrap text-muted-foreground">
                              {judgesLabel}
                            </span>
                          </button>
                          <div
                            className={cn(
                              "h-px flex-1 mt-4",
                              index < currentIndex
                                ? "bg-muted-foreground"
                                : "bg-border",
                            )}
                          />
                        </div>
                      ) : index === 2 ? (
                        <div className="flex-1 flex items-start">
                          <div
                            className={cn(
                              "h-px flex-1 mt-4",
                              index < currentIndex
                                ? "bg-muted-foreground"
                                : "bg-border",
                            )}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/e/${hackathonSlug}/manage/prizes`)
                            }
                            className="flex flex-col items-center gap-1.5 shrink-0 mx-1.5 rounded-md px-2 pb-1.5 hover:bg-muted transition-colors cursor-pointer"
                          >
                            <div
                              className={cn(
                                "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
                                currentIndex > 2
                                  ? "bg-muted-foreground text-background"
                                  : "border-2 border-muted-foreground/30 text-muted-foreground",
                              )}
                            >
                              <Gift className="size-3.5" />
                            </div>
                            <span className="hidden sm:block text-xs font-medium whitespace-nowrap text-muted-foreground">
                              {prizesLabel}
                            </span>
                          </button>
                          <div
                            className={cn(
                              "h-px flex-1 mt-4",
                              index < currentIndex
                                ? "bg-muted-foreground"
                                : "bg-border",
                            )}
                          />
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "h-px flex-1 mx-1 mt-4",
                            index < currentIndex
                              ? "bg-muted-foreground"
                              : "bg-border",
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
            <AlertDialogDescription>
              {confirmation?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingTarget === "published" && !hasAllDates && (
            <div className="flex items-start gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <AlertTriangle className="size-5 shrink-0 text-destructive" />
              <div className="text-sm text-destructive">
                <p className="font-medium">Timeline dates required</p>
                <p className="text-destructive/80">
                  Set the following dates before publishing:{" "}
                  {missingDates.join(", ")}.
                </p>
              </div>
            </div>
          )}
          {pendingTarget === "published" && goLiveWarnings.length > 0 && (
            <div className="flex items-start gap-3 rounded-md border border-muted p-3">
              <AlertTriangle className="size-5 shrink-0 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium">Before you go live</p>
                <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                  {goLiveWarnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {pendingTarget === "judging" && submissionCount === 0 && (
            <div className="flex items-start gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <AlertTriangle className="size-5 shrink-0 text-destructive" />
              <div className="text-sm text-destructive">
                <p className="font-medium">No submissions yet</p>
                <p className="text-destructive/80">
                  There are currently no submitted projects. Starting judging
                  now means there will be nothing to judge.
                </p>
              </div>
            </div>
          )}
          {pendingTarget === "completed" &&
            judgingProgress &&
            judgingProgress.totalAssignments > 0 &&
            judgingProgress.completedAssignments <
              judgingProgress.totalAssignments && (
              <div className="flex items-start gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-3">
                <AlertTriangle className="size-5 shrink-0 text-destructive" />
                <div className="text-sm text-destructive">
                  <p className="font-medium">Judging incomplete</p>
                  <p className="text-destructive/80">
                    {judgingProgress.completedAssignments} of{" "}
                    {judgingProgress.totalAssignments} assignments have been
                    scored. All submissions must be judged before completing the
                    event.
                  </p>
                </div>
              </div>
            )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingTarget && commitStatusChange(pendingTarget)}
              disabled={
                updating ||
                (pendingTarget === "published" && !hasAllDates) ||
                (pendingTarget === "completed" &&
                  judgingProgress &&
                  judgingProgress.totalAssignments > 0 &&
                  judgingProgress.completedAssignments <
                    judgingProgress.totalAssignments)
              }
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
