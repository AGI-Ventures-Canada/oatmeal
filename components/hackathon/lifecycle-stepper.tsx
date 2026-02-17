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
import { Check, EyeOff, Globe, Gavel, Trophy, Loader2, ArrowRight } from "lucide-react"
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
  published: "Start Judging",
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
  status: HackathonStatus
}

export function LifecycleStepper({ hackathonId, status }: LifecycleStepperProps) {
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

  return (
    <>
      <div className="rounded-lg border bg-card">
        <div className="flex items-center gap-4 px-5 py-3.5">
          <div className="flex items-center flex-1 min-w-0">
            {phases.map((phase, index) => {
              const isCompleted = index < currentIndex
              const isCurrent = index === currentIndex
              const isFuture = index > currentIndex
              const Icon = phase.icon
              const isClickable = !isCurrent && !updating && Math.abs(index - currentIndex) === 1

              return (
                <div
                  key={phase.key}
                  className="flex items-center flex-1 min-w-0 last:flex-none"
                >
                  <button
                    type="button"
                    onClick={() => isClickable && requestTransition(phase.key)}
                    disabled={!isClickable}
                    className={cn(
                      "group/phase flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors",
                      isClickable && "hover:bg-muted cursor-pointer",
                      !isClickable && isCurrent && "cursor-default",
                      !isClickable && isFuture && "cursor-default opacity-40"
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full transition-colors",
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
                        "hidden text-sm font-medium whitespace-nowrap sm:block",
                        isCompleted && "text-muted-foreground",
                        isCurrent && "text-foreground",
                        isFuture && "text-muted-foreground"
                      )}
                    >
                      {phase.label}
                    </span>
                  </button>

                  {index < phases.length - 1 && (
                    <div
                      className={cn(
                        "h-px flex-1 mx-1",
                        index < currentIndex ? "bg-primary" : "bg-border"
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {nextPhase && (
            <Button
              size="sm"
              onClick={() => requestTransition(nextPhase.key)}
              disabled={updating}
              className="shrink-0 gap-1.5"
            >
              {updating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <>
                  {advanceCta[phases[currentIndex].key]}
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </Button>
          )}
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
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingTarget && commitStatusChange(pendingTarget)}
              disabled={updating}
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
