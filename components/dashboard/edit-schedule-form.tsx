"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import type { Schedule, ScheduleFrequency } from "@/lib/db/types"
import { Button } from "@/components/ui/button"
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

const frequencies = [
  { value: "once", label: "Once" },
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "cron", label: "Custom (Cron)" },
]

const commonTimezones = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
]

interface EditScheduleFormProps {
  schedule: Schedule
  onSuccess: () => void
}

export function EditScheduleForm({ schedule, onSuccess }: EditScheduleFormProps) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(schedule.name)
  const [frequency, setFrequency] = useState<ScheduleFrequency>(schedule.frequency)
  const [cronExpression, setCronExpression] = useState(schedule.cron_expression ?? "")
  const [timezone, setTimezone] = useState(schedule.timezone ?? "UTC")
  const [input, setInput] = useState(
    schedule.input ? JSON.stringify(schedule.input, null, 2) : ""
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      let parsedInput = undefined
      if (input.trim()) {
        try {
          parsedInput = JSON.parse(input.trim())
        } catch {
          return
        }
      }

      const response = await fetch(`/api/dashboard/schedules/${schedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          frequency,
          cronExpression: frequency === "cron" ? cronExpression.trim() : undefined,
          timezone,
          input: parsedInput,
        }),
      })

      if (response.ok) {
        onSuccess()
      }
    } finally {
      setLoading(false)
    }
  }

  const isValid = name.trim() && (frequency !== "cron" || cronExpression.trim())

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="grid gap-2">
        <Label htmlFor="edit-name">Name</Label>
        <Input
          id="edit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
          data-form-type="other"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="edit-frequency">Frequency</Label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as ScheduleFrequency)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {frequencies.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="edit-timezone">Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {commonTimezones.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {frequency === "cron" && (
        <div className="grid gap-2">
          <Label htmlFor="edit-cron">Cron Expression</Label>
          <Input
            id="edit-cron"
            placeholder="0 9 * * 1-5"
            value={cronExpression}
            onChange={(e) => setCronExpression(e.target.value)}
            autoComplete="off"
            data-form-type="other"
            required
          />
          <p className="text-xs text-muted-foreground">
            Format: minute hour day-of-month month day-of-week
          </p>
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="edit-input">Input (JSON, optional)</Label>
        <Textarea
          id="edit-input"
          placeholder='{"prompt": "Check for updates"}'
          rows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="font-mono text-sm"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={loading || !isValid}>
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
