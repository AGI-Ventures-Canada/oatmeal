"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, Check, AlertCircle, RotateCcw } from "lucide-react"
import type { Agent } from "@/lib/db/agent-types"
import type { UpdateAgentRequest } from "@/lib/types/api-requests"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AgentDetailProps {
  agent: Agent
}

const models = [
  { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  { value: "claude-opus-4-5-20251101", label: "Claude Opus 4.5" },
]

const agentTypes = [
  { value: "ai_sdk", label: "AI SDK" },
  { value: "claude_sdk", label: "Claude SDK" },
]

type SaveStatus = "idle" | "saving" | "success" | "error"

export function AgentDetail({ agent }: AgentDetailProps) {
  const router = useRouter()
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [name, setName] = useState(agent.name)
  const [description, setDescription] = useState(agent.description ?? "")
  const [model, setModel] = useState(agent.model)
  const [type, setType] = useState(agent.type)
  const [instructions, setInstructions] = useState(agent.instructions ?? "")
  const [maxSteps, setMaxSteps] = useState(agent.max_steps ?? 50)
  const [isActive, setIsActive] = useState(agent.is_active ?? true)

  const originalValues = useMemo(() => ({
    name: agent.name,
    description: agent.description ?? "",
    model: agent.model,
    type: agent.type,
    instructions: agent.instructions ?? "",
    maxSteps: agent.max_steps ?? 50,
    isActive: agent.is_active ?? true,
  }), [agent])

  const hasChanges = useMemo(() => {
    return (
      name !== originalValues.name ||
      description !== originalValues.description ||
      model !== originalValues.model ||
      type !== originalValues.type ||
      instructions !== originalValues.instructions ||
      maxSteps !== originalValues.maxSteps ||
      isActive !== originalValues.isActive
    )
  }, [name, description, model, type, instructions, maxSteps, isActive, originalValues])

  const changedFields = useMemo(() => {
    const fields: string[] = []
    if (name !== originalValues.name) fields.push("name")
    if (description !== originalValues.description) fields.push("description")
    if (model !== originalValues.model) fields.push("model")
    if (type !== originalValues.type) fields.push("type")
    if (instructions !== originalValues.instructions) fields.push("instructions")
    if (maxSteps !== originalValues.maxSteps) fields.push("maxSteps")
    if (isActive !== originalValues.isActive) fields.push("isActive")
    return fields
  }, [name, description, model, type, instructions, maxSteps, isActive, originalValues])

  useEffect(() => {
    if (saveStatus === "success") {
      const timer = setTimeout(() => setSaveStatus("idle"), 3000)
      return () => clearTimeout(timer)
    }
  }, [saveStatus])

  const handleReset = () => {
    setName(originalValues.name)
    setDescription(originalValues.description)
    setModel(originalValues.model)
    setType(originalValues.type)
    setInstructions(originalValues.instructions)
    setMaxSteps(originalValues.maxSteps)
    setIsActive(originalValues.isActive)
    setSaveStatus("idle")
    setErrorMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !hasChanges) return

    setSaveStatus("saving")
    setErrorMessage(null)

    try {
      const requestBody: UpdateAgentRequest = {
        name: name.trim(),
        description: description.trim() || null,
        model,
        type,
        instructions: instructions.trim() || null,
        maxSteps,
        isActive,
      }
      const response = await fetch(`/api/dashboard/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        setSaveStatus("success")
        router.refresh()
      } else {
        const data = await response.json().catch(() => ({}))
        setSaveStatus("error")
        setErrorMessage(data.error || "Failed to save changes")
      }
    } catch {
      setSaveStatus("error")
      setErrorMessage("Network error. Please try again.")
    }
  }

  const isFieldChanged = (field: string) => changedFields.includes(field)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name" className={cn(isFieldChanged("name") && "text-primary")}>
            Name {isFieldChanged("name") && <span className="text-xs">(modified)</span>}
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cn(isFieldChanged("name") && "border-primary")}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description" className={cn(isFieldChanged("description") && "text-primary")}>
            Description {isFieldChanged("description") && <span className="text-xs">(modified)</span>}
          </Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className={cn(isFieldChanged("description") && "border-primary")}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="type" className={cn(isFieldChanged("type") && "text-primary")}>
            Agent Type {isFieldChanged("type") && <span className="text-xs">(modified)</span>}
          </Label>
          <Select value={type} onValueChange={(v) => setType(v as Agent["type"])}>
            <SelectTrigger id="type" className={cn(isFieldChanged("type") && "border-primary")}>
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
          <Label htmlFor="model" className={cn(isFieldChanged("model") && "text-primary")}>
            Model {isFieldChanged("model") && <span className="text-xs">(modified)</span>}
          </Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger id="model" className={cn(isFieldChanged("model") && "border-primary")}>
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
        <div className="grid gap-2">
          <Label htmlFor="maxSteps" className={cn(isFieldChanged("maxSteps") && "text-primary")}>
            Max Steps {isFieldChanged("maxSteps") && <span className="text-xs">(modified)</span>}
          </Label>
          <Input
            id="maxSteps"
            type="number"
            min={1}
            max={200}
            value={maxSteps}
            onChange={(e) => setMaxSteps(parseInt(e.target.value) || 50)}
            className={cn(isFieldChanged("maxSteps") && "border-primary")}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="instructions" className={cn(isFieldChanged("instructions") && "text-primary")}>
          Instructions {isFieldChanged("instructions") && <span className="text-xs">(modified)</span>}
        </Label>
        <Textarea
          id="instructions"
          rows={8}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="You are a helpful assistant..."
          className={cn("font-mono text-sm", isFieldChanged("instructions") && "border-primary")}
        />
      </div>

      {saveStatus === "error" && errorMessage && (
        <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="size-4" />
          {errorMessage}
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="active" className={cn(isFieldChanged("isActive") && "text-primary")}>
              Agent Active {isFieldChanged("isActive") && <span className="text-xs">(modified)</span>}
            </Label>
          </div>
          {hasChanges && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground"
            >
              <RotateCcw className="size-4 mr-1" />
              Reset
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && saveStatus === "idle" && (
            <span className="text-sm text-muted-foreground">
              {changedFields.length} field{changedFields.length > 1 ? "s" : ""} modified
            </span>
          )}
          {saveStatus === "success" && (
            <span className="flex items-center gap-1 text-sm text-primary">
              <Check className="size-4" />
              Saved
            </span>
          )}
          <Button
            type="submit"
            disabled={saveStatus === "saving" || !name.trim() || !hasChanges}
          >
            {saveStatus === "saving" ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : saveStatus === "success" ? (
              <>
                <Check className="size-4 mr-2" />
                Saved
              </>
            ) : (
              <>
                <Save className="size-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}
