"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MarkdownEditor } from "@/components/ui/markdown-editor"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Undo2 } from "lucide-react"
import { useEditOptional } from "@/components/hackathon/preview/edit-context"

interface AboutEditFormProps {
  hackathonId?: string
  initialData: {
    description: string | null
  }
  onSaveAndNext?: () => void
  onSave?: (data: { description: string | null }) => Promise<boolean>
  onCancel?: () => void
}

export function AboutEditForm({ hackathonId, initialData, onSaveAndNext, onSave, onCancel }: AboutEditFormProps) {
  const router = useRouter()
  const editContext = useEditOptional()
  const closeDrawer = onCancel ?? editContext?.closeDrawer ?? (() => {})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSaved, setShowSaved] = useState(false)

  const [description, setDescription] = useState(initialData.description || "")
  const isDirty = description !== (initialData.description || "")

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const descriptionRef = useRef(description)
  descriptionRef.current = description

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  function handleReset() {
    setDescription(initialData.description || "")
    setError(null)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
  }

  async function save(value?: string) {
    const desc = value ?? descriptionRef.current
    setSaving(true)
    setError(null)

    try {
      if (onSave) {
        const ok = await onSave({ description: desc || null })
        if (ok) {
          setShowSaved(true)
          setTimeout(() => setShowSaved(false), 2000)
        }
        return ok
      }

      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: desc || null,
        }),
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

  function handleChange(value: string) {
    setDescription(value)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    const isDiff = value !== (initialData.description || "")
    if (isDiff) {
      saveTimeoutRef.current = setTimeout(() => {
        save(value)
      }, 1500)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !saving) {
      e.preventDefault()
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
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
          <FieldLabel htmlFor="about-description">Description</FieldLabel>
          <MarkdownEditor
            id="about-description"
            rows={8}
            placeholder="Tell participants about your hackathon..."
            value={description}
            onChange={handleChange}
          />
          <FieldDescription>
            Supports markdown: **bold**, _italic_, ## headings, lists, and [links](url)
          </FieldDescription>
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
