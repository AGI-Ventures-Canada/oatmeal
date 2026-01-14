"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, Clock, Loader2, Terminal, MessageSquare, AlertTriangle, ChevronDown, ChevronRight, FileJson2 } from "lucide-react"
import type { AgentRun, AgentStep } from "@/lib/db/agent-types"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { JsonViewer } from "@/components/ui/json-viewer"
import { CopyButton } from "@/components/ui/copy-button"
import { formatDateTime } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

interface RunDetailProps {
  run: AgentRun
  steps: AgentStep[]
}

const statusIcons: Record<string, React.ReactNode> = {
  queued: <Clock className="size-5 text-muted-foreground" />,
  initializing: <Loader2 className="size-5 text-primary animate-spin" />,
  running: <Loader2 className="size-5 text-primary animate-spin" />,
  awaiting_input: <Clock className="size-5 text-muted-foreground" />,
  succeeded: <CheckCircle2 className="size-5 text-primary" />,
  failed: <XCircle className="size-5 text-destructive" />,
  canceled: <XCircle className="size-5 text-muted-foreground" />,
  timed_out: <XCircle className="size-5 text-destructive" />,
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
      return <Terminal className="size-4 text-primary" />
    case "text":
      return <MessageSquare className="size-4 text-primary" />
    case "error":
      return <AlertTriangle className="size-4 text-destructive" />
    default:
      return <Clock className="size-4 text-muted-foreground" />
  }
}

function tryParseJson(value: unknown): unknown {
  if (typeof value !== "string") return value
  const trimmed = value.trim()
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return value
    }
  }
  return value
}

function StepData({ data }: { data: unknown }) {
  const parsed = tryParseJson(data)
  const isObject = parsed !== null && typeof parsed === "object"

  if (isObject) {
    return <JsonViewer data={parsed} defaultExpanded className="text-xs" />
  }

  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-xs">{String(data)}</pre>
  )
}

interface FullTraceProps {
  result: unknown
  className?: string
}

function FullTrace({ result, className }: FullTraceProps) {
  const [expanded, setExpanded] = useState(false)

  if (!result) return null

  const parsed = tryParseJson(result)
  const isObject = parsed !== null && typeof parsed === "object"

  return (
    <div className={cn("rounded-lg border bg-muted/30", className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
          <FileJson2 className="size-4 text-primary" />
          <span className="font-medium">Full Trace</span>
          <Badge variant="outline" className="ml-2 text-xs">
            {isObject ? `${Object.keys(parsed as object).length} keys` : "raw"}
          </Badge>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <CopyButton value={result as string | object} size="sm" />
        </div>
      </button>

      {expanded && (
        <div className="border-t">
          <div className="p-4 max-h-[600px] overflow-auto bg-background/50">
            {isObject ? (
              <JsonViewer data={parsed} defaultExpanded={false} className="text-xs" />
            ) : (
              <pre className="whitespace-pre-wrap break-words font-mono text-xs">
                {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function RunDetail({ run, steps }: RunDetailProps) {
  return (
    <div className="space-y-6 min-w-0 overflow-hidden">
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
          <div>Created: {formatDateTime(run.created_at)}</div>
          {run.completed_at && (
            <div>Completed: {formatDateTime(run.completed_at)}</div>
          )}
        </div>
      </div>

      {run.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 w-full max-w-full overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" />
              <span className="font-medium">Error</span>
            </div>
            <CopyButton value={run.error} />
          </div>
          <div className="max-h-96 overflow-y-auto bg-destructive/5 rounded p-3">
            <pre className="text-sm text-destructive whitespace-pre-wrap break-all font-mono">
              {typeof run.error === "string" ? run.error : JSON.stringify(run.error, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {run.output && (
        <div className="rounded-lg border bg-muted/50 p-4 w-full max-w-full overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Output</div>
            <CopyButton value={run.output} />
          </div>
          <div className="max-h-96 overflow-y-auto bg-background/50 rounded p-3">
            {typeof run.output === "string" ? (
              <pre className="text-sm whitespace-pre-wrap break-all font-mono">{run.output}</pre>
            ) : (
              <JsonViewer data={run.output} />
            )}
          </div>
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
                  <div className="mt-2 overflow-hidden">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Input</div>
                    <div className="text-xs bg-muted rounded p-2 overflow-auto">
                      <StepData data={step.input} />
                    </div>
                  </div>
                )}

                {step.output && (
                  <div className="mt-2 overflow-hidden">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Output</div>
                    <div className="text-xs bg-muted rounded p-2 overflow-auto">
                      <StepData data={step.output} />
                    </div>
                  </div>
                )}

                {step.error && (
                  <div className="mt-2 overflow-hidden">
                    <div className="text-xs font-medium text-destructive mb-1">Error</div>
                    <pre className="text-xs bg-destructive/10 text-destructive rounded p-2 whitespace-pre-wrap break-words font-mono">
                      {step.error}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {run.result && (
        <>
          <Separator />
          <FullTrace result={run.result} />
        </>
      )}
    </div>
  )
}
