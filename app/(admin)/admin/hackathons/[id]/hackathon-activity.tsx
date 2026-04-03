"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { ChevronDown, ChevronRight, Loader2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { AuditLog } from "@/lib/db/hackathon-types"
import type { Json } from "@/lib/db/types"

const ACTION_CATEGORIES = [
  { value: "all", label: "All actions" },
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "deleted", label: "Deleted" },
]

const PAGE_SIZE = 50

function formatAction(action: string): string {
  return action.replaceAll(".", " > ").replaceAll("_", " ")
}

function formatActionShort(action: string): string {
  const parts = action.split(".")
  const verb = parts[parts.length - 1]
  return verb.replaceAll("_", " ")
}

function getActionVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action.includes("deleted") || action.includes("removed") || action.includes("revoked") || action.includes("cancelled")) {
    return "destructive"
  }
  if (action.includes("created") || action.includes("added") || action.includes("published")) {
    return "default"
  }
  return "secondary"
}

function getMetadataEntries(metadata: Json): [string, string][] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return []
  return Object.entries(metadata)
    .filter(([k]) => !["is_admin_action", "admin_user_id", "admin_key_id", "hackathonId"].includes(k))
    .map(([k, v]) => {
      const label = k.replaceAll("_", " ")
      if (Array.isArray(v)) return [label, v.join(", ")] as [string, string]
      if (typeof v === "object" && v !== null) return [label, JSON.stringify(v, null, 2)] as [string, string]
      return [label, String(v)] as [string, string]
    })
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function getDateHeading(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const logDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((today.getTime() - logDay.getTime()) / 86400000)

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: "long" })
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
}

function groupByDate(logs: AuditLog[]): { heading: string; logs: AuditLog[] }[] {
  const groups: { heading: string; logs: AuditLog[] }[] = []
  let currentHeading = ""

  for (const log of logs) {
    const heading = getDateHeading(log.created_at)
    if (heading !== currentHeading) {
      currentHeading = heading
      groups.push({ heading, logs: [] })
    }
    groups[groups.length - 1].logs.push(log)
  }

  return groups
}

function EventLogEntry({ log }: { log: AuditLog }) {
  const metadataEntries = getMetadataEntries(log.metadata)
  const hasDetails = metadataEntries.length > 0

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          className="group flex w-full cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
        >
          <div className="mt-0.5 text-muted-foreground/40">
            {hasDetails ? (
              <>
                <ChevronRight className="size-4 group-data-[state=open]:hidden" />
                <ChevronDown className="hidden size-4 group-data-[state=open]:block" />
              </>
            ) : (
              <div className="size-4" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getActionVariant(log.action)}>
                {formatActionShort(log.action)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {log.resource_type.replaceAll("_", " ")}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              <span title={new Date(log.created_at).toLocaleString()}>
                {formatRelativeTime(log.created_at)}
              </span>
              <span className="ml-3">{log.actor_type === "api_key" ? "via API key" : "by user"}</span>
            </div>
          </div>
        </div>
      </CollapsibleTrigger>

      {hasDetails && (
        <CollapsibleContent>
          <div className="ml-10 space-y-2 border-l-2 border-muted pb-3 pl-4 text-sm">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-muted-foreground">Action</span>
              <span className="text-xs">{formatAction(log.action)}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-muted-foreground">Timestamp</span>
              <span className="text-xs">{new Date(log.created_at).toLocaleString()}</span>
            </div>
            {metadataEntries.length > 0 && (
              <div className="space-y-1.5 border-t border-muted pt-2">
                <span className="text-xs font-medium text-muted-foreground">Details</span>
                {metadataEntries.map(([label, value]) => (
                  <div key={label} className="flex items-baseline gap-2">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    {value.includes("\n") ? (
                      <pre className="rounded bg-muted px-2 py-1 text-xs">{value}</pre>
                    ) : (
                      <span className="text-xs">{value}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}

export function AdminHackathonActivity({ hackathonId }: { hackathonId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [action, setAction] = useState("all")
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const hasMore = logs.length < total

  const buildParams = useCallback((offset: number, a: string) => {
    const params = new URLSearchParams()
    params.set("limit", String(PAGE_SIZE))
    params.set("offset", String(offset))
    params.set("hackathon_id", hackathonId)
    if (a && a !== "all") params.set("action", a)
    return params
  }, [hackathonId])

  const fetchFresh = useCallback(async (a: string, showSpinner = true) => {
    if (showSpinner) setLoading(true)
    const params = buildParams(0, a)
    const res = await fetch(`/api/admin/activity?${params}`)
    if (res.ok) {
      const data = await res.json()
      setLogs(data.logs)
      setTotal(data.total)
    }
    if (showSpinner) setLoading(false)
  }, [buildParams])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const params = buildParams(logs.length, action)
    const res = await fetch(`/api/admin/activity?${params}`)
    if (res.ok) {
      const data = await res.json()
      setLogs((prev) => [...prev, ...data.logs])
      setTotal(data.total)
    }
    setLoadingMore(false)
  }, [loadingMore, hasMore, logs.length, action, buildParams])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchFresh(action)
    }, isInitialMount.current ? 0 : 150)
    if (isInitialMount.current) isInitialMount.current = false
    return () => clearTimeout(debounceRef.current)
  }, [action, fetchFresh])

  useEffect(() => {
    const interval = setInterval(() => {
      fetchFresh(action, false)
    }, 15000)
    return () => clearInterval(interval)
  }, [action, fetchFresh])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  const groups = groupByDate(logs)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Activity Log</CardTitle>
            <p className="text-sm text-muted-foreground">
              {total} events
              {loading && <Loader2 className="ml-2 inline size-3 animate-spin" />}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_CATEGORIES.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {action !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAction("all")}
                className="h-8 px-2"
              >
                <X className="size-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {action !== "all"
              ? "No activity matches your filter."
              : "No activity recorded for this event yet."}
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.heading}>
                <div className="sticky top-0 z-10 border-b bg-background/95 px-1 py-2 backdrop-blur-sm">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.heading}
                  </h3>
                </div>
                <div className="divide-y divide-muted/50">
                  {group.logs.map((log) => (
                    <EventLogEntry key={log.id} log={log} />
                  ))}
                </div>
              </div>
            ))}

            <div ref={sentinelRef} className="py-2">
              {loadingMore && (
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading more...
                </div>
              )}
              {hasMore && !loadingMore && (
                <div className="flex justify-center">
                  <Button variant="ghost" size="sm" onClick={loadMore}>
                    Load more ({total - logs.length} remaining)
                  </Button>
                </div>
              )}
              {!hasMore && logs.length > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  All {total} events loaded
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
