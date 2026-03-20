"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, Trash2, Plus, Check, X, Loader2 } from "lucide-react"
import type { RubricLevel } from "@/lib/db/hackathon-types"

interface RubricLevelEditorProps {
  hackathonId: string
  criteriaId: string
  levels: RubricLevel[]
  onLevelsChange: (levels: RubricLevel[]) => void
}

type EditForm = {
  label: string
  description: string
}

const emptyForm: EditForm = { label: "", description: "" }

export function RubricLevelEditor({
  hackathonId,
  criteriaId,
  levels,
  onLevelsChange,
}: RubricLevelEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>(emptyForm)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [addingNew, setAddingNew] = useState(false)
  const [addForm, setAddForm] = useState<EditForm>(emptyForm)
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const sorted = [...levels].sort((a, b) => b.level_number - a.level_number)

  function openEdit(level: RubricLevel) {
    setEditingId(level.id)
    setEditForm({ label: level.label, description: level.description ?? "" })
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(emptyForm)
    setEditError(null)
  }

  async function handleSaveEdit(levelId: string) {
    if (!editForm.label.trim()) {
      setEditError("Label is required")
      return
    }
    setEditSaving(true)
    setEditError(null)
    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/judging/criteria/${criteriaId}/levels/${levelId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: editForm.label.trim(),
            description: editForm.description.trim() || null,
          }),
        }
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update")
      }
      onLevelsChange(
        levels.map((l) =>
          l.id === levelId
            ? {
                ...l,
                label: editForm.label.trim(),
                description: editForm.description.trim() || null,
              }
            : l
        )
      )
      setEditingId(null)
      setEditForm(emptyForm)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete(levelId: string) {
    setDeletingId(levelId)
    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/judging/criteria/${criteriaId}/levels/${levelId}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error("Failed to delete")
      onLevelsChange(levels.filter((l) => l.id !== levelId))
    } catch {
    } finally {
      setDeletingId(null)
    }
  }

  function openAdd() {
    setAddForm(emptyForm)
    setAddError(null)
    setAddingNew(true)
  }

  function cancelAdd() {
    setAddingNew(false)
    setAddForm(emptyForm)
    setAddError(null)
  }

  async function handleAdd() {
    if (!addForm.label.trim()) {
      setAddError("Label is required")
      return
    }
    setAddSaving(true)
    setAddError(null)
    const nextLevel = levels.length > 0 ? Math.max(...levels.map((l) => l.level_number)) + 1 : 1
    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/judging/criteria/${criteriaId}/levels`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: addForm.label.trim(),
            description: addForm.description.trim() || null,
            level_number: nextLevel,
          }),
        }
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create")
      }
      const data = await res.json()
      onLevelsChange([
        ...levels,
        {
          id: data.id,
          criteria_id: criteriaId,
          level_number: nextLevel,
          label: addForm.label.trim(),
          description: addForm.description.trim() || null,
        },
      ])
      setAddingNew(false)
      setAddForm(emptyForm)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setAddSaving(false)
    }
  }

  function handleEditKeyDown(e: React.KeyboardEvent, levelId: string) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !editSaving) {
      e.preventDefault()
      handleSaveEdit(levelId)
    }
    if (e.key === "Escape") cancelEdit()
  }

  function handleAddKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !addSaving) {
      e.preventDefault()
      handleAdd()
    }
    if (e.key === "Escape") cancelAdd()
  }

  return (
    <div className="space-y-2">
      {sorted.map((level) => (
        <div key={level.id} className="rounded-md border bg-background">
          {editingId === level.id ? (
            <div
              className="p-3 space-y-2"
              onKeyDown={(e) => handleEditKeyDown(e, level.id)}
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center size-6 rounded-full bg-muted text-muted-foreground text-xs font-medium shrink-0">
                  {level.level_number}
                </span>
                <Input
                  value={editForm.label}
                  onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                  placeholder="Level label"
                  autoFocus
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
              </div>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Description (optional)"
                rows={2}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              />
              {editError && (
                <p className="text-sm text-destructive">{editError}</p>
              )}
              <div className="flex items-center gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={cancelEdit}
                  disabled={editSaving}
                >
                  <X className="size-3.5 mr-1" />
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSaveEdit(level.id)}
                  disabled={editSaving}
                >
                  {editSaving ? (
                    <Loader2 className="size-3.5 mr-1 animate-spin" />
                  ) : (
                    <Check className="size-3.5 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3">
              <span className="inline-flex items-center justify-center size-6 rounded-full bg-muted text-muted-foreground text-xs font-medium shrink-0 mt-0.5">
                {level.level_number}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{level.label}</p>
                {level.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">{level.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => openEdit(level)}
                  disabled={deletingId === level.id}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive"
                  onClick={() => handleDelete(level.id)}
                  disabled={levels.length <= 2 || deletingId === level.id}
                >
                  {deletingId === level.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {addingNew ? (
        <div
          className="rounded-md border bg-background p-3 space-y-2"
          onKeyDown={handleAddKeyDown}
        >
          <Input
            value={addForm.label}
            onChange={(e) => setAddForm({ ...addForm, label: e.target.value })}
            placeholder="Level label"
            autoFocus
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
          />
          <Textarea
            value={addForm.description}
            onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
            placeholder="Description (optional)"
            rows={2}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
          />
          {addError && (
            <p className="text-sm text-destructive">{addError}</p>
          )}
          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cancelAdd}
              disabled={addSaving}
            >
              <X className="size-3.5 mr-1" />
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              disabled={addSaving}
            >
              {addSaving ? (
                <Loader2 className="size-3.5 mr-1 animate-spin" />
              ) : (
                <Plus className="size-3.5 mr-1" />
              )}
              Add Level
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openAdd}
          className="w-full"
        >
          <Plus className="size-3.5 mr-2" />
          Add Level
        </Button>
      )}
    </div>
  )
}
