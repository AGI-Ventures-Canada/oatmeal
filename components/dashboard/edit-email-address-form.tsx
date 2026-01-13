"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import type { EmailAddress } from "@/lib/db/agent-types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { AgentSelector } from "@/components/dashboard/agent-selector"

interface EditEmailAddressFormProps {
  emailAddress: EmailAddress
  onSuccess: () => void
}

export function EditEmailAddressForm({
  emailAddress,
  onSuccess,
}: EditEmailAddressFormProps) {
  const [loading, setLoading] = useState(false)
  const [agentId, setAgentId] = useState<string | undefined>(
    emailAddress.agent_id ?? undefined
  )
  const [isActive, setIsActive] = useState(emailAddress.is_active)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    try {
      const response = await fetch(
        `/api/dashboard/email-addresses/${emailAddress.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: agentId ?? null,
            isActive,
          }),
        }
      )

      if (response.ok) {
        onSuccess()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      <div className="space-y-2">
        <Label>Email Address</Label>
        <code className="block text-sm bg-muted px-3 py-2 rounded font-mono">
          {emailAddress.address}
        </code>
      </div>

      <div className="grid gap-2">
        <Label>Linked Agent</Label>
        <AgentSelector
          value={agentId}
          onValueChange={setAgentId}
          placeholder="Select an agent to trigger..."
        />
        <p className="text-xs text-muted-foreground">
          Emails to this address will trigger the selected agent
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Active</Label>
          <p className="text-xs text-muted-foreground">
            When inactive, emails will not trigger the agent
          </p>
        </div>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={loading}>
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
