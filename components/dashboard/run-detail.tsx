"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileJson2,
  StopCircle,
  RotateCcw,
  ArrowDown,
  Terminal,
  FileOutput,
} from "lucide-react"
import type { AgentRun, AgentStep } from "@/lib/db/agent-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { JsonViewer } from "@/components/ui/json-viewer"
import { CopyButton } from "@/components/ui/copy-button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { formatDateTime } from "@/lib/utils/format"
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom"
import { LogEntry } from "./run-detail/log-entry"
import type { StreamLogEntry } from "@/lib/workflows/agents/stream-types"

interface RunDetailProps {
  run: AgentRun
  steps?: AgentStep[]
}

const statusIcons: Record<string, React.ReactNode> = {
  queued: <Clock className="size-4 text-muted-foreground" />,
  initializing: <Loader2 className="size-4 text-primary animate-spin" />,
  running: <Loader2 className="size-4 text-primary animate-spin" />,
  awaiting_input: <Clock className="size-4 text-muted-foreground" />,
  succeeded: <CheckCircle2 className="size-4 text-primary" />,
  failed: <XCircle className="size-4 text-destructive" />,
  canceled: <XCircle className="size-4 text-muted-foreground" />,
  timed_out: <XCircle className="size-4 text-destructive" />,
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
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return value
    }
  }
  return value
}

function isSystemTool(name: string | undefined | null): boolean {
  if (!name) return false
  const lower = name.toLowerCase()
  return lower.includes("sandbox") || lower.includes("system")
}

function formatToolName(name: string | undefined | null): string {
  if (!name) return "operation"
  return name.replace(/_/g, " ")
}

function stepsToLogs(steps: AgentStep[]): StreamLogEntry[] {
  return steps.map((step) => {
    let context = "agent"
    let message = ""
    let data: unknown = undefined

    switch (step.type) {
      case "tool_call":
        if (isSystemTool(step.name)) {
          context = "system"
          message = formatToolName(step.name)
        } else {
          context = "tool"
          message = `Calling ${step.name || "tool"}`
        }
        data = step.input
        break
      case "tool_result":
        if (isSystemTool(step.name)) {
          context = "system"
          message = `${formatToolName(step.name)} completed`
        } else {
          context = "tool"
          message = `${step.name || "tool"} completed`
        }
        data = step.output
        break
      case "text":
        context = "agent"
        message = step.content || "Agent response"
        break
      case "thinking":
        context = "agent"
        message = step.content || "Thinking..."
        break
      case "error":
        context = "error"
        message = step.error || "Error occurred"
        break
      default:
        message = step.content || `Step ${step.step_number}`
    }

    return {
      timestamp: step.timestamp || step.created_at,
      level: step.type === "error" ? "error" : "info",
      context,
      message,
      data,
    }
  })
}

interface FullTraceProps {
  result: unknown
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
}

