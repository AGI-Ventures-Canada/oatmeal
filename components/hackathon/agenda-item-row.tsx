"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Pencil, Trash2, Clock, MapPin, Zap } from "lucide-react"

type AgendaItem = {
  id: string
  title: string
  description?: string | null
  starts_at: string
  ends_at: string | null
  location: string | null
  trigger_type: "challenge_release" | "submission_deadline" | null
}

type TriggerStatus = "scheduled" | "released" | "closed" | null

interface AgendaItemRowProps {
  item: AgendaItem
  status?: TriggerStatus
  actions?: React.ReactNode
  onEdit: () => void
  onDelete: () => void
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  scheduled: "secondary",
  released: "default",
  closed: "outline",
}

const statusLabel: Record<string, string> = {
  scheduled: "Scheduled",
  released: "Released",
  closed: "Closed",
}

export function AgendaItemRow({ item, status, actions, onEdit, onDelete }: AgendaItemRowProps) {
  const isTrigger = !!item.trigger_type

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${isTrigger ? "bg-muted/30 border-primary/20" : ""}`}>
      <div className="shrink-0 pt-0.5 text-muted-foreground">
        {isTrigger ? (
          <Zap className="size-4 text-primary" />
        ) : (
          <Clock className="size-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{item.title}</p>
          {status && (
            <Badge variant={statusVariant[status] ?? "secondary"} className="text-xs">
              {statusLabel[status] ?? status}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
          <span>{formatTime(item.starts_at)}{item.ends_at ? ` – ${formatTime(item.ends_at)}` : ""}</span>
          {item.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {item.location}
            </span>
          )}
        </div>
        {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {actions}
        <Button size="sm" variant="ghost" onClick={onEdit}>
          <Pencil className="size-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost">
              <Trash2 className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete agenda item?</AlertDialogTitle>
              <AlertDialogDescription>
                {isTrigger
                  ? `This will remove the ${item.trigger_type === "challenge_release" ? "challenge release" : "submission deadline"} automation. You can add it back later.`
                  : "This cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
