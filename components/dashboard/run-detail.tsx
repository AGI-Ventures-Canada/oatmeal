"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, Clock, Loader2, MessageSquare, AlertTriangle, ChevronDown, ChevronRight, FileJson2 } from "lucide-react"
import type { AgentRun, AgentStep } from "@/lib/db/agent-types"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { JsonViewer } from "@/components/ui/json-viewer"
import { CopyButton } from "@/components/ui/copy-button"
import { formatDateTime } from "@/lib/utils/format"
import { cn } from "@/lib/utils"
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool"
import type { ToolUIPart } from "ai"

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

interface ToolInvocation {
  id: string
  name: string
  input?: unknown
  output?: unknown
  error?: string
}

interface TextMessage {
  id: string
  text: string
  role: "user" | "assistant"
}

type ConversationItem =
  | { type: "tool"; data: ToolInvocation }
  | { type: "text"; data: TextMessage }

interface MessageContent {
  type?: string
  text?: string
  toolName?: string
  toolCallId?: string
  input?: unknown
  output?: unknown
}

interface Message {
  role?: string
  content?: unknown
}

function extractFromMessages(result: unknown): ConversationItem[] {
  const items: ConversationItem[] = []

  if (!result || typeof result !== "object") return items

  const r = result as Record<string, unknown>
  const messages = r.messages as Message[] | undefined

  if (!Array.isArray(messages)) return items

  const toolCallMap = new Map<string, ToolInvocation>()

  for (const msg of messages) {
    if (!Array.isArray(msg.content)) continue

    for (const part of msg.content as MessageContent[]) {
      if (msg.role === "assistant") {
        if (part.type === "tool-call" && part.toolCallId) {
          const invocation: ToolInvocation = {
            id: part.toolCallId,
            name: part.toolName ?? "unknown",
            input: part.input,
          }
          toolCallMap.set(part.toolCallId, invocation)
          items.push({ type: "tool", data: invocation })
        } else if (part.type === "text" && part.text) {
          items.push({
            type: "text",
            data: { id: `text-${items.length}`, text: part.text, role: "assistant" }
          })
        }
      } else if (msg.role === "tool") {
        if (part.type === "tool-result" && part.toolCallId) {
          const existing = toolCallMap.get(part.toolCallId)
          if (existing) {
            const output = part.output as { type?: string; value?: string } | undefined
            existing.output = output?.value ?? output
          }
        }
      } else if (msg.role === "user") {
        if (part.type === "text" && part.text) {
          items.push({
            type: "text",
            data: { id: `user-${items.length}`, text: part.text, role: "user" }
          })
        }
      }
    }
  }

  return items
}

function getToolState(tool: ToolInvocation): ToolUIPart["state"] {
  if (tool.error) return "output-error"
  if (tool.output !== undefined) return "output-available"
  return "input-available"
}

function extractOutputText(output: unknown): string | null {
  if (typeof output === "string") return output
  if (output && typeof output === "object") {
    const o = output as Record<string, unknown>
    if (typeof o.output === "string") return o.output
  }
  return null
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
      <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
        <div
          className="flex items-center gap-2 cursor-pointer flex-1"
          onClick={() => setExpanded(!expanded)}
        >
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
        <div className="flex items-center gap-2">
          <CopyButton value={result as string | object} size="sm" />
        </div>
      </div>

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
            <CopyButton value={typeof run.error === "string" ? run.error : JSON.stringify(run.error, null, 2)} />
          </div>
          <div className="max-h-96 overflow-y-auto bg-destructive/5 rounded p-3">
            <pre className="text-sm text-destructive whitespace-pre-wrap break-all font-mono">
              {typeof run.error === "string" ? run.error : JSON.stringify(run.error, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {run.output && (() => {
        const outputText = extractOutputText(run.output)
        return (
          <div className="rounded-lg border bg-muted/50 p-4 w-full max-w-full overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Output</div>
              <CopyButton value={outputText ?? (typeof run.output === "object" ? run.output as object : String(run.output))} />
            </div>
            <div className="max-h-96 overflow-y-auto bg-background/50 rounded p-3">
              {outputText ? (
                <pre className="text-sm whitespace-pre-wrap break-all font-mono">{outputText}</pre>
              ) : (
                <JsonViewer data={run.output} />
              )}
            </div>
          </div>
        )
      })()}

      <Separator />

      <div>
        <h3 className="font-semibold mb-4">Execution Steps</h3>
        {(() => {
          const items = extractFromMessages(run.result)

          if (items.length === 0) {
            return (
              <div className="text-center py-8 text-muted-foreground">
                No steps recorded yet
              </div>
            )
          }

          return (
            <div className="space-y-3">
              {items.map((item) => {
                if (item.type === "tool") {
                  const tool = item.data
                  return (
                    <Tool key={tool.id} defaultOpen={false}>
                      <ToolHeader
                        title={tool.name}
                        type="tool-invocation"
                        state={getToolState(tool)}
                      />
                      <ToolContent>
                        {tool.input !== undefined && (
                          <ToolInput input={tool.input as ToolUIPart["input"]} />
                        )}
                        {(tool.output !== undefined || tool.error !== undefined) && (
                          <ToolOutput
                            output={tool.output as ToolUIPart["output"]}
                            errorText={tool.error as ToolUIPart["errorText"]}
                          />
                        )}
                      </ToolContent>
                    </Tool>
                  )
                } else {
                  const text = item.data
                  return (
                    <div key={text.id} className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="gap-1">
                          <MessageSquare className="size-4 text-primary" />
                          {text.role === "user" ? "User" : "Response"}
                        </Badge>
                      </div>
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {text.text}
                      </div>
                    </div>
                  )
                }
              })}
            </div>
          )
        })()}
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
