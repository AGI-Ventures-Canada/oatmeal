/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, Check, AlertCircle, RotateCcw } from "lucide-react"
import type { Agent } from "@/lib/db/hackathon-types"
import type { UpdateAgentRequest } from "@/lib/types/api-requests"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
  const [maxSteps, setMaxSteps] = useState(agent.max_steps ?? 5)
  const [maxStepsInput, setMaxStepsInput] = useState(String(agent.max_steps ?? 5))
  const [isActive, setIsActive] = useState(agent.is_active ?? true)
  const [enableSandboxTools, setEnableSandboxTools] = useState(
    (agent.config as Record<string, unknown>)?.enableSandboxTools !== false
  )

  const originalValues = useMemo(() => ({
    name: agent.name,
    description: agent.description ?? "",
    model: agent.model,
    type: agent.type,
    instructions: agent.instructions ?? "",
    maxSteps: agent.max_steps ?? 5,
    isActive: agent.is_active ?? true,
    enableSandboxTools: (agent.config as Record<string, unknown>)?.enableSandboxTools !== false,
  }), [agent])

  const hasChanges = useMemo(() => {
    return (
      name !== originalValues.name ||
      description !== originalValues.description ||
      model !== originalValues.model ||
      type !== originalValues.type ||
      instructions !== originalValues.instructions ||
      maxSteps !== originalValues.maxSteps ||
      isActive !== originalValues.isActive ||
      enableSandboxTools !== originalValues.enableSandboxTools
    )
  }, [name, description, model, type, instructions, maxSteps, isActive, enableSandboxTools, originalValues])

  const changedFields = useMemo(() => {
    const fields: string[] = []
    if (name !== originalValues.name) fields.push("name")
    if (description !== originalValues.description) fields.push("description")
    if (model !== originalValues.model) fields.push("model")
    if (type !== originalValues.type) fields.push("type")
    if (instructions !== originalValues.instructions) fields.push("instructions")
    if (maxSteps !== originalValues.maxSteps) fields.push("maxSteps")
    if (isActive !== originalValues.isActive) fields.push("isActive")
    if (enableSandboxTools !== originalValues.enableSandboxTools) fields.push("enableSandboxTools")
    return fields
  }, [name, description, model, type, instructions, maxSteps, isActive, enableSandboxTools, originalValues])

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
    setMaxStepsInput(String(originalValues.maxSteps))
    setIsActive(originalValues.isActive)
    setEnableSandboxTools(originalValues.enableSandboxTools)
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
        config: { enableSandboxTools },
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="type">Agent Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as Agent["type"])}>
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
        <div className="grid gap-2">
          <Label htmlFor="maxSteps">Max Steps</Label>
          <Input
            id="maxSteps"
            type="number"
            min={1}
            max={200}
            value={maxStepsInput}
            onChange={(e) => {
              const value = e.target.value
              setMaxStepsInput(value)
              if (value === "") {
                return
              }
              const numValue = parseInt(value, 10)
              if (!isNaN(numValue) && numValue >= 1 && numValue <= 200) {
                setMaxSteps(numValue)
              }
            }}
            onBlur={(e) => {
              const value = e.target.value.trim()
              if (value === "") {
                setMaxStepsInput(String(maxSteps))
                return
              }
              const numValue = parseInt(value, 10)
              if (isNaN(numValue) || numValue < 1) {
                setMaxStepsInput(String(maxSteps))
              } else if (numValue > 200) {
                setMaxSteps(200)
                setMaxStepsInput("200")
              } else {
                setMaxSteps(numValue)
                setMaxStepsInput(String(numValue))
              }
            }}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="instructions">Instructions</Label>
        <Textarea
          id="instructions"
          rows={8}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="You are a helpful assistant..."
          className="font-mono text-sm"
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
            <Label htmlFor="active">Agent Active</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="sandboxTools"
              checked={enableSandboxTools}
              onCheckedChange={setEnableSandboxTools}
            />
            <Label htmlFor="sandboxTools">Sandbox Tools</Label>
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
            <span className="text-xs text-muted-foreground">
              {changedFields.length} unsaved
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
