"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Undo2 } from "lucide-react"
import { useEdit } from "@/components/hackathon/preview/edit-context"

interface TimelineEditFormProps {
  hackathonId: string
  initialData: {
    startsAt: string | null
    endsAt: string | null
    registrationOpensAt: string | null
    registrationClosesAt: string | null
  }
  onSaveAndNext?: () => void
}

function parseDate(dateString: string | null): Date | null {
  if (!dateString) return null
  return new Date(dateString)
}

export function TimelineEditForm({ hackathonId, initialData, onSaveAndNext }: TimelineEditFormProps) {
  const router = useRouter()
  const { closeDrawer } = useEdit()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [registrationOpensAt, setRegistrationOpensAt] = useState<Date | null>(parseDate(initialData.registrationOpensAt))
  const [registrationClosesAt, setRegistrationClosesAt] = useState<Date | null>(parseDate(initialData.registrationClosesAt))
  const [startsAt, setStartsAt] = useState<Date | null>(parseDate(initialData.startsAt))
  const [endsAt, setEndsAt] = useState<Date | null>(parseDate(initialData.endsAt))

  function datesEqual(a: Date | null, b: string | null): boolean {
    if (!a && !b) return true
    if (!a || !b) return false
    return a.getTime() === new Date(b).getTime()
  }

  const isDirty =
    !datesEqual(registrationOpensAt, initialData.registrationOpensAt) ||
    !datesEqual(registrationClosesAt, initialData.registrationClosesAt) ||
    !datesEqual(startsAt, initialData.startsAt) ||
    !datesEqual(endsAt, initialData.endsAt)

  function handleReset() {
    setRegistrationOpensAt(parseDate(initialData.registrationOpensAt))
    setRegistrationClosesAt(parseDate(initialData.registrationClosesAt))
    setStartsAt(parseDate(initialData.startsAt))
    setEndsAt(parseDate(initialData.endsAt))
    setError(null)
  }

  async function save() {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationOpensAt: registrationOpensAt || null,
          registrationClosesAt: registrationClosesAt || null,
          startsAt: startsAt || null,
          endsAt: endsAt || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save")
      }

      router.refresh()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
      setSaving(false)
      return false
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ok = await save()
    if (ok) closeDrawer()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !saving) {
      e.preventDefault()
      save().then(ok => {
        if (ok) onSaveAndNext ? onSaveAndNext() : closeDrawer()
      })
    }
    if (e.key === "Escape" && isDirty) {
      e.preventDefault()
      handleReset()
    }
  }

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6" autoComplete="off">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="timeline-reg-opens">Registration Opens</FieldLabel>
          <DateTimePicker
            id="timeline-reg-opens"
            value={registrationOpensAt}
            onChange={setRegistrationOpensAt}
            placeholder="Select date and time"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="timeline-reg-closes">Registration Closes</FieldLabel>
          <DateTimePicker
            id="timeline-reg-closes"
            value={registrationClosesAt}
            onChange={setRegistrationClosesAt}
            placeholder="Select date and time"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="timeline-starts">Hackathon Starts</FieldLabel>
          <DateTimePicker
            id="timeline-starts"
            value={startsAt}
            onChange={setStartsAt}
            placeholder="Select date and time"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="timeline-ends">Hackathon Ends</FieldLabel>
          <DateTimePicker
            id="timeline-ends"
            value={endsAt}
            onChange={setEndsAt}
            placeholder="Select date and time"
          />
        </Field>

        <FieldDescription>
          Set the key dates for your hackathon timeline
        </FieldDescription>

        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}
      </FieldGroup>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={closeDrawer} disabled={saving}>
            Cancel
          </Button>
          {isDirty && (
            <Button type="button" variant="ghost" onClick={handleReset} disabled={saving}>
              <Undo2 className="size-4 mr-1" />
              Reset
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Kbd>↵</Kbd> save
          </span>
          <span className="inline-flex items-center gap-1">
            <KbdGroup><Kbd>⌘</Kbd><Kbd>↵</Kbd></KbdGroup> save & next
          </span>
          {isDirty && (
            <span className="inline-flex items-center gap-1">
              <Kbd>Esc</Kbd> reset
            </span>
          )}
        </div>
      </div>
    </form>
  )
}
