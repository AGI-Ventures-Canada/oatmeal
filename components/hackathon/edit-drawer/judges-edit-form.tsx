"use client"

import { useState, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useEdit } from "@/components/hackathon/preview/edit-context"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Trash2, Loader2, Undo2, Mail } from "lucide-react"
import type { HackathonJudgeDisplay } from "@/lib/db/hackathon-types"

interface JudgesEditFormProps {
  hackathonId: string
  initialJudges: HackathonJudgeDisplay[]
  onSaveAndNext?: () => void
}

type PendingChange =
  | { type: "add"; judge: HackathonJudgeDisplay; tempId: string; email?: string }
  | { type: "delete"; judgeId: string; originalJudge: HackathonJudgeDisplay }
  | { type: "update"; judgeId: string; field: string; newValue: string; oldValue: string | null }

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function JudgesEditForm({
  hackathonId,
  initialJudges,
  onSaveAndNext,
}: JudgesEditFormProps) {
  const router = useRouter()
  const { closeDrawer } = useEdit()
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState("")
  const tempIdCounter = useRef(0)

  const currentJudges = useMemo(() => {
    let judges = [...initialJudges]

    for (const change of pendingChanges) {
      if (change.type === "add") {
        judges.push(change.judge)
      } else if (change.type === "delete") {
        judges = judges.filter((j) => j.id !== change.judgeId)
      } else if (change.type === "update") {
        judges = judges.map((j) =>
          j.id === change.judgeId ? { ...j, [change.field]: change.newValue } : j
        )
      }
    }

    return judges
  }, [initialJudges, pendingChanges])

  const hasChanges = pendingChanges.length > 0

  function handleAddManual() {
    if (!nameInput.trim()) return

    const input = nameInput.trim()
    const inputIsEmail = isEmail(input)
    const tempId = `temp-${++tempIdCounter.current}`
    const newJudge: HackathonJudgeDisplay = {
      id: tempId,
      hackathon_id: hackathonId,
      name: inputIsEmail ? input.split("@")[0] : input,
      title: null,
      organization: null,
      headshot_url: null,
      clerk_user_id: null,
      participant_id: null,
      display_order: currentJudges.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setPendingChanges([
      ...pendingChanges,
      { type: "add", judge: newJudge, tempId, ...(inputIsEmail ? { email: input } : {}) },
    ])
    setNameInput("")
  }

  function handleDeleteJudge(judgeId: string) {
    const addChange = pendingChanges.find(
      (c) => c.type === "add" && c.tempId === judgeId
    )

    if (addChange) {
      setPendingChanges(pendingChanges.filter((c) => c !== addChange))
      return
    }

    const originalJudge = initialJudges.find((j) => j.id === judgeId)
    if (!originalJudge) return

    const relatedChanges = pendingChanges.filter(
      (c) => (c.type === "update" && c.judgeId === judgeId)
    )
    const filtered = pendingChanges.filter((c) => !relatedChanges.includes(c))
    setPendingChanges([...filtered, { type: "delete", judgeId, originalJudge }])
  }

  function handleFieldChange(judgeId: string, field: string, value: string) {
    const addChange = pendingChanges.find(
      (c) => c.type === "add" && c.tempId === judgeId
    ) as Extract<PendingChange, { type: "add" }> | undefined

    if (addChange) {
      setPendingChanges(
        pendingChanges.map((c) =>
          c === addChange
            ? { ...c, judge: { ...c.judge, [field]: value || null } }
            : c
        )
      )
      return
    }

    const existingUpdate = pendingChanges.findIndex(
      (c) => c.type === "update" && c.judgeId === judgeId && c.field === field
    )

    const original = initialJudges.find((j) => j.id === judgeId)
    if (!original) return

    const oldValue = (original as unknown as Record<string, unknown>)[field] as string | null

    if (existingUpdate >= 0) {
      if ((value || null) === oldValue) {
        setPendingChanges(pendingChanges.filter((_, i) => i !== existingUpdate))
      } else {
        const updated = [...pendingChanges]
        updated[existingUpdate] = { type: "update", judgeId, field, newValue: value, oldValue }
        setPendingChanges(updated)
      }
      return
    }

    if ((value || null) !== oldValue) {
      setPendingChanges([
        ...pendingChanges,
        { type: "update", judgeId, field, newValue: value, oldValue },
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
            `/api/dashboard/hackathons/${hackathonId}/judges/display`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: change.judge.name,
                title: change.judge.title,
                organization: change.judge.organization,
                displayOrder: change.judge.display_order,
                ...(change.email ? { email: change.email } : {}),
              }),
            }
          )
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || `Failed to add ${change.judge.name}`)
          }
        } else if (change.type === "delete") {
          const res = await fetch(
            `/api/dashboard/hackathons/${hackathonId}/judges/display/${change.judgeId}`,
            { method: "DELETE" }
          )
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || "Failed to remove judge")
          }
        } else if (change.type === "update") {
          const res = await fetch(
            `/api/dashboard/hackathons/${hackathonId}/judges/display/${change.judgeId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ [change.field]: change.newValue || null }),
            }
          )
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || "Failed to update judge")
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
        handleAddManual()
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

  function isDeleted(judgeId: string) {
    return pendingChanges.some(
      (c) => c.type === "delete" && c.judgeId === judgeId
    )
  }

  return (
    <div className="space-y-6" onKeyDown={handleKeyDown}>
      <FieldGroup>
        <Field>
          <FieldLabel>Add Judge</FieldLabel>
          <Input
            placeholder="Name or email..."
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && nameInput.trim()) {
                e.preventDefault()
                handleAddManual()
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

      {currentJudges.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Judges ({currentJudges.length})
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
            {currentJudges.map((judge) => {
              const deleted = isDeleted(judge.id)
              const addChange = pendingChanges.find(
                (c) => c.type === "add" && c.tempId === judge.id
              ) as Extract<PendingChange, { type: "add" }> | undefined
              const email = addChange?.email

              return (
                <div
                  key={judge.id}
                  className={`rounded-lg border p-3 space-y-3 ${
                    judge.id.startsWith("temp-") ? "border-dashed bg-muted/30" : ""
                  } ${deleted ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10 shrink-0">
                      {judge.headshot_url && <AvatarImage src={judge.headshot_url} alt={judge.name} />}
                      <AvatarFallback className="text-xs">{getInitials(judge.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <Input
                        value={judge.name}
                        onChange={(e) => handleFieldChange(judge.id, "name", e.target.value)}
                        placeholder="Name"
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
                      onClick={() => handleDeleteJudge(judge.id)}
                      disabled={deleted}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 shrink-0"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={judge.title ?? ""}
                      onChange={(e) => handleFieldChange(judge.id, "title", e.target.value)}
                      placeholder="Title"
                      disabled={deleted}
                      className="h-8 text-sm"
                      autoComplete="off"
                      data-1p-ignore
                      data-lpignore="true"
                      data-form-type="other"
                    />
                    <Input
                      value={judge.organization ?? ""}
                      onChange={(e) => handleFieldChange(judge.id, "organization", e.target.value)}
                      placeholder="Organization"
                      disabled={deleted}
                      className="h-8 text-sm"
                      autoComplete="off"
                      data-1p-ignore
                      data-lpignore="true"
                      data-form-type="other"
                    />
                  </div>
                  {email && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="size-3" />
                      <span>{email}</span>
                    </div>
                  )}
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
                  {change.type === "add" && `+ Add "${change.judge.name}"`}
                  {change.type === "delete" && `- Remove "${change.originalJudge.name}"`}
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
