"use client"

import { CheckCircle2, XCircle, Clock, Loader2, Terminal, MessageSquare, AlertTriangle } from "lucide-react"
import type { AgentRun, AgentStep } from "@/lib/db/agent-types"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface RunDetailProps {
  run: AgentRun
  steps: AgentStep[]
}

const statusIcons: Record<string, React.ReactNode> = {
  queued: <Clock className="size-5 text-muted-foreground" />,
  initializing: <Loader2 className="size-5 text-blue-500 animate-spin" />,
  running: <Loader2 className="size-5 text-blue-500 animate-spin" />,
  awaiting_input: <Clock className="size-5 text-yellow-500" />,
  succeeded: <CheckCircle2 className="size-5 text-green-500" />,
  failed: <XCircle className="size-5 text-red-500" />,
  canceled: <XCircle className="size-5 text-muted-foreground" />,
  timed_out: <XCircle className="size-5 text-orange-500" />,
}

const statusLabels: Record<string, string> = {
  queued: "Queued",
  initializing: "Initializing",
  running: "Running",
  awaiting_input: "Awaiting Input",
  succeeded: "Succeeded",
  failed: "Failed",
  canceled: "Canceled",
  timed_out: "Timed Out",
}

function StepIcon({ type }: { type: string }) {
  switch (type) {
    case "tool_call":
    case "tool_result":
      return <Terminal className="size-4 text-blue-500" />
    case "text":
      return <MessageSquare className="size-4 text-green-500" />
    case "error":
      return <AlertTriangle className="size-4 text-red-500" />
    default:
      return <Clock className="size-4 text-muted-foreground" />
  }
}

function formatOutput(output: unknown): string {
  if (output === null || output === undefined) return ""
  if (typeof output === "string") return output
  return JSON.stringify(output, null, 2)
}

export function RunDetail({ run, steps }: RunDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {statusIcons[run.status]}
          <div>
            <div className="font-semibold">{statusLabels[run.status] || run.status}</div>
            <div className="text-sm text-muted-foreground">
              {run.trigger_type || "manual"} trigger
            </div>
          </div>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div>Created: {new Date(run.created_at).toLocaleString()}</div>
          {run.completed_at && (
            <div>Completed: {new Date(run.completed_at).toLocaleString()}</div>
          )}
        </div>
      </div>

      {run.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-4">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="size-4" />
            <span className="font-medium">Error</span>
          </div>
          <pre className="mt-2 text-sm text-red-600 dark:text-red-300 whitespace-pre-wrap">
            {typeof run.error === "string" ? run.error : JSON.stringify(run.error, null, 2)}
          </pre>
        </div>
      )}

      {run.output && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="font-medium mb-2">Output</div>
          <pre className="text-sm whitespace-pre-wrap">
            {typeof run.output === "string" ? run.output : JSON.stringify(run.output, null, 2)}
          </pre>
        </div>
      )}

      <Separator />

      <div>
        <h3 className="font-semibold mb-4">Execution Steps</h3>
        {steps.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No steps recorded yet
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="rounded-lg border p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <StepIcon type={step.type} />
                      {step.type}
                    </Badge>
                    {step.name && (
                      <span className="font-mono text-sm">{step.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>#{index + 1}</span>
                    {step.duration_ms && (
                      <span>{step.duration_ms}ms</span>
                    )}
                  </div>
                </div>

                {step.input && (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Input</div>
                    <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">
                      {formatOutput(step.input)}
                    </pre>
                  </div>
                )}

                {step.output && (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Output</div>
                    <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">
                      {formatOutput(step.output)}
                    </pre>
                  </div>
                )}

                {step.error && (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-red-500 mb-1">Error</div>
                    <pre className="text-xs bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded p-2">
                      {step.error}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
