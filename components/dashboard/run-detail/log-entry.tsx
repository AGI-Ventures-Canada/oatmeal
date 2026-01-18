"use client"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { JsonViewer } from "@/components/ui/json-viewer"
import { CopyButton } from "@/components/ui/copy-button"
import { cn } from "@/lib/utils"
import type { StreamLogEntry } from "@/lib/workflows/agents/stream-types"

interface LogEntryProps {
  log: StreamLogEntry
}

export function LogEntry({ log }: LogEntryProps) {
  const hasExpandableData = Boolean(log.data && typeof log.data === "object")

  return (
    <Collapsible>
      <CollapsibleTrigger asChild disabled={!hasExpandableData}>
        <div
          className={cn(
            "flex items-start gap-2.5 w-full text-left group rounded px-1 -mx-1 py-0.5",
            hasExpandableData && "hover:bg-muted/30 cursor-pointer"
          )}
        >
          <span className="text-muted-foreground shrink-0 w-[70px]">
            {formatLogTimestamp(log.timestamp)}
          </span>
          <LogContextBadge context={log.context} />
          <span
            className={cn(
              "whitespace-pre-wrap break-words min-w-0 flex-1",
              log.level === "error" ? "text-destructive" : "text-foreground"
            )}
          >
            {log.message}
          </span>
          {hasExpandableData && (
            <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              <CopyButton
                value={log.data as string | object}
                size="icon"
                showLabel={false}
                className="size-4"
              />
            </div>
          )}
        </div>
      </CollapsibleTrigger>
      {hasExpandableData && (
        <CollapsibleContent className="pt-1 pb-0.5 pl-[86px]">
          <LogEntryData data={log.data} />
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}

function LogEntryData({ data }: { data: unknown }) {
  return (
    <div className="bg-muted rounded border p-3 overflow-auto max-h-[300px]">
      <JsonViewer data={data} alwaysExpanded className="text-xs" />
    </div>
  )
}

function LogContextBadge({ context }: { context: string }) {
  const colors: Record<string, string> = {
    tool: "bg-primary/20 text-primary",
    agent: "bg-secondary text-secondary-foreground",
    system: "bg-muted text-muted-foreground",
    result: "bg-primary/10 text-primary",
    error: "bg-destructive/20 text-destructive",
  }

  return (
    <span
      className={cn(
        "py-0.5 px-2 rounded text-xs font-medium shrink-0",
        colors[context] || "bg-muted text-muted-foreground"
      )}
    >
      {context}
    </span>
  )
}

function formatLogTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}
