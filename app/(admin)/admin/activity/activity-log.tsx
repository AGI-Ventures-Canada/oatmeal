"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { ChevronDown, ChevronRight, Loader2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

type Props = {
  initialLogs: AuditLog[]
  initialTotal: number
  initialAction: string
  initialResourceType: string
}

const RESOURCE_TYPES = [
  { value: "all", label: "All resources" },
  { value: "hackathon", label: "Hackathon" },
  { value: "api_key", label: "API Key" },
  { value: "agent", label: "Agent" },
  { value: "agent_run", label: "Agent Run" },
  { value: "job", label: "Job" },
  { value: "skill", label: "Skill" },
  { value: "webhook", label: "Webhook" },
  { value: "schedule", label: "Schedule" },
  { value: "integration", label: "Integration" },
  { value: "email_address", label: "Email Address" },
  { value: "credential", label: "Credential" },
  { value: "sponsor", label: "Sponsor" },
  { value: "org_profile", label: "Org Profile" },
  { value: "logo", label: "Logo" },
  { value: "team_invitation", label: "Team Invitation" },
  { value: "judging_criteria", label: "Judging Criteria" },
  { value: "judge", label: "Judge" },
  { value: "judge_invitation", label: "Judge Invitation" },
  { value: "judging", label: "Judging" },
  { value: "judge_display", label: "Judge Display" },
  { value: "prize", label: "Prize" },
  { value: "results", label: "Results" },
  { value: "cli_auth", label: "CLI Auth" },
]

const ACTION_CATEGORIES = [
  { value: "all", label: "All actions" },
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "deleted", label: "Deleted" },
  { value: "admin", label: "Admin actions" },
]

const PAGE_SIZE = 50

function formatAction(action: string): string {
  const parts = action.split(".")
  const verb = parts[parts.length - 1]
  return verb.replaceAll("_", " ")
}

function formatActionFull(action: string): string {
  return action.replaceAll(".", " > ").replaceAll("_", " ")
}

function getActionVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action.includes("deleted") || action.includes("removed") || action.includes("revoked") || action.includes("cancelled")) {
    return "destructive"
  }
  if (action.includes("created") || action.includes("added") || action.includes("published")) {
    return "default"
  }
  if (action.startsWith("admin.")) {
    return "outline"
  }
  return "secondary"
}

function formatResourceType(rt: string): string {
  return rt.replaceAll("_", " ")
}

function getMetadataEntries(metadata: Json): [string, string][] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return []
  return Object.entries(metadata)
    .filter(([k]) => !["is_admin_action", "admin_user_id", "admin_key_id"].includes(k))
    .map(([k, v]) => {
      const label = k.replaceAll("_", " ")
      if (Array.isArray(v)) return [label, v.join(", ")] as [string, string]
      if (typeof v === "object" && v !== null) return [label, JSON.stringify(v, null, 2)] as [string, string]
      return [label, String(v)] as [string, string]
    })
}

function isAdminAction(metadata: Json): boolean {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    !Array.isArray(metadata) &&
    metadata.is_admin_action === true
  )
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

