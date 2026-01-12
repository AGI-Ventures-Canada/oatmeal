"use client"

import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { JobStatusBadge } from "./job-status-badge"
import type { JobListItem } from "@/lib/types/dashboard"
import { formatDateTime } from "@/lib/utils/format"

type Props = {
  jobs: JobListItem[]
}

export function JobList({ jobs }: Props) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No jobs yet. Submit a job via the API to get started.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Completed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell>
              <Link
                href={`/jobs/${job.id}`}
                className="font-mono hover:underline"
              >
                {job.id.slice(0, 8)}...
              </Link>
            </TableCell>
            <TableCell>{job.type}</TableCell>
            <TableCell>
              <JobStatusBadge status={job.status} />
            </TableCell>
            <TableCell>{formatDateTime(job.createdAt)}</TableCell>
            <TableCell>
              {job.completedAt ? formatDateTime(job.completedAt) : "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
