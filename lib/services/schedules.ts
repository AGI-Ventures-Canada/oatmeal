import { supabase as getSupabase } from "@/lib/db/client"
import type { Schedule, ScheduleFrequency } from "@/lib/db/hackathon-types"
import type { Json } from "@/lib/db/types"

export type CreateScheduleInput = {
  tenantId: string
  name: string
  frequency: ScheduleFrequency
  cronExpression?: string
  timezone?: string
  runTime?: string // HH:MM format
  jobType?: string
  input?: Json
}

export type UpdateScheduleInput = {
  name?: string
  frequency?: ScheduleFrequency
  cronExpression?: string
  timezone?: string
  runTime?: string // HH:MM format
  input?: Json
  isActive?: boolean
}

export async function createSchedule(
  input: CreateScheduleInput
): Promise<Schedule | null> {
  if (!input.jobType) {
    console.error("jobType must be provided")
    return null
  }

  const nextRunAt = calculateNextRun(
    input.frequency,
    input.cronExpression,
    input.timezone ?? "UTC",
    input.runTime
  )

  const { data, error } = await getSupabase()
    .from("schedules")
    .insert({
      tenant_id: input.tenantId,
      name: input.name,
      frequency: input.frequency,
      cron_expression: input.cronExpression ?? null,
      timezone: input.timezone ?? "UTC",
      job_type: input.jobType ?? null,
      input: input.input ?? null,
      next_run_at: nextRunAt?.toISOString() ?? null,
    })
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to create schedule:", error)
    return null
  }

  return data as Schedule
}

export async function getScheduleById(
  scheduleId: string,
  tenantId: string
): Promise<Schedule | null> {
  const { data } = await getSupabase()
    .from("schedules")
    .select("*")
    .eq("id", scheduleId)
    .eq("tenant_id", tenantId)
    .single()

  return data as Schedule | null
}

export async function listSchedules(
  tenantId: string,
  options: { limit?: number; activeOnly?: boolean } = {}
): Promise<Schedule[]> {
  let query = getSupabase()
    .from("schedules")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (options.activeOnly) {
    query = query.eq("is_active", true)
  }
  if (options.limit) {
    query = query.limit(options.limit)
  }

  const { data } = await query

  return (data as Schedule[] | null) ?? []
}

export async function updateSchedule(
  scheduleId: string,
  tenantId: string,
  updates: UpdateScheduleInput
): Promise<Schedule | null> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.frequency !== undefined) updateData.frequency = updates.frequency
  if (updates.cronExpression !== undefined) updateData.cron_expression = updates.cronExpression
  if (updates.timezone !== undefined) updateData.timezone = updates.timezone
  if (updates.input !== undefined) updateData.input = updates.input
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive

  if (updates.frequency || updates.cronExpression || updates.timezone || updates.runTime) {
    const schedule = await getScheduleById(scheduleId, tenantId)
    if (schedule) {
      const nextRunAt = calculateNextRun(
        updates.frequency ?? schedule.frequency,
        updates.cronExpression ?? schedule.cron_expression ?? undefined,
        updates.timezone ?? schedule.timezone,
        updates.runTime
      )
      updateData.next_run_at = nextRunAt?.toISOString() ?? null
    }
  }

  const { data, error } = await getSupabase()
    .from("schedules")
    .update(updateData)
    .eq("id", scheduleId)
    .eq("tenant_id", tenantId)
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to update schedule:", error)
    return null
  }

  return data as Schedule
}

export async function deleteSchedule(
  scheduleId: string,
  tenantId: string
): Promise<boolean> {
  const { error } = await getSupabase()
    .from("schedules")
    .delete()
    .eq("id", scheduleId)
    .eq("tenant_id", tenantId)

  return !error
}

