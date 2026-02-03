"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

function formatDateForInput(dateString: string | null): string {
  if (!dateString) return ""
  const date = new Date(dateString)
  return date.toISOString().slice(0, 16)
}

export function TimelineEditForm({ hackathonId, initialData }: TimelineEditFormProps) {
  const router = useRouter()
  const { closeDrawer } = useEdit()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [registrationOpensAt, setRegistrationOpensAt] = useState(formatDateForInput(initialData.registrationOpensAt))
  const [registrationClosesAt, setRegistrationClosesAt] = useState(formatDateForInput(initialData.registrationClosesAt))
  const [startsAt, setStartsAt] = useState(formatDateForInput(initialData.startsAt))
  const [endsAt, setEndsAt] = useState(formatDateForInput(initialData.endsAt))

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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="timeline-reg-opens">Registration Opens</FieldLabel>
            <Input
              id="timeline-reg-opens"
              name="registrationOpensAt"
              type="datetime-local"
              value={registrationOpensAt}
              onChange={(e) => setRegistrationOpensAt(e.target.value)}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="timeline-reg-closes">Registration Closes</FieldLabel>
            <Input
              id="timeline-reg-closes"
              name="registrationClosesAt"
              type="datetime-local"
              value={registrationClosesAt}
              onChange={(e) => setRegistrationClosesAt(e.target.value)}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="timeline-starts">Hackathon Starts</FieldLabel>
            <Input
              id="timeline-starts"
              name="startsAt"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="timeline-ends">Hackathon Ends</FieldLabel>
            <Input
              id="timeline-ends"
              name="endsAt"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
          </Field>
        </div>

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
