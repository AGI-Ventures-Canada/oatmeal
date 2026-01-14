"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2, Copy, Check } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { AgentSelector } from "@/components/dashboard/agent-selector"

export function CreateEmailAddressButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agentId, setAgentId] = useState<string | undefined>()
  const [createdAddress, setCreatedAddress] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (loading) return

    setLoading(true)
    try {
      const response = await fetch("/api/dashboard/email-addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCreatedAddress(data.address)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen && createdAddress) {
      setAgentId(undefined)
      setCreatedAddress(null)
      setCopied(false)
      router.refresh()
    }
  }

  const handleCopy = async () => {
    if (createdAddress) {
      await navigator.clipboard.writeText(createdAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4 mr-2" />
          Create Email Address
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        {createdAddress ? (
          <>
            <DialogHeader>
              <DialogTitle>Email Address Created</DialogTitle>
              <DialogDescription>
                Your new inbound email address is ready to use
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-muted px-3 py-2 rounded font-mono">
                    {createdAddress}
                  </code>
                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    {copied ? (
                      <Check className="size-4 text-green-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Emails sent to this address will trigger the linked agent
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form
            onSubmit={handleSubmit}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault()
                handleSubmit()
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Create Email Address</DialogTitle>
              <DialogDescription>
                Create an inbound email address that triggers an agent
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Link to Agent (optional)</Label>
                <AgentSelector
                  value={agentId}
                  onValueChange={setAgentId}
                  placeholder="Select an agent to trigger..."
                />
                <p className="text-xs text-muted-foreground">
                  You can link an agent now or configure it later
                </p>
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
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Email Address"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
