"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Undo2 } from "lucide-react"
import { useEditOptional } from "@/components/hackathon/preview/edit-context"

interface NameEditFormProps {
  hackathonId?: string
  initialName: string
  onSaveAndNext?: () => void
  onSave?: (data: { name: string }) => Promise<boolean>
  onCancel?: () => void
}

export function NameEditForm({ hackathonId, initialName, onSaveAndNext, onSave, onCancel }: NameEditFormProps) {
  const router = useRouter()
  const editContext = useEditOptional()
  const closeDrawer = onCancel ?? editContext?.closeDrawer ?? (() => {})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSaved, setShowSaved] = useState(false)

  const [name, setName] = useState(initialName)
  const isDirty = name !== initialName

  function handleReset() {
    setName(initialName)
    setError(null)
  }

  async function save() {
    setSaving(true)
    setError(null)

    try {
      if (onSave) {
        const ok = await onSave({ name })
        if (ok) {
          setShowSaved(true)
          setTimeout(() => setShowSaved(false), 2000)
        }
        return ok
      }

      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save")
      }

      router.refresh()
      setShowSaved(true)
      setTimeout(() => setShowSaved(false), 2000)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleBlurSave() {
    if (!isDirty || !name.trim()) return
    await save()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && name.trim() && !saving) {
      e.preventDefault()
      if (!isDirty) {
        if (onSaveAndNext) { onSaveAndNext() } else { closeDrawer() }
        return
      }
      save().then(ok => {
        if (ok) { if (onSaveAndNext) { onSaveAndNext() } else { closeDrawer() } }
      })
    }
    if (e.key === "Escape" && isDirty) {
      e.preventDefault()
      handleReset()
    }
  }

  return (
    <div onKeyDown={handleKeyDown} className="space-y-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="hackathon-name">Hackathon Name</FieldLabel>
          <Input
            id="hackathon-name"
            name="hackathon-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleBlurSave}
            required
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
          />
        </Field>

        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}
      </FieldGroup>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={closeDrawer} disabled={saving}>
            Done
          </Button>
          {isDirty && (
            <Button type="button" variant="ghost" onClick={handleReset} disabled={saving}>
              <Undo2 className="size-4 mr-1" />
              Reset
            </Button>
          )}
        </div>
        <div className="flex items-center justify-between">
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
          {saving && (
            <p className="text-xs text-muted-foreground">Saving...</p>
          )}
          {showSaved && (
            <p className="text-xs text-muted-foreground animate-in fade-in">Saved</p>
          )}
        </div>
      </div>
    </div>
  )
}
