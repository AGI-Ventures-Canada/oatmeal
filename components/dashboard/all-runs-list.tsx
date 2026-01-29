/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client"

import Link from "next/link"
import { PlayCircle } from "lucide-react"
import type { AgentRunWithAgent } from "@/lib/services/agent-runs"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface AllRunsListProps {
  runs: AgentRunWithAgent[]
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

function formatDate(date: string): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const hours = String(d.getHours()).padStart(2, "0")
  const minutes = String(d.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

export function AllRunsList({ runs }: AllRunsListProps) {
  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <PlayCircle className="size-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No runs yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-1">
          Run an agent to see execution history
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Run ID</TableHead>
          <TableHead>Agent</TableHead>
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
              {run.agent ? (
                <Link
                  href={`/agents/${run.agent.id}`}
                  className="hover:underline"
                >
                  {run.agent.name}
                </Link>
              ) : (
                <span className="text-muted-foreground">Unknown</span>
              )}
            </TableCell>
            <TableCell>
              <Badge variant={statusVariants[run.status] || "outline"}>
                {statusLabels[run.status] || run.status}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {run.trigger_type || "manual"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {run.started_at && formatDuration(run.started_at, run.completed_at)}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(run.started_at ?? run.created_at)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
