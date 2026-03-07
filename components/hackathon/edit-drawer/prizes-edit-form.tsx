"use client"

import { useState, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { useEdit } from "@/components/hackathon/preview/edit-context"
import { Badge } from "@/components/ui/badge"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Trash2, Loader2, Undo2 } from "lucide-react"
import type { Prize, PrizeType } from "@/lib/db/hackathon-types"

interface PrizesEditFormProps {
  hackathonId: string
  initialPrizes: Prize[]
  onSaveAndNext?: () => void
}

type PendingChange =
  | { type: "add"; prize: Prize; tempId: string }
  | { type: "delete"; prizeId: string; originalPrize: Prize }
  | { type: "update"; prizeId: string; field: string; newValue: unknown; oldValue: unknown }

const typeLabels: Record<PrizeType, string> = {
  score: "Score-based",
  favorite: "Organizer's Pick",
  crowd: "Crowd's Favorite",
}

export function PrizesEditForm({
  hackathonId,
  initialPrizes,
  onSaveAndNext,
}: PrizesEditFormProps) {
  const router = useRouter()
  const { closeDrawer } = useEdit()
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState("")
  const tempIdCounter = useRef(0)

  const currentPrizes = useMemo(() => {
    let prizes = [...initialPrizes]

    for (const change of pendingChanges) {
      if (change.type === "add") {
        prizes.push(change.prize)
      } else if (change.type === "delete") {
        prizes = prizes.filter((p) => p.id !== change.prizeId)
      } else if (change.type === "update") {
        prizes = prizes.map((p) =>
          p.id === change.prizeId ? { ...p, [change.field]: change.newValue } : p
        )
      }
    }

    return prizes
  }, [initialPrizes, pendingChanges])

  const hasChanges = pendingChanges.length > 0

  function handleAddPrize() {
    if (!nameInput.trim()) return

    const tempId = `temp-${++tempIdCounter.current}`
    const newPrize: Prize = {
      id: tempId,
      hackathon_id: hackathonId,
      name: nameInput.trim(),
      description: null,
      value: null,
      type: "favorite",
      rank: null,
      display_order: currentPrizes.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setPendingChanges([...pendingChanges, { type: "add", prize: newPrize, tempId }])
    setNameInput("")
  }

  function handleDeletePrize(prizeId: string) {
    const addChange = pendingChanges.find(
      (c) => c.type === "add" && c.tempId === prizeId
    )

    if (addChange) {
      setPendingChanges(pendingChanges.filter((c) => c !== addChange))
      return
    }

    const originalPrize = initialPrizes.find((p) => p.id === prizeId)
    if (!originalPrize) return

    const relatedChanges = pendingChanges.filter(
      (c) => c.type === "update" && c.prizeId === prizeId
    )
    const filtered = pendingChanges.filter((c) => !relatedChanges.includes(c))
    setPendingChanges([...filtered, { type: "delete", prizeId, originalPrize }])
  }

  function handleFieldChange(prizeId: string, field: string, value: unknown) {
    const addChange = pendingChanges.find(
      (c) => c.type === "add" && c.tempId === prizeId
    ) as Extract<PendingChange, { type: "add" }> | undefined

    if (addChange) {
      setPendingChanges(
        pendingChanges.map((c) =>
          c === addChange
            ? { ...c, prize: { ...c.prize, [field]: value } }
            : c
        )
      )
      return
    }

    const existingUpdate = pendingChanges.findIndex(
      (c) => c.type === "update" && c.prizeId === prizeId && c.field === field
    )

    const original = initialPrizes.find((p) => p.id === prizeId)
    if (!original) return

    const oldValue = (original as unknown as Record<string, unknown>)[field]

    if (existingUpdate >= 0) {
      if (value === oldValue || (value === "" && oldValue === null)) {
        setPendingChanges(pendingChanges.filter((_, i) => i !== existingUpdate))
      } else {
        const updated = [...pendingChanges]
        updated[existingUpdate] = { type: "update", prizeId, field, newValue: value, oldValue }
        setPendingChanges(updated)
      }
      return
    }

    if (value !== oldValue && !(value === "" && oldValue === null)) {
      setPendingChanges([
        ...pendingChanges,
        { type: "update", prizeId, field, newValue: value, oldValue },
      ])
    }
  }

  function handleUndo(index: number) {
    setPendingChanges(pendingChanges.filter((_, i) => i !== index))
  }

  function handleUndoAll() {
    setPendingChanges([])
  }

  async function saveChanges() {
    if (!hasChanges) return true

    setSaving(true)
    setError(null)

    try {
      for (const change of pendingChanges) {
        if (change.type === "add") {
          const res = await fetch(
            `/api/dashboard/hackathons/${hackathonId}/prizes`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: change.prize.name,
                description: change.prize.description,
                value: change.prize.value,
                type: change.prize.type,
                rank: change.prize.rank,
                displayOrder: change.prize.display_order,
              }),
            }
          )
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || `Failed to add ${change.prize.name}`)
          }
        } else if (change.type === "delete") {
          const res = await fetch(
            `/api/dashboard/hackathons/${hackathonId}/prizes/${change.prizeId}`,
            { method: "DELETE" }
          )
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || "Failed to remove prize")
          }
        } else if (change.type === "update") {
          const body: Record<string, unknown> = {}
          if (change.field === "type") body.type = change.newValue
          else if (change.field === "rank") body.rank = change.newValue
          else body[change.field] = change.newValue || null

          const res = await fetch(
            `/api/dashboard/hackathons/${hackathonId}/prizes/${change.prizeId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          )
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || "Failed to update prize")
          }
        }
      }

      router.refresh()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes")
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    if (!hasChanges) {
      closeDrawer()
      return
    }

    const ok = await saveChanges()
    if (ok) closeDrawer()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      if (nameInput.trim() && !saving) {
        handleAddPrize()
      } else if (!saving) {
        saveChanges().then((ok) => {
          if (ok) {
            if (onSaveAndNext) {
              onSaveAndNext()
            } else {
              closeDrawer()
            }
          }
        })
      }
    }
  }

  function isDeleted(prizeId: string) {
    return pendingChanges.some(
      (c) => c.type === "delete" && c.prizeId === prizeId
    )
  }

  return (
    <div className="space-y-6" onKeyDown={handleKeyDown}>
      <FieldGroup>
        <Field>
          <FieldLabel>Add Prize</FieldLabel>
          <Input
            placeholder="Prize name..."
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && nameInput.trim()) {
                e.preventDefault()
                handleAddPrize()
              }
            }}
            autoFocus
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Press Enter to add
          </p>
        </Field>

        {error && <p className="text-destructive text-sm">{error}</p>}
      </FieldGroup>

      {currentPrizes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Prizes ({currentPrizes.length})
            </h4>
            {hasChanges && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUndoAll}
                className="h-7 text-xs"
              >
                <Undo2 className="size-3 mr-1" />
                Undo all
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {currentPrizes.map((prize) => {
              const deleted = isDeleted(prize.id)

              return (
                <div
                  key={prize.id}
                  className={`rounded-lg border p-3 space-y-3 ${
                    prize.id.startsWith("temp-") ? "border-dashed bg-muted/30" : ""
                  } ${deleted ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <Input
                        value={prize.name}
                        onChange={(e) => handleFieldChange(prize.id, "name", e.target.value)}
                        placeholder="Prize name"
                        disabled={deleted}
                        className="h-8 text-sm font-medium"
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                        data-form-type="other"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePrize(prize.id)}
                      disabled={deleted}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 shrink-0"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={prize.description ?? ""}
                      onChange={(e) => handleFieldChange(prize.id, "description", e.target.value)}
                      placeholder="Description"
                      disabled={deleted}
                      className="h-8 text-sm"
                      autoComplete="off"
                      data-1p-ignore
                      data-lpignore="true"
                      data-form-type="other"
                    />
                    <Input
                      value={prize.value ?? ""}
                      onChange={(e) => handleFieldChange(prize.id, "value", e.target.value)}
                      placeholder="Value (e.g. $5,000)"
                      disabled={deleted}
                      className="h-8 text-sm"
                      autoComplete="off"
                      data-1p-ignore
                      data-lpignore="true"
                      data-form-type="other"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={prize.type}
                      onValueChange={(v) => handleFieldChange(prize.id, "type", v as PrizeType)}
                      disabled={deleted}
                    >
                      <SelectTrigger className="w-40 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="score">Score-based</SelectItem>
                        <SelectItem value="favorite">Organizer&apos;s Pick</SelectItem>
                        <SelectItem value="crowd">Crowd&apos;s Favorite</SelectItem>
                      </SelectContent>
                    </Select>
                    {prize.type === "score" && (
                      <Select
                        value={prize.rank?.toString() ?? "1"}
                        onValueChange={(v) => handleFieldChange(prize.id, "rank", parseInt(v))}
                        disabled={deleted}
                      >
                        <SelectTrigger className="w-20 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1st</SelectItem>
                          <SelectItem value="2">2nd</SelectItem>
                          <SelectItem value="3">3rd</SelectItem>
                          <SelectItem value="4">4th</SelectItem>
                          <SelectItem value="5">5th</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {typeLabels[prize.type]}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {hasChanges && (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <h4 className="text-xs font-medium text-muted-foreground">
            Pending changes ({pendingChanges.length})
          </h4>
          <div className="space-y-1">
            {pendingChanges.map((change, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-muted-foreground">
                  {change.type === "add" && `+ Add "${change.prize.name}"`}
                  {change.type === "delete" && `- Remove "${change.originalPrize.name}"`}
                  {change.type === "update" && `~ Update ${change.field}`}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUndo(index)}
                  className="h-6 w-6 p-0"
                >
                  <Undo2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 pt-2">
        <div className="flex gap-2">
          {hasChanges ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  handleUndoAll()
                  closeDrawer()
                }}
              >
                Discard
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
                Save changes
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Done
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>↵</Kbd>
            </KbdGroup>{" "}
            save & next
          </span>
        </div>
      </div>
    </div>
  )
}
