/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import type { LumaWebhookConfig } from "@/lib/db/hackathon-types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { AgentSelector } from "@/components/dashboard/agent-selector"

const eventTypes = [
  { value: "event.created", label: "Event Created" },
  { value: "event.updated", label: "Event Updated" },
  { value: "guest.registered", label: "Guest Registered" },
  { value: "guest.updated", label: "Guest Updated" },
  { value: "ticket.registered", label: "Ticket Registered" },
]

interface EditLumaWebhookFormProps {
  config: LumaWebhookConfig
  onSuccess: () => void
}

export function EditLumaWebhookForm({
  config,
  onSuccess,
}: EditLumaWebhookFormProps) {
  const [loading, setLoading] = useState(false)
  const [selectedEvents, setSelectedEvents] = useState<string[]>(
    config.event_types
  )
  const [agentId, setAgentId] = useState<string | undefined>(
    config.agent_id ?? undefined
  )
  const [isActive, setIsActive] = useState(config.is_active)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedEvents.length === 0) return

    setLoading(true)
    try {
      const response = await fetch(`/api/dashboard/luma-webhooks/${config.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventTypes: selectedEvents,
          agentId: agentId ?? null,
          isActive,
        }),
      })

      if (response.ok) {
        onSuccess()
      }
    } finally {
      setLoading(false)
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
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      <div className="grid gap-2">
        <Label>Linked Agent</Label>
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
            <div key={event.value} className="flex items-center space-x-3">
              <Checkbox
                id={`edit-${event.value}`}
                checked={selectedEvents.includes(event.value)}
                onCheckedChange={() => toggleEvent(event.value)}
              />
              <label
                htmlFor={`edit-${event.value}`}
                className="text-sm cursor-pointer"
              >
                {event.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Active</Label>
          <p className="text-xs text-muted-foreground">
            When inactive, events will not trigger the agent
          </p>
        </div>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="submit"
          disabled={loading || selectedEvents.length === 0}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  )
}
