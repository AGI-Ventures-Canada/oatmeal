"use client"

import { Badge } from "@/components/ui/badge"
import type { HackathonPhase } from "@/lib/db/hackathon-types"
import { getPhaseLabel } from "@/lib/services/phases"

const PHASE_VARIANTS: Record<HackathonPhase, "default" | "secondary" | "destructive" | "outline"> = {
  build: "default",
  submission_open: "default",
  preliminaries: "secondary",
  finals: "secondary",
  results_pending: "outline",
}

export function PhaseBadge({ phase }: { phase: HackathonPhase | null }) {
  if (!phase) return null

  return (
    <Badge variant={PHASE_VARIANTS[phase]}>
      {getPhaseLabel(phase)}
    </Badge>
  )
}
