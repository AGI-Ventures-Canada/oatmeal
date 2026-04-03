"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

import type { AuditLog } from "@/lib/db/hackathon-types"
import type { Json } from "@/lib/db/types"

type Props = {
  initialLogs: AuditLog[]
  initialPage: number
  initialTotalPages: number
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
  return action.replaceAll(".", " ").replaceAll("_", " ")
}

function getActionVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action.includes("deleted") || action.includes("removed") || action.includes("revoked")) {
    return "destructive"
  }
  if (action.includes("created") || action.includes("added")) {
    return "default"
  }
  if (action.startsWith("admin.")) {
    return "outline"
  }
  return "secondary"
}

function formatMetadata(metadata: Json): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return ""
  const filtered = Object.entries(metadata).filter(
    ([k]) => !["is_admin_action", "admin_user_id", "admin_key_id"].includes(k)
  )
  if (filtered.length === 0) return ""
  return filtered
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: ${v.join(", ")}`
      if (typeof v === "object" && v !== null) return `${k}: ${JSON.stringify(v)}`
      return `${k}: ${String(v)}`
    })
    .join(" · ")
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

export function ActivityLog({
  initialLogs,
  initialPage,
  initialTotalPages,
  initialTotal,
  initialAction,
  initialResourceType,
}: Props) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs)
  const [page, setPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [total, setTotal] = useState(initialTotal)
  const [action, setAction] = useState(initialAction || "all")
  const [resourceType, setResourceType] = useState(initialResourceType || "all")
  const [loading, setLoading] = useState(false)
  const isInitialMount = useRef(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const fetchLogs = useCallback(async (p: number, a: string, rt: string) => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("limit", String(PAGE_SIZE))
    params.set("offset", String((p - 1) * PAGE_SIZE))
    if (a && a !== "all") params.set("action", a)
    if (rt && rt !== "all") params.set("resource_type", rt)

    const res = await fetch(`/api/admin/activity?${params}`)
    if (res.ok) {
      const data = await res.json()
      setLogs(data.logs)
      setTotal(data.total)
      setTotalPages(Math.ceil(data.total / PAGE_SIZE))
      setPage(p)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchLogs(1, action, resourceType)
    }, 150)
    return () => clearTimeout(debounceRef.current)
  }, [action, resourceType, fetchLogs])

  function goToPage(p: number) {
    fetchLogs(p, action, resourceType)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function handlePageClick(targetPage: number) {
    return (e: React.MouseEvent) => {
      e.preventDefault()
      goToPage(targetPage)
    }
  }

  function renderPageNumbers() {
    const pages: React.ReactNode[] = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <PaginationItem key={i}>
            <PaginationLink href="#" isActive={i === page} onClick={handlePageClick(i)}>
              {i}
            </PaginationLink>
          </PaginationItem>
        )
      }
    } else {
      pages.push(
        <PaginationItem key={1}>
          <PaginationLink href="#" isActive={1 === page} onClick={handlePageClick(1)}>1</PaginationLink>
        </PaginationItem>
      )
      if (page > 3) {
        pages.push(<PaginationItem key="start-ellipsis"><PaginationEllipsis /></PaginationItem>)
      }
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(
          <PaginationItem key={i}>
            <PaginationLink href="#" isActive={i === page} onClick={handlePageClick(i)}>
              {i}
            </PaginationLink>
          </PaginationItem>
        )
      }
      if (page < totalPages - 2) {
        pages.push(<PaginationItem key="end-ellipsis"><PaginationEllipsis /></PaginationItem>)
      }
      pages.push(
        <PaginationItem key={totalPages}>
          <PaginationLink href="#" isActive={totalPages === page} onClick={handlePageClick(totalPages)}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      )
    }
    return pages
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Activity Log</h1>
        <p className="text-sm text-muted-foreground">
          {total} events{loading && <Loader2 className="ml-2 inline size-3 animate-spin" />}
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

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead className="hidden sm:table-cell">Actor</TableHead>
              <TableHead className="hidden md:table-cell">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  <span title={new Date(log.created_at).toLocaleString()}>
                    {formatRelativeTime(log.created_at)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={getActionVariant(log.action)}>
                    {formatAction(log.action)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  <span className="text-muted-foreground">{log.resource_type}</span>
                  {log.resource_id && (
                    <p className="truncate text-xs text-muted-foreground/60" title={log.resource_id}>
                      {log.resource_id.slice(0, 8)}...
                    </p>
                  )}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                  <span className="truncate" title={log.actor_id}>
                    {log.actor_type === "api_key" ? "API Key" : "User"}
                  </span>
                  {isAdminAction(log.metadata) && (
                    <Badge variant="outline" className="ml-1 text-[10px]">admin</Badge>
                  )}
                </TableCell>
                <TableCell className="hidden max-w-xs truncate text-xs text-muted-foreground md:table-cell">
                  {formatMetadata(log.metadata)}
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {action !== "all" || resourceType !== "all"
                    ? "No activity matches your filters."
                    : "No activity recorded yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => { e.preventDefault(); if (page > 1) goToPage(page - 1) }}
                className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {renderPageNumbers()}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => { e.preventDefault(); if (page < totalPages) goToPage(page + 1) }}
                className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