export async function getNextDueSchedules(limit: number = 100): Promise<Schedule[]> {
  const now = new Date().toISOString()

  const { data } = await getSupabase()
    .from("schedules")
    .select("*")
    .eq("is_active", true)
    .lte("next_run_at", now)
    .order("next_run_at", { ascending: true })
    .limit(limit)

  return (data as Schedule[] | null) ?? []
}

export async function markScheduleRun(scheduleId: string): Promise<Schedule | null> {
  const schedule = await getSupabase()
    .from("schedules")
    .select("*")
    .eq("id", scheduleId)
    .single()

  if (!schedule.data) return null

  const s = schedule.data as Schedule
  const nextRunAt = calculateNextRun(s.frequency, s.cron_expression ?? undefined, s.timezone)

  const { data, error } = await getSupabase()
    .from("schedules")
    .update({
      last_run_at: new Date().toISOString(),
      next_run_at: s.frequency === "once" ? null : nextRunAt?.toISOString() ?? null,
      run_count: (s.run_count ?? 0) + 1,
      is_active: s.frequency === "once" ? false : s.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scheduleId)
    .select()
    .single()

  if (error || !data) {
    console.error("Failed to mark schedule run:", error)
    return null
  }

  return data as Schedule
}

export function calculateNextRun(
  frequency: ScheduleFrequency,
  cronExpression?: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _timezone: string = "UTC",
  runTime?: string // HH:MM format
): Date | null {
  const now = new Date()

  // Parse runTime if provided (default to 09:00)
  let hours = 9
  let minutes = 0
  if (runTime) {
    const [h, m] = runTime.split(":").map(Number)
    if (!isNaN(h) && !isNaN(m)) {
      hours = h
      minutes = m
    }
  }

  switch (frequency) {
    case "once":
      return null

    case "hourly":
      return new Date(now.getTime() + 60 * 60 * 1000)

    case "daily": {
      const next = new Date(now)
      next.setHours(hours, minutes, 0, 0)
      if (next <= now) {
        next.setDate(next.getDate() + 1)
      }
      return next
    }

    case "weekly": {
      const next = new Date(now)
      next.setHours(hours, minutes, 0, 0)
      next.setDate(next.getDate() + 7)
      return next
    }

    case "monthly": {
      const next = new Date(now)
      next.setHours(hours, minutes, 0, 0)
      next.setMonth(next.getMonth() + 1)
      return next
    }

    case "cron":
      if (!cronExpression) return null
      return parseCronExpression(cronExpression)

    default:
      return null
  }
}

function parseCronExpression(expression: string): Date | null {
  const parts = expression.split(" ")
  if (parts.length !== 5) return null

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
  const now = new Date()
  const next = new Date(now)

  try {
    if (minute !== "*") {
      next.setMinutes(parseInt(minute, 10))
    }
    if (hour !== "*") {
      next.setHours(parseInt(hour, 10))
    }
    if (dayOfMonth !== "*") {
      next.setDate(parseInt(dayOfMonth, 10))
    }
    if (month !== "*") {
      next.setMonth(parseInt(month, 10) - 1)
    }

    next.setSeconds(0)
    next.setMilliseconds(0)

    if (next <= now) {
      if (minute !== "*" && hour === "*") {
        next.setHours(next.getHours() + 1)
      } else if (hour !== "*" && dayOfMonth === "*") {
        next.setDate(next.getDate() + 1)
      } else if (dayOfMonth !== "*" && month === "*") {
        next.setMonth(next.getMonth() + 1)
      } else if (month !== "*") {
        next.setFullYear(next.getFullYear() + 1)
      } else {
        next.setMinutes(next.getMinutes() + 1)
      }
    }

    if (dayOfWeek !== "*") {
      const targetDay = parseInt(dayOfWeek, 10)
      const currentDay = next.getDay()
      const daysUntilTarget = (targetDay - currentDay + 7) % 7
      if (daysUntilTarget > 0 || next <= now) {
        next.setDate(next.getDate() + (daysUntilTarget || 7))
      }
    }

    return next
  } catch {
    return null
  }
}
