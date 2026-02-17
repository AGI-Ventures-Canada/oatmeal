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
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Undo2 } from "lucide-react"
import { useEdit } from "@/components/hackathon/preview/edit-context"

interface RulesEditFormProps {
  hackathonId: string
  initialData: {
    rules: string | null
  }
  onSaveAndNext?: () => void
}

export function RulesEditForm({ hackathonId, initialData, onSaveAndNext }: RulesEditFormProps) {
  const router = useRouter()
  const { closeDrawer } = useEdit()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [rules, setRules] = useState(initialData.rules || "")
  const isDirty = rules !== (initialData.rules || "")

  function handleReset() {
    setRules(initialData.rules || "")
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
          rules: rules || null,
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
          <FieldLabel htmlFor="rules-content">Rules</FieldLabel>
          <Textarea
            id="rules-content"
            name="rules"
            rows={10}
            placeholder="Enter the rules and guidelines for your hackathon..."
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
          />
          <FieldDescription>
            Set clear guidelines for participation, submission requirements, and judging criteria
          </FieldDescription>
        </Field>

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
