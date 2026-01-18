import type { Json } from "@/lib/db/types"

export interface StreamLogEntry {
  timestamp: string
  level: "info" | "error" | "debug"
  context: string
  message: string
  data?: unknown
}

export type StepStreamEventType =
  | "step.started"
  | "step.completed"
  | "step.error"
  | "run.status"

export interface StepStartedData {
  stepNumber: number
  stepType: "tool_call" | "text"
  name?: string
  input?: Json
}

export interface StepCompletedData {
  stepNumber: number
  stepType: "tool_result" | "text"
  name?: string
  output?: Json
  durationMs?: number
}

export interface StepErrorData {
  stepNumber: number
  name?: string
  error: string
}

export interface RunStatusData {
  status: "running" | "succeeded" | "failed" | "canceled"
  error?: string
}

export type StepStreamData =
  | StepStartedData
  | StepCompletedData
  | StepErrorData
  | RunStatusData

export interface StepStreamEvent {
  type: StepStreamEventType
  timestamp: string
  runId: string
  data: StepStreamData
}

export interface StepEventChunk {
  type: "step"
  stepEvent: StepStreamEvent
}

export function isStepEventChunk(chunk: unknown): chunk is StepEventChunk {
  return (
    typeof chunk === "object" &&
    chunk !== null &&
    "type" in chunk &&
    chunk.type === "step" &&
    "stepEvent" in chunk
  )
}
