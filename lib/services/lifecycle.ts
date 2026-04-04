import { supabase as getSupabase } from "@/lib/db/client"
import type {
  Hackathon,
  HackathonStatus,
  TransitionEvent,
  TransitionTrigger,
} from "@/lib/db/hackathon-types"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getEffectiveStatus } from "@/lib/utils/timeline"

const VALID_TRANSITIONS: Record<HackathonStatus, HackathonStatus[]> = {
  draft: ["published"],
  published: ["registration_open", "active", "draft"],
  registration_open: ["active", "published"],
  active: ["judging", "completed"],
  judging: ["completed"],
  completed: ["archived", "judging"],
  archived: [],
}

const STATUS_TO_EVENT: Partial<Record<HackathonStatus, TransitionEvent>> = {
  registration_open: "registration_opened",
  active: "hackathon_started",
  judging: "judging_started",
  completed: "results_published",
}

export type TransitionInput = {
  hackathonId: string
  tenantId: string
  fromStatus: HackathonStatus
  toStatus: HackathonStatus
  trigger: TransitionTrigger
  triggeredBy: string
}

export type TransitionResult = {
  success: boolean
  error?: string
  hackathon?: Hackathon
}

export async function executeTransition(
  input: TransitionInput
): Promise<TransitionResult> {
  const { fromStatus, toStatus, hackathonId, tenantId, trigger, triggeredBy } =
    input

  const validTargets = VALID_TRANSITIONS[fromStatus]
  if (!validTargets?.includes(toStatus)) {
    return {
      success: false,
      error: `Invalid transition from ${fromStatus} to ${toStatus}`,
    }
  }

  const client = getSupabase() as unknown as SupabaseClient

  const isDuplicate = await checkRecentTransition(
    client,
    hackathonId,
    toStatus
  )
  if (isDuplicate) {
    return {
      success: false,
      error: `Transition to ${toStatus} already occurred recently`,
    }
  }

  const { data: hackathon, error: updateError } = await client
    .from("hackathons")
    .update({ status: toStatus, updated_at: new Date().toISOString() })
    .eq("id", hackathonId)
    .eq("tenant_id", tenantId)
    .select()
    .single()

  if (updateError || !hackathon) {
    return {
      success: false,
      error: `Failed to update status: ${updateError?.message ?? "hackathon not found"}`,
    }
  }

  await client.from("hackathon_transitions").insert({
    hackathon_id: hackathonId,
    from_status: fromStatus,
    to_status: toStatus,
    trigger,
    triggered_by: triggeredBy,
  })

  const event = STATUS_TO_EVENT[toStatus]
  if (event) {
    const { dispatchTransitionNotifications } = await import(
      "./notification-dispatcher"
    )
    dispatchTransitionNotifications({
      type: event,
      hackathonId,
      tenantId,
      hackathon: {
        name: hackathon.name as string,
        slug: hackathon.slug as string,
      },
      trigger,
      triggeredBy,
      fromStatus,
      toStatus,
    }).catch((err) => {
      console.error(
        `Failed to dispatch notifications for ${fromStatus} → ${toStatus}:`,
        err
      )
    })
  }

  return { success: true, hackathon: hackathon as unknown as Hackathon }
}

export type AutoTransitionResult = {
  processed: number
  transitions: Array<{ hackathonId: string; from: string; to: string }>
  errors: string[]
}

export async function processAutoTransitions(): Promise<AutoTransitionResult> {
  const client = getSupabase() as unknown as SupabaseClient

  const { data: hackathons, error } = await client
    .from("hackathons")
    .select("id, tenant_id, status, starts_at, ends_at, name, slug")
    .not("status", "in", "(draft,completed,archived)")

  if (error || !hackathons) {
    return { processed: 0, transitions: [], errors: [error?.message ?? "Failed to fetch hackathons"] }
  }

  const result: AutoTransitionResult = {
    processed: 0,
    transitions: [],
    errors: [],
  }

  for (const h of hackathons) {
    const stored = h.status as HackathonStatus
    const effective = getEffectiveStatus({
      status: stored,
      starts_at: h.starts_at as string | null,
      ends_at: h.ends_at as string | null,
    })

    if (effective === stored) continue

    const transitionResult = await executeTransition({
      hackathonId: h.id as string,
      tenantId: h.tenant_id as string,
      fromStatus: stored,
      toStatus: effective,
      trigger: "auto",
      triggeredBy: "system",
    })

    if (transitionResult.success) {
      result.processed++
      result.transitions.push({
        hackathonId: h.id as string,
        from: stored,
        to: effective,
      })
    } else if (transitionResult.error) {
      result.errors.push(
        `${h.id}: ${transitionResult.error}`
      )
    }
  }

  return result
}

async function checkRecentTransition(
  client: SupabaseClient,
  hackathonId: string,
  toStatus: string
): Promise<boolean> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const { data } = await client
    .from("hackathon_transitions")
    .select("id")
    .eq("hackathon_id", hackathonId)
    .eq("to_status", toStatus)
    .gte("created_at", fiveMinutesAgo)
    .limit(1)

  return (data?.length ?? 0) > 0
}
