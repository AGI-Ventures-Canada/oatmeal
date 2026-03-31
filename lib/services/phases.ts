import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { HackathonPhase, HackathonStatus } from "@/lib/db/hackathon-types"

const PHASES_BY_STATUS: Partial<Record<HackathonStatus, HackathonPhase[]>> = {
  active: ["build", "submission_open"],
  judging: ["preliminaries", "finals", "results_pending"],
}

const PHASE_LABELS: Record<HackathonPhase, string> = {
  build: "Building",
  submission_open: "Submissions Open",
  preliminaries: "Preliminary Judging",
  finals: "Grand Finals",
  results_pending: "Results Pending",
}

export function getPhasesForStatus(status: HackathonStatus): HackathonPhase[] {
  return PHASES_BY_STATUS[status] ?? []
}

export function getPhaseLabel(phase: HackathonPhase): string {
  return PHASE_LABELS[phase]
}

export function validatePhaseTransition(
  status: HackathonStatus,
  currentPhase: HackathonPhase | null,
  targetPhase: HackathonPhase
): string | null {
  const validPhases = getPhasesForStatus(status)
  if (validPhases.length === 0) {
    return `Phases are not available for status "${status}"`
  }
  if (!validPhases.includes(targetPhase)) {
    return `Phase "${targetPhase}" is not valid for status "${status}". Valid phases: ${validPhases.join(", ")}`
  }
  if (currentPhase) {
    const currentIndex = validPhases.indexOf(currentPhase)
    const targetIndex = validPhases.indexOf(targetPhase)
    if (currentIndex >= 0 && targetIndex >= 0 && targetIndex < currentIndex) {
      return null
    }
  }
  return null
}

export async function setPhase(
  hackathonId: string,
  tenantId: string,
  phase: HackathonPhase
): Promise<{ success: true } | { error: string }> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: hackathon, error: fetchError } = await client
    .from("hackathons")
    .select("status, phase, tenant_id")
    .eq("id", hackathonId)
    .single()

  if (fetchError || !hackathon) {
    return { error: "Hackathon not found" }
  }
  if (hackathon.tenant_id !== tenantId) {
    return { error: "Unauthorized" }
  }

  const validationError = validatePhaseTransition(hackathon.status, hackathon.phase, phase)
  if (validationError) {
    return { error: validationError }
  }

  const { error: updateError } = await client
    .from("hackathons")
    .update({ phase, updated_at: new Date().toISOString() })
    .eq("id", hackathonId)

  if (updateError) {
    console.error("Failed to set phase:", updateError)
    return { error: "Failed to update phase" }
  }

  return { success: true }
}

export async function getPhase(hackathonId: string): Promise<HackathonPhase | null> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data, error } = await client
    .from("hackathons")
    .select("phase")
    .eq("id", hackathonId)
    .single()

  if (error || !data) return null
  return data.phase
}
