"use client"

import Link from "next/link"
import { PlayCircle, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import type { AgentRun } from "@/lib/db/agent-types"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface AgentRunListProps {
  runs: AgentRun[]
}

const statusIcons: Record<string, React.ReactNode> = {
  queued: <Clock className="size-4 text-muted-foreground" />,
  initializing: <Loader2 className="size-4 text-blue-500 animate-spin" />,
  running: <Loader2 className="size-4 text-blue-500 animate-spin" />,
  awaiting_input: <Clock className="size-4 text-yellow-500" />,
  succeeded: <CheckCircle2 className="size-4 text-green-500" />,
  failed: <XCircle className="size-4 text-red-500" />,
  canceled: <XCircle className="size-4 text-muted-foreground" />,
  timed_out: <XCircle className="size-4 text-orange-500" />,
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

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  queued: "outline",
  initializing: "secondary",
  running: "secondary",
  awaiting_input: "outline",
  succeeded: "default",
  failed: "destructive",
  canceled: "secondary",
  timed_out: "destructive",
}

function formatDuration(start: string, end?: string | null): string {
  const startDate = new Date(start)
  const endDate = end ? new Date(end) : new Date()
  const durationMs = endDate.getTime() - startDate.getTime()

  if (durationMs < 1000) return `${durationMs}ms`
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`
  return `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`
}

export function AgentRunList({ runs }: AgentRunListProps) {
  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <PlayCircle className="size-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No runs yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-1">
          Run this agent to see execution history
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Run ID</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Trigger</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Started</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id}>
            <TableCell>
              <Link
                href={`/runs/${run.id}`}
                className="font-mono text-sm hover:underline"
              >
                {run.id.slice(0, 8)}
              </Link>
            </TableCell>
            <TableCell>
              <Badge variant={statusVariants[run.status] || "outline"}>
                <span className="flex items-center gap-1.5">
                  {statusIcons[run.status]}
                  {statusLabels[run.status] || run.status}
                </span>
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {run.trigger_type || "manual"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {run.started_at && formatDuration(run.started_at, run.completed_at)}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {run.started_at
                ? new Date(run.started_at).toLocaleString()
                : new Date(run.created_at).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
