"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import type { HackathonPhase, HackathonStatus } from "@/lib/db/hackathon-types"
import { getPhasesForStatus, getPhaseLabel } from "@/lib/services/phases"

interface PhaseControlsProps {
  hackathonId: string
  status: HackathonStatus
  currentPhase: HackathonPhase | null
}

export function PhaseControls({
  hackathonId,
  status,
  currentPhase,
}: PhaseControlsProps) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const [pendingPhase, setPendingPhase] = useState<HackathonPhase | null>(null)

  const validPhases = getPhasesForStatus(status)
  if (validPhases.length === 0) return null

  const currentIndex = currentPhase ? validPhases.indexOf(currentPhase) : -1
  const canGoBack = currentIndex > 0
  const canGoForward = currentIndex < validPhases.length - 1

  const prevPhase = canGoBack ? validPhases[currentIndex - 1] : null
  const nextPhase = canGoForward ? validPhases[currentIndex + 1] : currentIndex === -1 ? validPhases[0] : null

  async function commitPhaseChange(phase: HackathonPhase) {
    setUpdating(true)
    try {
      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/phase`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error("Failed to set phase:", data.error)
        return
      }
      router.refresh()
    } finally {
      setUpdating(false)
      setPendingPhase(null)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {prevPhase && (
          <Button
            variant="outline"
            size="sm"
            disabled={updating}
            onClick={() => setPendingPhase(prevPhase)}
          >
            <ChevronLeft className="size-3.5 mr-1" />
            {getPhaseLabel(prevPhase)}
          </Button>
        )}
        {nextPhase && (
          <Button
            size="sm"
            disabled={updating}
            onClick={() => setPendingPhase(nextPhase)}
          >
            {getPhaseLabel(nextPhase)}
            <ChevronRight className="size-3.5 ml-1" />
          </Button>
        )}
      </div>

      <AlertDialog
        open={!!pendingPhase}
        onOpenChange={(open) => !open && setPendingPhase(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Switch to {pendingPhase ? getPhaseLabel(pendingPhase) : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will change the current event phase.
              {pendingPhase === "submission_open" &&
                " Teams will be able to submit their projects."}
              {pendingPhase === "preliminaries" &&
                " Preliminary judging will begin across all rooms."}
              {pendingPhase === "finals" &&
                " The Grand Finals round will begin on the main stage."}
              {pendingPhase === "results_pending" &&
                " Judges will finalize scores before results are published."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingPhase && commitPhaseChange(pendingPhase)}
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
