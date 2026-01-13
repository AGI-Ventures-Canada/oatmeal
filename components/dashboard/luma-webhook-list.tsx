"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  Calendar,
  MoreHorizontal,
  Trash2,
  Bot,
  Pencil,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react"
import type { LumaWebhookConfig } from "@/lib/db/agent-types"
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
import { EditLumaWebhookForm } from "@/components/dashboard/edit-luma-webhook-form"

interface LumaWebhookListProps {
  webhookConfigs: LumaWebhookConfig[]
  agentMap: Map<string, string>
}

const eventTypeLabels: Record<string, string> = {
  "event.created": "Event Created",
  "event.updated": "Event Updated",
  "guest.registered": "Guest Registered",
  "guest.updated": "Guest Updated",
  "ticket.registered": "Ticket Registered",
}

export function LumaWebhookList({ webhookConfigs, agentMap }: LumaWebhookListProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [regenerateId, setRegenerateId] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const [editConfig, setEditConfig] = useState<LumaWebhookConfig | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [newWebhookUrl, setNewWebhookUrl] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deleteId) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/dashboard/luma-webhooks/${deleteId}`, {
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

  const handleRegenerate = async () => {
    if (!regenerateId) return

    setRegenerating(true)
    try {
      const response = await fetch(
        `/api/dashboard/luma-webhooks/${regenerateId}/regenerate-token`,
        { method: "POST" }
      )
      if (response.ok) {
        const data = await response.json()
        setNewWebhookUrl(data.webhookUrl)
        router.refresh()
      }
    } finally {
      setRegenerating(false)
      setRegenerateId(null)
    }
  }

  const handleCopy = async (config: LumaWebhookConfig) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    const webhookUrl = `${baseUrl}/api/public/webhooks/luma/${config.webhook_token}`
    await navigator.clipboard.writeText(webhookUrl)
    setCopiedId(config.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (webhookConfigs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="size-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No Luma webhooks yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-1">
          Create a webhook to trigger agents from Luma calendar events
        </p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event Types</TableHead>
            <TableHead>Linked Agent</TableHead>
            <TableHead>Calendar</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {webhookConfigs.map((config) => (
            <TableRow key={config.id}>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {config.event_types.map((type) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {eventTypeLabels[type] ?? type}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                {config.agent_id ? (
                  <span className="flex items-center gap-1.5">
                    <Bot className="size-3.5" />
                    {agentMap.get(config.agent_id) ?? "Unknown"}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not linked</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {config.calendar_id ?? "All calendars"}
              </TableCell>
              <TableCell>
                {config.is_active ? (
                  <Badge variant="default">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
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
                    <DropdownMenuItem onClick={() => handleCopy(config)}>
                      {copiedId === config.id ? (
                        <Check className="size-4 mr-2 text-green-500" />
                      ) : (
                        <Copy className="size-4 mr-2" />
                      )}
                      Copy Webhook URL
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditConfig(config)}>
                      <Pencil className="size-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRegenerateId(config.id)}>
                      <RefreshCw className="size-4 mr-2" />
                      Regenerate Token
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteId(config.id)}
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
            <AlertDialogTitle>Delete Luma Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this webhook? Luma events will no
              longer trigger the agent.
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

      <AlertDialog
        open={!!regenerateId}
        onOpenChange={() => setRegenerateId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Webhook Token</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new webhook URL. The old URL will stop
              working immediately. You will need to update the webhook URL in
              Luma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={regenerating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerate} disabled={regenerating}>
              {regenerating ? "Regenerating..." : "Regenerate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!newWebhookUrl}
        onOpenChange={() => setNewWebhookUrl(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>New Webhook URL</AlertDialogTitle>
            <AlertDialogDescription>
              Copy this new URL and update it in your Luma webhook settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <code className="block text-sm bg-muted px-3 py-2 rounded font-mono break-all">
              {newWebhookUrl}
            </code>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={async () => {
                if (newWebhookUrl) {
                  await navigator.clipboard.writeText(newWebhookUrl)
                }
                setNewWebhookUrl(null)
              }}
            >
              Copy & Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={!!editConfig} onOpenChange={() => setEditConfig(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit Luma Webhook</SheetTitle>
            <SheetDescription>
              Configure which events trigger the agent
            </SheetDescription>
          </SheetHeader>
          {editConfig && (
            <EditLumaWebhookForm
              config={editConfig}
              onSuccess={() => {
                setEditConfig(null)
                router.refresh()
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
