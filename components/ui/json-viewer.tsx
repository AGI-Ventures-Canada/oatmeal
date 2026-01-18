"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface JsonViewerProps {
  data: unknown
  defaultExpanded?: boolean
  alwaysExpanded?: boolean
  className?: string
}

interface JsonNodeProps {
  name?: string
  value: unknown
  defaultExpanded?: boolean
  alwaysExpanded?: boolean
  depth?: number
}

function JsonNode({ name, value, defaultExpanded = false, alwaysExpanded = false, depth = 0 }: JsonNodeProps) {
  const [expanded, setExpanded] = useState(alwaysExpanded || defaultExpanded || depth < 2)

  const isObject = value !== null && typeof value === "object"
  const isArray = Array.isArray(value)
  const isEmpty = isObject && Object.keys(value as object).length === 0

  const getValueColor = (val: unknown) => {
    if (val === null) return "text-muted-foreground"
    if (typeof val === "string") return "text-primary"
    if (typeof val === "number") return "text-foreground"
    if (typeof val === "boolean") return "text-muted-foreground italic"
    return "text-foreground"
  }

  const formatValue = (val: unknown): string => {
    if (val === null) return "null"
    if (typeof val === "string") return `"${val}"`
    if (typeof val === "boolean") return val ? "true" : "false"
    return String(val)
  }

  if (!isObject) {
    return (
      <div className="flex items-start gap-1 py-0.5">
        {name !== undefined && (
          <>
            <span className="text-muted-foreground shrink-0">&quot;{name}&quot;</span>
            <span className="text-muted-foreground shrink-0">:</span>
          </>
        )}
        <span className={cn(getValueColor(value), "break-all")}>{formatValue(value)}</span>
      </div>
    )
  }

  const entries = Object.entries(value as object)
  const bracketOpen = isArray ? "[" : "{"
  const bracketClose = isArray ? "]" : "}"
  const preview = isArray ? `Array(${entries.length})` : `Object(${entries.length})`

  const isInteractive = !alwaysExpanded && !isEmpty

  return (
    <div className="py-0.5">
      <div
        className={cn(
          "flex items-center gap-1 rounded -ml-5 pl-5",
          isInteractive && "cursor-pointer hover:bg-muted/50"
        )}
        onClick={() => isInteractive && setExpanded(!expanded)}
      >
        {!isEmpty && !alwaysExpanded && (
          <span className="shrink-0 -ml-4 w-4">
            {expanded ? (
              <ChevronDown className="size-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3 text-muted-foreground" />
            )}
          </span>
        )}
        {name !== undefined && (
          <>
            <span className="text-muted-foreground shrink-0">&quot;{name}&quot;</span>
            <span className="text-muted-foreground shrink-0">:</span>
          </>
        )}
        {isEmpty ? (
          <span className="text-muted-foreground">{bracketOpen}{bracketClose}</span>
        ) : expanded ? (
          <span className="text-muted-foreground">{bracketOpen}</span>
        ) : (
          <span className="text-muted-foreground">
            {bracketOpen} <span className="text-xs opacity-60">{preview}</span> {bracketClose}
          </span>
        )}
      </div>
      {expanded && !isEmpty && (
        <>
          <div className={cn("pl-4 ml-1", !alwaysExpanded && "border-l border-muted")}>
            {entries.map(([key, val]) => (
              <JsonNode
                key={key}
                name={isArray ? undefined : key}
                value={val}
                defaultExpanded={defaultExpanded}
                alwaysExpanded={alwaysExpanded}
                depth={depth + 1}
              />
            ))}
          </div>
          <div className="text-muted-foreground">{bracketClose}</div>
        </>
      )}
    </div>
  )
}

export function JsonViewer({ data, defaultExpanded = false, alwaysExpanded = false, className }: JsonViewerProps) {
  if (data === undefined || data === null) {
    return <span className="text-muted-foreground">null</span>
  }

  return (
    <div className={cn("font-mono text-sm pl-5 overflow-auto", className)}>
      <JsonNode value={data} defaultExpanded={defaultExpanded} alwaysExpanded={alwaysExpanded} />
    </div>
  )
}
