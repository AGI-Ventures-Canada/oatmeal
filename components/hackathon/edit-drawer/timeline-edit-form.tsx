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
import { useEdit } from "@/components/hackathon/preview/edit-context"

interface TimelineEditFormProps {
  hackathonId: string
  initialData: {
    startsAt: string | null
    endsAt: string | null
    registrationOpensAt: string | null
    registrationClosesAt: string | null
  }
}

function parseDate(dateString: string | null): Date | null {
  if (!dateString) return null
  return new Date(dateString)
}

export function TimelineEditForm({ hackathonId, initialData }: TimelineEditFormProps) {
  const router = useRouter()
  const { closeDrawer } = useEdit()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [registrationOpensAt, setRegistrationOpensAt] = useState<Date | null>(parseDate(initialData.registrationOpensAt))
  const [registrationClosesAt, setRegistrationClosesAt] = useState<Date | null>(parseDate(initialData.registrationClosesAt))
  const [startsAt, setStartsAt] = useState<Date | null>(parseDate(initialData.startsAt))
  const [endsAt, setEndsAt] = useState<Date | null>(parseDate(initialData.endsAt))

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !saving) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
      closeDrawer()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
      setSaving(false)
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

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={closeDrawer} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