function FullTrace({ result, expanded, onExpandedChange }: FullTraceProps) {
  if (!result) return null

  const parsed = tryParseJson(result)
  const isObject = parsed !== null && typeof parsed === "object"

  return (
    <Collapsible open={expanded} onOpenChange={onExpandedChange}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-muted/50 transition-colors border-t">
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
          <FileJson2 className="size-4 text-primary" />
          <span className="font-medium text-sm">Full Trace</span>
          <Badge variant="outline" className="text-xs">
            {isObject
              ? `${Object.keys(parsed as object).length} keys`
              : "raw"}
          </Badge>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 border-t">
          <div className="flex items-center justify-end mb-2">
            <CopyButton value={result as string | object} />
          </div>
          <div className="max-h-[600px] overflow-auto bg-background/50 rounded p-3">
            {isObject ? (
              <JsonViewer
                data={parsed}
                defaultExpanded={false}
                className="text-xs"
              />
            ) : (
              <pre className="whitespace-pre-wrap break-words font-mono text-xs">
                {typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function LiveBadge() {
  return (
    <Badge variant="outline" className="gap-1.5">
      <span className="size-2 bg-green-500 rounded-full animate-pulse" />
      Live
    </Badge>
  )
}

function ScrollToBottomButton() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext()

  if (isAtBottom) return null

  return (
    <Button
      className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full z-10"
      onClick={() => scrollToBottom()}
      size="icon"
      variant="outline"
    >
      <ArrowDown className="size-4" />
    </Button>
  )
}

interface ExecutionLogTerminalProps {
  logs: StreamLogEntry[]
  isRunning: boolean
}

function ExecutionLogTerminal({ logs, isRunning }: ExecutionLogTerminalProps) {
  return (
    <StickToBottom className="relative h-[400px] overflow-y-hidden bg-zinc-950 rounded-b-lg">
      <StickToBottom.Content className="flex flex-col p-4 font-mono text-sm">
        {logs.length === 0 && !isRunning && (
          <div className="text-center py-8 text-zinc-500">
            No execution logs available
          </div>
        )}

        {logs.length === 0 && isRunning && (
          <div className="text-center py-8 text-zinc-500">
            <Loader2 className="size-5 animate-spin mx-auto mb-2" />
            Waiting for logs...
          </div>
        )}

        {logs.map((log, index) => (
          <LogEntry key={`${log.timestamp}-${index}`} log={log} />
        ))}
      </StickToBottom.Content>
      <ScrollToBottomButton />
    </StickToBottom>
  )
}

interface OutputContentProps {
  run: AgentRun
}

function OutputContent({ run }: OutputContentProps) {
  const outputText = extractOutputText(run.output)

  if (run.error) {
    return (
      <div className="p-4 border-t">
        <div className="max-h-96 overflow-y-auto bg-destructive/5 rounded p-3">
          <pre className="text-sm text-destructive whitespace-pre-wrap break-all font-mono">
            {typeof run.error === "string"
              ? run.error
              : JSON.stringify(run.error, null, 2)}
          </pre>
        </div>
      </div>
    )
  }

  if (!run.output) return null

  const textContent = outputText ?? (typeof run.output === "string" ? run.output : "")
  const copyValue = outputText ?? (typeof run.output === "object" ? (run.output as object) : String(run.output))

  return (
    <div className="p-4 border-t">
      <Tabs defaultValue="markdown">
        <div className="flex items-center justify-between mb-2">
          <TabsList variant="line">
            <TabsTrigger value="markdown">Markdown</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
            <TabsTrigger value="raw">Raw</TabsTrigger>
          </TabsList>
          <CopyButton value={copyValue} />
        </div>
        <div className="max-h-96 overflow-y-auto bg-background/50 rounded p-3">
          <TabsContent value="markdown">
            <div className="text-sm">
              <MarkdownContent content={textContent || JSON.stringify(run.output, null, 2)} />
            </div>
          </TabsContent>
          <TabsContent value="json">
            <JsonViewer data={tryParseJson(run.output)} />
          </TabsContent>
          <TabsContent value="raw">
            <pre className="text-sm whitespace-pre-wrap break-all font-mono">
              {textContent || JSON.stringify(run.output, null, 2)}
            </pre>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

function parseInlineMarkdown(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = []
  let remaining = text
  let keyIndex = 0

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+?)\*(?!\*)/)
    const codeMatch = remaining.match(/`([^`]+?)`/)

    const matches = [
      boldMatch && { type: "bold", match: boldMatch, index: boldMatch.index! },
      italicMatch && { type: "italic", match: italicMatch, index: italicMatch.index! },
      codeMatch && { type: "code", match: codeMatch, index: codeMatch.index! },
    ].filter(Boolean) as { type: string; match: RegExpMatchArray; index: number }[]

    if (matches.length === 0) {
      result.push(remaining)
      break
    }

    matches.sort((a, b) => a.index - b.index)
    const first = matches[0]

    if (first.index > 0) {
      result.push(remaining.slice(0, first.index))
    }

    if (first.type === "bold") {
      result.push(<strong key={keyIndex++} className="font-semibold">{first.match[1]}</strong>)
    } else if (first.type === "italic") {
      result.push(<em key={keyIndex++}>{first.match[1]}</em>)
    } else if (first.type === "code") {
      result.push(<code key={keyIndex++} className="bg-muted px-1 rounded text-xs">{first.match[1]}</code>)
    }

    remaining = remaining.slice(first.index + first.match[0].length)
  }

  return result
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeContent: string[] = []

  lines.forEach((line, i) => {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={i} className="bg-muted p-2 rounded overflow-x-auto my-2">
            <code className="text-xs">{codeContent.join("\n")}</code>
          </pre>
        )
        codeContent = []
        inCodeBlock = false
      } else {
        inCodeBlock = true
      }
      return
    }

    if (inCodeBlock) {
      codeContent.push(line)
      return
    }

    if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-lg font-bold mt-4 mb-2">{parseInlineMarkdown(line.slice(2))}</h1>)
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-base font-semibold mt-3 mb-2">{parseInlineMarkdown(line.slice(3))}</h2>)
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-sm font-medium mt-2 mb-1">{parseInlineMarkdown(line.slice(4))}</h3>)
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(<li key={i} className="ml-4 list-disc">{parseInlineMarkdown(line.slice(2))}</li>)
    } else if (/^\d+\.\s/.test(line)) {
      elements.push(<li key={i} className="ml-4 list-decimal">{parseInlineMarkdown(line.replace(/^\d+\.\s/, ""))}</li>)
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />)
    } else if (line.trim() === "---" || line.trim() === "***") {
      elements.push(<hr key={i} className="my-3 border-muted" />)
    } else {
      elements.push(<p key={i} className="my-1">{parseInlineMarkdown(line)}</p>)
    }
  })

  return <>{elements}</>
}

export function RunDetail({ run, steps = [] }: RunDetailProps) {
  const router = useRouter()
  const [canceling, setCanceling] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [streamLogs, setStreamLogs] = useState<StreamLogEntry[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [logsExpanded, setLogsExpanded] = useState(true)
  const [outputExpanded, setOutputExpanded] = useState(false)
  const [traceExpanded, setTraceExpanded] = useState(false)
  const initialStateSetRef = useRef(false)

  const isRunning = [
    "queued",
    "initializing",
    "running",
    "awaiting_input",
  ].includes(run.status)
  const isComplete = ["succeeded", "failed", "canceled", "timed_out"].includes(
    run.status
  )
  const canCancel = isRunning
  const canRestart = isComplete

  const historicalLogs = stepsToLogs(steps)
  const logs = streamLogs.length > 0 ? streamLogs : historicalLogs

  useEffect(() => {
    if (!initialStateSetRef.current && isComplete && (run.output || run.error)) {
      setOutputExpanded(true)
      setLogsExpanded(false)
      initialStateSetRef.current = true
    }
  }, [isComplete, run.output, run.error])

  useEffect(() => {
    if (!isRunning) return

    setIsStreaming(true)
    const abortController = new AbortController()

    const connectToStream = async () => {
      try {
        const response = await fetch(`/api/v1/runs/${run.id}/stream`, {
          headers: { Accept: "text/event-stream" },
          signal: abortController.signal,
        })

        if (!response.ok || !response.body) {
          setIsStreaming(false)
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.timestamp && data.context && data.message) {
                  setStreamLogs((prev) => [...prev, data as StreamLogEntry])
                }
              } catch {
                // ignore parse errors
              }
            } else if (line.startsWith("event: done")) {
              setIsStreaming(false)
              router.refresh()
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("[RunDetail] Stream error:", err)
        }
      } finally {
        setIsStreaming(false)
      }
    }

    connectToStream()

    return () => {
      abortController.abort()
    }
  }, [run.id, isRunning, router])

  const handleCancel = async () => {
    if (!canCancel || canceling) return
    setCanceling(true)
    try {
      const response = await fetch(`/api/v1/runs/${run.id}/cancel`, {
        method: "POST",
      })
      if (response.ok) {
        router.refresh()
      }
    } finally {
      setCanceling(false)
    }
  }

  const handleRestart = async () => {
    if (!canRestart || restarting) return
    setRestarting(true)
    try {
      const response = await fetch(`/api/v1/runs/${run.id}/restart`, {
        method: "POST",
      })
      if (response.ok) {
        const data = await response.json()
        router.push(`/runs/${data.runId}`)
      }
    } finally {
      setRestarting(false)
    }
  }

  const currentStep = logs.length > 0 ? logs[logs.length - 1].message : null

  return (
    <div className="space-y-4 min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {statusIcons[run.status]}
          <span className="font-medium text-sm">
            {statusLabels[run.status] || run.status}
          </span>
          <Badge variant="outline" className="text-xs">
            {run.trigger_type || "manual"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDateTime(run.created_at)}
          </span>
          {run.completed_at && (
            <>
              <span className="text-xs text-muted-foreground">→</span>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(run.completed_at)}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={canceling}
            >
              {canceling ? (
                <Loader2 className="size-4 mr-1 animate-spin" />
              ) : (
                <StopCircle className="size-4 mr-1" />
              )}
              Stop
            </Button>
          )}
          {canRestart && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestart}
              disabled={restarting}
            >
              {restarting ? (
                <Loader2 className="size-4 mr-1 animate-spin" />
              ) : (
                <RotateCcw className="size-4 mr-1" />
              )}
              Restart
            </Button>
          )}
        </div>
      </div>

      {run.error && !isComplete && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 w-full max-w-full overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" />
              <span className="font-medium">Error</span>
            </div>
            <CopyButton
              value={
                typeof run.error === "string"
                  ? run.error
                  : JSON.stringify(run.error, null, 2)
              }
            />
          </div>
          <div className="max-h-96 overflow-y-auto bg-destructive/5 rounded p-3">
            <pre className="text-sm text-destructive whitespace-pre-wrap break-all font-mono">
              {typeof run.error === "string"
                ? run.error
                : JSON.stringify(run.error, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div className="rounded-lg border overflow-hidden">
        <Collapsible open={logsExpanded} onOpenChange={setLogsExpanded}>
          <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              {logsExpanded ? (
                <ChevronDown className="size-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground" />
              )}
              <Terminal className="size-4 text-primary" />
              <span className="font-medium text-sm">Execution Log</span>
              {logs.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {logs.length}
                </Badge>
              )}
              {isStreaming && currentStep && !logsExpanded && (
                <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                  {currentStep}
                </span>
              )}
              {isStreaming && <LiveBadge />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ExecutionLogTerminal logs={logs} isRunning={isRunning} />
          </CollapsibleContent>
        </Collapsible>

        {(run.output || run.error) && isComplete && (
          <Collapsible open={outputExpanded} onOpenChange={setOutputExpanded}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-muted/50 transition-colors border-t">
              <div className="flex items-center gap-2">
                {outputExpanded ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
                {run.error ? (
                  <AlertTriangle className="size-4 text-destructive" />
                ) : (
                  <FileOutput className="size-4 text-primary" />
                )}
                <span className="font-medium text-sm">
                  {run.error ? "Error" : "Output"}
                </span>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <OutputContent run={run} />
            </CollapsibleContent>
          </Collapsible>
        )}

        {run.result && (
          <FullTrace
            result={run.result}
            expanded={traceExpanded}
            onExpandedChange={setTraceExpanded}
          />
        )}
      </div>
    </div>
  )
}
