/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2 } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const models = [
  { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  { value: "claude-opus-4-5-20251101", label: "Claude Opus 4.5" },
]

const agentTypes = [
  { value: "ai_sdk", label: "AI SDK", description: "Standard agentic loop" },
  { value: "claude_sdk", label: "Claude SDK", description: "Sandbox execution" },
]

export function CreateAgentButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [model, setModel] = useState("claude-sonnet-4-5-20250929")
  const [type, setType] = useState("ai_sdk")
  const [instructions, setInstructions] = useState("")

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!name.trim() || loading) return

    setLoading(true)
    try {
      const response = await fetch("/api/dashboard/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          model,
          type,
          instructions: instructions.trim() || undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setOpen(false)
        setName("")
        setDescription("")
        setInstructions("")
        router.refresh()
        router.push(`/agents/${data.id}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4 mr-2" />
          Create Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
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
            <DialogTitle>Create New Agent</DialogTitle>
            <DialogDescription>
              Configure a new AI agent for your organization
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="My Assistant"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                data-form-type="other"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                autoComplete="off"
                data-form-type="other"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Agent Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {agentTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="model">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger id="model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                placeholder="You are a helpful assistant..."
                rows={4}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Agent"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
