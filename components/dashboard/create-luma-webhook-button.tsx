"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2, Copy, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AgentSelector } from "@/components/dashboard/agent-selector"

const eventTypes = [
  { value: "event.created", label: "Event Created", description: "When a new Luma event is created" },
  { value: "event.updated", label: "Event Updated", description: "When an event is modified" },
  { value: "guest.registered", label: "Guest Registered", description: "When someone registers for an event" },
  { value: "guest.updated", label: "Guest Updated", description: "When a guest's registration is updated" },
  { value: "ticket.registered", label: "Ticket Registered", description: "When a ticket is purchased" },
]

export function CreateLumaWebhookButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [calendarId, setCalendarId] = useState("")
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [agentId, setAgentId] = useState<string | undefined>()
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (selectedEvents.length === 0 || loading) return

    setLoading(true)
    try {
      const response = await fetch("/api/dashboard/luma-webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarId: calendarId.trim() || undefined,
          eventTypes: selectedEvents,
          agentId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setWebhookUrl(data.webhookUrl)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen && webhookUrl) {
      setCalendarId("")
      setSelectedEvents([])
      setAgentId(undefined)
      setWebhookUrl(null)
      setCopied(false)
      router.refresh()
    }
  }

  const handleCopy = async () => {
    if (webhookUrl) {
      await navigator.clipboard.writeText(webhookUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4 mr-2" />
          Create Luma Webhook
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        {webhookUrl ? (
          <>
            <DialogHeader>
              <DialogTitle>Luma Webhook Created</DialogTitle>
              <DialogDescription>
                Copy this URL to your Luma webhook settings
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Alert>
                <AlertCircle className="size-4" />
                <AlertTitle>Configure in Luma</AlertTitle>
                <AlertDescription>
                  Add this webhook URL in your Luma calendar&apos;s webhook settings
                  to start receiving events.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-muted px-3 py-2 rounded font-mono break-all">
                    {webhookUrl}
                  </code>
                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    {copied ? (
                      <Check className="size-4 text-green-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form
            onSubmit={handleSubmit}
            autoComplete="off"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault()
                handleSubmit()
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Create Luma Webhook</DialogTitle>
              <DialogDescription>
                Configure a webhook to receive Luma calendar events
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="calendar">Calendar ID (optional)</Label>
                <Input
                  id="calendar"
                  placeholder="Leave empty for all calendars"
                  value={calendarId}
                  onChange={(e) => setCalendarId(e.target.value)}
                  autoComplete="off"
                  data-form-type="other"
                />
              </div>

              <div className="grid gap-2">
                <Label>Link to Agent (optional)</Label>
                <AgentSelector
                  value={agentId}
                  onValueChange={setAgentId}
                  placeholder="Select an agent to trigger..."
                />
              </div>

              <div className="grid gap-2">
                <Label>Event Types</Label>
                <div className="space-y-3">
                  {eventTypes.map((event) => (
                    <div
                      key={event.value}
                      className="flex items-start space-x-3"
                    >
                      <Checkbox
                        id={event.value}
                        checked={selectedEvents.includes(event.value)}
                        onCheckedChange={() => toggleEvent(event.value)}
                      />
                      <div className="grid gap-0.5 leading-none">
                        <label
                          htmlFor={event.value}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {event.label}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || selectedEvents.length === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Webhook"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
