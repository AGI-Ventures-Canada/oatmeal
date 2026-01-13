"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  Clock,
  MoreHorizontal,
  Pencil,
  Trash2,
  Play,
  Pause,
  Bot,
} from "lucide-react"
import type { Schedule } from "@/lib/db/agent-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { EditScheduleForm } from "@/components/dashboard/edit-schedule-form"

interface ScheduleListProps {
  schedules: Schedule[]
  agentMap: Map<string, string>
}

const frequencyLabels: Record<string, string> = {
  once: "Once",
  hourly: "Hourly",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  cron: "Custom (Cron)",
}

export function ScheduleList({ schedules, agentMap }: ScheduleListProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editSchedule, setEditSchedule] = useState<Schedule | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deleteId) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/dashboard/schedules/${deleteId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        router.refresh()
      }
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const handleToggle = async (schedule: Schedule) => {
    setToggling(schedule.id)
    try {
      const response = await fetch(`/api/dashboard/schedules/${schedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !schedule.is_active }),
      })
      if (response.ok) {
        router.refresh()
      }
    } finally {
      setToggling(null)
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return "—"
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    const hours = String(d.getHours()).padStart(2, "0")
    const minutes = String(d.getMinutes()).padStart(2, "0")
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }

  if (schedules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="size-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No schedules yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-1">
          Create a schedule to run your agents automatically
        </p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Next Run</TableHead>
            <TableHead>Last Run</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.map((schedule) => (
            <TableRow key={schedule.id}>
              <TableCell>
                <div className="font-medium">{schedule.name}</div>
                {schedule.cron_expression && (
                  <code className="text-xs text-muted-foreground">
                    {schedule.cron_expression}
                  </code>
                )}
              </TableCell>
              <TableCell>
                {schedule.agent_id ? (
                  <span className="flex items-center gap-1.5">
                    <Bot className="size-3.5" />
                    {agentMap.get(schedule.agent_id) ?? "Unknown"}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {schedule.job_type ?? "—"}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {frequencyLabels[schedule.frequency] ?? schedule.frequency}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(schedule.next_run_at)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(schedule.last_run_at)}
              </TableCell>
              <TableCell>
                {schedule.is_active ? (
                  <Badge variant="default">Active</Badge>
                ) : (
                  <Badge variant="secondary">Paused</Badge>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditSchedule(schedule)}>
                      <Pencil className="size-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleToggle(schedule)}
                      disabled={toggling === schedule.id}
                    >
                      {schedule.is_active ? (
                        <>
                          <Pause className="size-4 mr-2" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="size-4 mr-2" />
                          Resume
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteId(schedule.id)}
                    >
                      <Trash2 className="size-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this schedule? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={!!editSchedule} onOpenChange={() => setEditSchedule(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit Schedule</SheetTitle>
            <SheetDescription>
              Update the schedule configuration
            </SheetDescription>
          </SheetHeader>
          {editSchedule && (
            <EditScheduleForm
              schedule={editSchedule}
              onSuccess={() => {
                setEditSchedule(null)
                router.refresh()
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
