import type { ScheduleFrequency } from "@/lib/db/hackathon-types"
import type { Json } from "@/lib/db/types"

export interface CreateScheduleRequest {
  name: string
  frequency: ScheduleFrequency
  cronExpression?: string
  timezone?: string
  runTime?: string
  jobType?: string
  input?: Json
}

export interface UpdateScheduleRequest {
  name?: string
  frequency?: ScheduleFrequency
  cronExpression?: string
  timezone?: string
  runTime?: string
  input?: Json
  isActive?: boolean
}
