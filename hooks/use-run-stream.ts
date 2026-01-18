"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export type AgentRunStatus =
  | "queued"
  | "initializing"
  | "running"
  | "awaiting_input"
  | "succeeded"
  | "failed"
  | "canceled"
  | "timed_out"

export interface StepData {
  stepNumber: number
  type: string
  name?: string
  input?: unknown
  output?: unknown
  durationMs?: number
}

export interface RunStreamState {
  status: AgentRunStatus | null
  steps: StepData[]
  result: unknown
  error: unknown
  isConnected: boolean
  isComplete: boolean
}

export interface UseRunStreamOptions {
  onStepStart?: (data: StepData) => void
  onStepComplete?: (data: StepData) => void
  onStepError?: (data: { stepNumber: number; name?: string; error: string }) => void
  onStatusChange?: (status: AgentRunStatus) => void
  onDone?: (data: { status: AgentRunStatus; result: unknown; error: unknown }) => void
  onError?: (error: Error) => void
}

export function useRunStream(
  runId: string | null,
  options: UseRunStreamOptions = {}
): RunStreamState & { disconnect: () => void } {
  const [state, setState] = useState<RunStreamState>({
    status: null,
    steps: [],
    result: null,
    error: null,
    isConnected: false,
    isComplete: false,
  })

  const eventSourceRef = useRef<EventSource | null>(null)
  const optionsRef = useRef(options)

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setState((prev) => ({ ...prev, isConnected: false }))
    }
  }, [])

  useEffect(() => {
    if (!runId) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      return
    }

    // Reset state when runId changes - this is intentional to clear previous run data
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({
      status: null,
      steps: [],
      result: null,
      error: null,
      isConnected: false,
      isComplete: false,
    })

    const eventSource = new EventSource(`/api/dashboard/runs/${runId}/stream`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setState((prev) => ({ ...prev, isConnected: true }))
    }

    eventSource.onerror = (event) => {
      console.error("[useRunStream] EventSource error:", event)
      optionsRef.current.onError?.(new Error("Stream connection error"))
      setState((prev) => ({ ...prev, isConnected: false }))
    }

    eventSource.addEventListener("status", (event) => {
      try {
        const data = JSON.parse(event.data)
        const status = data.status as AgentRunStatus
        setState((prev) => ({ ...prev, status }))
        optionsRef.current.onStatusChange?.(status)
      } catch (err) {
        console.error("[useRunStream] Failed to parse status event:", err)
      }
    })

    eventSource.addEventListener("step_start", (event) => {
      try {
        const data = JSON.parse(event.data) as StepData
        setState((prev) => ({
          ...prev,
          steps: [...prev.steps, { ...data, type: "tool_call" }],
        }))
        optionsRef.current.onStepStart?.(data)
      } catch (err) {
        console.error("[useRunStream] Failed to parse step_start event:", err)
      }
    })

    eventSource.addEventListener("step", (event) => {
      try {
        const data = JSON.parse(event.data) as StepData
        setState((prev) => {
          const existingIndex = prev.steps.findIndex(
            (s) => s.stepNumber === data.stepNumber && s.type === "tool_call"
          )
          if (existingIndex >= 0) {
            const updatedSteps = [...prev.steps]
            updatedSteps[existingIndex] = {
              ...updatedSteps[existingIndex],
              ...data,
              type: data.type || "tool_result",
            }
            return { ...prev, steps: updatedSteps }
          }
          return { ...prev, steps: [...prev.steps, data] }
        })
        optionsRef.current.onStepComplete?.(data)
      } catch (err) {
        console.error("[useRunStream] Failed to parse step event:", err)
      }
    })

    eventSource.addEventListener("step_error", (event) => {
      try {
        const data = JSON.parse(event.data)
        optionsRef.current.onStepError?.(data)
      } catch (err) {
        console.error("[useRunStream] Failed to parse step_error event:", err)
      }
    })

    eventSource.addEventListener("done", (event) => {
      try {
        const data = JSON.parse(event.data)
        setState((prev) => ({
          ...prev,
          status: data.status,
          result: data.result,
          error: data.error,
          isComplete: true,
          isConnected: false,
        }))
        optionsRef.current.onDone?.({
          status: data.status,
          result: data.result,
          error: data.error,
        })
        eventSource.close()
      } catch (err) {
        console.error("[useRunStream] Failed to parse done event:", err)
      }
    })

    return () => {
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [runId, disconnect])

  return { ...state, disconnect }
}