function LogEntry({
  log,
  onFilterResource,
  onFilterAction,
}: {
  log: AuditLog
  onFilterResource: (rt: string) => void
  onFilterAction: (action: string) => void
}) {
  const metadataEntries = getMetadataEntries(log.metadata)
  const hasDetails = metadataEntries.length > 0 || log.resource_id

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
              <Badge
                variant={getActionVariant(log.action)}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  const parts = log.action.split(".")
                  const verb = parts[parts.length - 1]
                  for (const cat of ACTION_CATEGORIES) {
                    if (cat.value !== "all" && verb.includes(cat.value)) {
                      onFilterAction(cat.value)
                      return
                    }
                  }
                }}
              >
                {formatAction(log.action)}
              </Badge>
              <span
                role="button"
                tabIndex={0}
                className="rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  onFilterResource(log.resource_type)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation()
                    onFilterResource(log.resource_type)
                  }
                }}
              >
                {formatResourceType(log.resource_type)}
              </span>
              {isAdminAction(log.metadata) && (
                <Badge variant="outline" className="text-[10px]">admin</Badge>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span title={new Date(log.created_at).toLocaleString()}>
                {formatRelativeTime(log.created_at)}
              </span>
              <span>{log.actor_type === "api_key" ? "via API key" : "by user"}</span>
            </div>
          </div>
        </div>
      </CollapsibleTrigger>

      {hasDetails && (
        <CollapsibleContent>
          <div className="ml-10 space-y-2 border-l-2 border-muted pb-3 pl-4 text-sm">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-muted-foreground">Action</span>
                <span className="text-xs">{formatActionFull(log.action)}</span>
              </div>
              {log.resource_id && (
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Resource ID</span>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{log.resource_id}</code>
                </div>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-muted-foreground">Tenant ID</span>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{log.tenant_id}</code>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-muted-foreground">Actor</span>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{log.actor_id}</code>
                <span className="text-xs text-muted-foreground">({log.actor_type})</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-muted-foreground">Timestamp</span>
                <span className="text-xs">{new Date(log.created_at).toLocaleString()}</span>
              </div>
            </div>

            {metadataEntries.length > 0 && (
              <div className="space-y-1.5 border-t border-muted pt-2">
                <span className="text-xs font-medium text-muted-foreground">Metadata</span>
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

export function ActivityLog({
  initialLogs,
  initialTotal,
  initialAction,
  initialResourceType,
}: Props) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs)
  const [total, setTotal] = useState(initialTotal)
  const [action, setAction] = useState(initialAction || "all")
  const [resourceType, setResourceType] = useState(initialResourceType || "all")
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const hasMore = logs.length < total

  const buildParams = useCallback((offset: number, a: string, rt: string) => {
    const params = new URLSearchParams()
    params.set("limit", String(PAGE_SIZE))
    params.set("offset", String(offset))
    if (a && a !== "all") params.set("action", a)
    if (rt && rt !== "all") params.set("resource_type", rt)
    return params
  }, [])

  const fetchFresh = useCallback(async (a: string, rt: string) => {
    setLoading(true)
    setError(null)
    const params = buildParams(0, a, rt)
    const res = await fetch(`/api/admin/activity?${params}`)
    if (res.ok) {
      const data = await res.json()
      setLogs(data.logs)
      setTotal(data.total)
    } else {
      setError(`Failed to load activity (${res.status})`)
    }
    setLoading(false)
  }, [buildParams])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const params = buildParams(logs.length, action, resourceType)
    const res = await fetch(`/api/admin/activity?${params}`)
    if (res.ok) {
      const data = await res.json()
      setLogs((prev) => [...prev, ...data.logs])
      setTotal(data.total)
    } else {
      setError(`Failed to load more activity (${res.status})`)
    }
    setLoadingMore(false)
  }, [loadingMore, hasMore, logs.length, action, resourceType, buildParams])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchFresh(action, resourceType)
    }, 150)
    return () => clearTimeout(debounceRef.current)
  }, [action, resourceType, fetchFresh])

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

  const hasActiveFilters = action !== "all" || resourceType !== "all"

  const groups = groupByDate(logs)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Activity Log</h1>
        <p className="text-sm text-muted-foreground">
          {total} events
          {loading && <Loader2 className="ml-2 inline size-3 animate-spin" />}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={resourceType} onValueChange={setResourceType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All resources" />
          </SelectTrigger>
          <SelectContent>
            {RESOURCE_TYPES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_CATEGORIES.map((a) => (
              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtered by:</span>
          {resourceType !== "all" && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {RESOURCE_TYPES.find((r) => r.value === resourceType)?.label}
              <button
                type="button"
                onClick={() => setResourceType("all")}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {action !== "all" && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {ACTION_CATEGORIES.find((a) => a.value === action)?.label}
              <button
                type="button"
                onClick={() => setAction("all")}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          <button
            type="button"
            onClick={() => { setAction("all"); setResourceType("all") }}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {hasActiveFilters
            ? "No activity matches your filters."
            : "No activity recorded yet."}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.heading}>
              <div className="sticky top-0 z-10 border-b bg-background/95 px-1 py-2 backdrop-blur-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.heading}
                </h2>
              </div>
              <div className="divide-y divide-muted/50">
                {group.logs.map((log) => (
                  <LogEntry
                    key={log.id}
                    log={log}
                    onFilterResource={setResourceType}
                    onFilterAction={setAction}
                  />
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
    </div>
  )
}
