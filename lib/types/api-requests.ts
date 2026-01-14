import type { AgentType, ScheduleFrequency } from "@/lib/db/agent-types"
import type { Json } from "@/lib/db/types"

export interface UpdateAgentRequest {
  name?: string
  description?: string | null
  instructions?: string | null
  type?: AgentType
  model?: string
  maxSteps?: number
  skillIds?: string[]
  config?: Json
  isActive?: boolean
}

export interface CreateAgentRequest {
  name: string
  description?: string
  instructions?: string
  type?: AgentType
  model?: string
  skillIds?: string[]
  config?: Json
}

export interface CreateSkillRequest {
  name: string
  slug: string
  description?: string
  content: string
  referencesContent?: Json
  scriptsContent?: Json
}

export interface UpdateSkillRequest {
  name?: string
  slug?: string
  description?: string
  content?: string
  referencesContent?: Json
  scriptsContent?: Json
}

export interface CreateScheduleRequest {
  name: string
  frequency: ScheduleFrequency
  cronExpression?: string
  timezone?: string
  runTime?: string
  agentId?: string
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

export interface RunAgentRequest {
  prompt: string
  context?: Json
}
