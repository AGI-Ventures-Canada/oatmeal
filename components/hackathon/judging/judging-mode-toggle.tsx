"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2 } from "lucide-react"
import type { JudgingMode } from "@/lib/db/hackathon-types"

interface JudgingModeToggleProps {
  hackathonId: string
  initialMode: JudgingMode
  onModeChange?: (mode: JudgingMode) => void
}

export function JudgingModeToggle({
  hackathonId,
  initialMode,
  onModeChange,
}: JudgingModeToggleProps) {
  const [mode, setMode] = useState<JudgingMode>(initialMode)
  const [isSaving, setIsSaving] = useState(false)

  async function handleChange(value: string) {
    const newMode = value as JudgingMode
    setMode(newMode)
    setIsSaving(true)
    try {
      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judgingMode: newMode }),
      })
      if (!res.ok) {
        setMode(mode)
        return
      }
      onModeChange?.(newMode)
    } catch {
      setMode(mode)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Scoring Mode
          {isSaving && <Loader2 className="size-4 animate-spin" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup value={mode} onValueChange={handleChange}>
          <div className="flex items-start gap-3">
            <RadioGroupItem value="points" id="mode-points" className="mt-1" />
            <Label htmlFor="mode-points" className="flex flex-col gap-1 cursor-pointer items-start">
              <span className="font-medium">Points</span>
              <span className="text-sm text-muted-foreground font-normal">
                Judges score each criterion. Rankings computed from weighted scores.
              </span>
            </Label>
          </div>
          <div className="flex items-start gap-3 mt-4">
            <RadioGroupItem value="subjective" id="mode-subjective" className="mt-1" />
            <Label htmlFor="mode-subjective" className="flex flex-col gap-1 cursor-pointer items-start">
              <span className="font-medium">Subjective</span>
              <span className="text-sm text-muted-foreground font-normal">
                Judges pick their favorite projects per prize category with reasoning.
              </span>
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
