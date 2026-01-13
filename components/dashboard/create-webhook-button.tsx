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

const eventTypes = [
  { value: "agent_run.started", label: "Run Started", description: "When an agent run begins" },
  { value: "agent_run.completed", label: "Run Completed", description: "When an agent run finishes successfully" },
  { value: "agent_run.failed", label: "Run Failed", description: "When an agent run fails" },
  { value: "agent_run.step_completed", label: "Step Completed", description: "When an agent completes a step" },
]

export function CreateWebhookButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState("")
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [secret, setSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim() || selectedEvents.length === 0) return

    setLoading(true)
    try {
      const response = await fetch("/api/dashboard/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          events: selectedEvents,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSecret(data.secret)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen && secret) {
      setUrl("")
      setSelectedEvents([])
      setSecret(null)
      setCopied(false)
      router.refresh()
    }
  }

  const handleCopySecret = async () => {
    if (secret) {
      await navigator.clipboard.writeText(secret)
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
          Create Webhook
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        {secret ? (
          <>
            <DialogHeader>
              <DialogTitle>Webhook Created</DialogTitle>
              <DialogDescription>
                Save your webhook secret - it will only be shown once
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Alert>
                <AlertCircle className="size-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Copy this secret now. You won&apos;t be able to see it again.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Webhook Secret</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-muted px-3 py-2 rounded font-mono break-all">
                    {secret}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopySecret}
                  >
                    {copied ? (
                      <Check className="size-4 text-green-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use this secret to verify webhook signatures. The signature is
                  sent in the X-Webhook-Signature header.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} autoComplete="off">
            <DialogHeader>
              <DialogTitle>Create New Webhook</DialogTitle>
              <DialogDescription>
                Configure an HTTP endpoint to receive event notifications
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="url">Endpoint URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://your-server.com/webhook"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  autoComplete="off"
                  data-form-type="other"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label>Events</Label>
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
                disabled={loading || !url.trim() || selectedEvents.length === 0}
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
