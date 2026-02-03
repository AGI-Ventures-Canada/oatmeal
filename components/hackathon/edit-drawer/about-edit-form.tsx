"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field"
import { useEdit } from "@/components/hackathon/preview/edit-context"

interface AboutEditFormProps {
  hackathonId: string
  initialData: {
    description: string | null
  }
}

export function AboutEditForm({ hackathonId, initialData }: AboutEditFormProps) {
  const router = useRouter()
  const { closeDrawer } = useEdit()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [description, setDescription] = useState(initialData.description || "")

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
          description: description || null,
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
          <FieldLabel htmlFor="about-description">Description</FieldLabel>
          <Textarea
            id="about-description"
            name="description"
            rows={8}
            placeholder="Tell participants about your hackathon..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
          />
          <FieldDescription>
            Describe the hackathon theme, goals, and what participants can expect
          </FieldDescription>
        </Field>

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
