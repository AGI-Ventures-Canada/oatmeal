"use client"

import { useState, useRef, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { useEdit } from "@/components/hackathon/preview/edit-context"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Trash2, Loader2, Undo2, Mail, Plus, Building2 } from "lucide-react"
import { EmailChipsInput, type EmailEntry } from "./email-chips-input"
import { JudgeHeadshotUpload } from "./judge-headshot-upload"
import type { HackathonJudgeDisplay } from "@/lib/db/hackathon-types"

interface JudgesEditFormProps {
  hackathonId: string
  initialJudges: HackathonJudgeDisplay[]
  onSaveAndNext?: () => void
}

type PendingChange =
  | {
      type: "add"
      judge: HackathonJudgeDisplay
      tempId: string
      email?: string
      clerkUser?: EmailEntry["clerkUser"]
      headshotFile?: File
      headshotPreviewUrl?: string
    }
  | { type: "delete"; judgeId: string; originalJudge: HackathonJudgeDisplay }
  | { type: "update"; judgeId: string; field: string; newValue: string; oldValue: string | null }
  | { type: "headshot"; judgeId: string; file: File; previewUrl: string; oldUrl: string | null }

interface OrgSearchResult {
  id: string
  name: string
  slug: string | null
  logoUrl: string | null
  logoUrlDark: string | null
  websiteUrl: string | null
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function useOrgSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<OrgSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/dashboard/organizations/search?q=${encodeURIComponent(query)}`
        )
        if (res.ok) {
          const data = await res.json()
          setResults(data.organizations || [])
        }
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  return { query, setQuery, results, loading }
}

function OrgAutocomplete({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const { query, setQuery, results, loading } = useOrgSearch()
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    onChange(val)
    setQuery(val)
    setShowDropdown(true)
  }

  function handleSelect(org: OrgSearchResult) {
    onChange(org.name)
    setShowDropdown(false)
    setQuery("")
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onFocus={() => { if (query.length >= 2) setShowDropdown(true) }}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        placeholder="Organization"
        disabled={disabled}
        className="h-8 text-sm"
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
      />
      {loading && (
        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground animate-spin" />
      )}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full border rounded-lg bg-popover shadow-md max-h-32 overflow-y-auto">
          {results.map((org) => (
            <button
              key={org.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(org)}
              className="w-full flex items-center gap-2 p-2 text-left hover:bg-muted/50 transition-colors"
            >
              <Building2 className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm truncate">{org.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
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
  const [showSaved, setShowSaved] = useState(false)
  const [emailEntries, setEmailEntries] = useState<EmailEntry[]>([])
  const tempIdCounter = useRef(0)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const existingEmails = useMemo(() => {
    const emails: string[] = []
    for (const change of pendingChanges) {
      if (change.type === "add" && change.email) {
        emails.push(change.email)
      }
    }
    return emails
  }, [pendingChanges])

  const currentJudges = useMemo(() => {
    let judges = [...initialJudges]

    for (const change of pendingChanges) {
      if (change.type === "add") {
        const judge = change.headshotPreviewUrl
          ? { ...change.judge, headshot_url: change.headshotPreviewUrl }
          : change.judge
        judges.push(judge)
      } else if (change.type === "delete") {
        judges = judges.filter((j) => j.id !== change.judgeId)
      } else if (change.type === "update") {
        judges = judges.map((j) =>
          j.id === change.judgeId ? { ...j, [change.field]: change.newValue } : j
        )
      } else if (change.type === "headshot") {
        judges = judges.map((j) =>
          j.id === change.judgeId ? { ...j, headshot_url: change.previewUrl } : j
        )
      }
    }

    return judges
  }, [initialJudges, pendingChanges])

  const hasChanges = pendingChanges.length > 0

  useEffect(() => {
    if (!hasChanges || saving) return
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(() => {
      saveChanges().then((ok) => {
        if (ok) {
          setShowSaved(true)
          setTimeout(() => setShowSaved(false), 2000)
        }
      })
    }, 500)
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingChanges])

  function handleAddFromChips() {
    if (emailEntries.length === 0) return

    const newChanges: PendingChange[] = emailEntries.map((entry) => {
      const tempId = `temp-${++tempIdCounter.current}`
      const name = entry.clerkUser
        ? [entry.clerkUser.firstName, entry.clerkUser.lastName].filter(Boolean).join(" ") || entry.email.split("@")[0]
        : entry.email.split("@")[0]

      const newJudge: HackathonJudgeDisplay = {
        id: tempId,
        hackathon_id: hackathonId,
        name,
        title: null,
        organization: null,
        headshot_url: entry.clerkUser?.imageUrl ?? null,
        clerk_user_id: entry.clerkUser?.id ?? null,
        participant_id: null,
        display_order: currentJudges.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      return {
        type: "add" as const,
        judge: newJudge,
        tempId,
        email: entry.email,
        clerkUser: entry.clerkUser,
      }
    })

    setPendingChanges([...pendingChanges, ...newChanges])
    setEmailEntries([])
  }

  function handleDeleteJudge(judgeId: string) {
    const addChange = pendingChanges.find(
      (c) => c.type === "add" && c.tempId === judgeId
    )

    if (addChange) {
      if (addChange.type === "add" && addChange.headshotPreviewUrl) {
        URL.revokeObjectURL(addChange.headshotPreviewUrl)
      }
      setPendingChanges(pendingChanges.filter((c) => c !== addChange))
      return
    }

    const originalJudge = initialJudges.find((j) => j.id === judgeId)
    if (!originalJudge) return

    const relatedChanges = pendingChanges.filter(
      (c) =>
        (c.type === "update" && c.judgeId === judgeId) ||
        (c.type === "headshot" && c.judgeId === judgeId)
    )
    for (const c of relatedChanges) {
      if (c.type === "headshot") URL.revokeObjectURL(c.previewUrl)
    }
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

  function handleHeadshotSelected(judgeId: string, file: File) {
    const previewUrl = URL.createObjectURL(file)

    const addChange = pendingChanges.find(
      (c) => c.type === "add" && c.tempId === judgeId
    ) as Extract<PendingChange, { type: "add" }> | undefined

    if (addChange) {
      if (addChange.headshotPreviewUrl) URL.revokeObjectURL(addChange.headshotPreviewUrl)
      setPendingChanges(
        pendingChanges.map((c) =>
          c === addChange ? { ...c, headshotFile: file, headshotPreviewUrl: previewUrl } : c
        )
      )
      return
    }

    const existingHeadshot = pendingChanges.find(
      (c) => c.type === "headshot" && c.judgeId === judgeId
    ) as Extract<PendingChange, { type: "headshot" }> | undefined

    if (existingHeadshot) {
      URL.revokeObjectURL(existingHeadshot.previewUrl)
      setPendingChanges(
        pendingChanges.map((c) =>
          c === existingHeadshot ? { ...c, file, previewUrl } : c
        )
      )
      return
    }

    const original = initialJudges.find((j) => j.id === judgeId)
    if (!original) return

    setPendingChanges([
      ...pendingChanges,
      { type: "headshot", judgeId, file, previewUrl, oldUrl: original.headshot_url },
    ])
  }

  function handleUndo(index: number) {
    const change = pendingChanges[index]
    if (change.type === "add" && change.headshotPreviewUrl) {
      URL.revokeObjectURL(change.headshotPreviewUrl)
    }
    if (change.type === "headshot") {
      URL.revokeObjectURL(change.previewUrl)
    }
    setPendingChanges(pendingChanges.filter((_, i) => i !== index))
  }

  function handleUndoAll() {
    for (const change of pendingChanges) {
      if (change.type === "add" && change.headshotPreviewUrl) {
        URL.revokeObjectURL(change.headshotPreviewUrl)
      }
      if (change.type === "headshot") {
        URL.revokeObjectURL(change.previewUrl)
      }
    }
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
                ...(change.clerkUser ? { clerkUserId: change.clerkUser.id } : {}),
                ...(change.judge.headshot_url && !change.headshotFile ? { headshotUrl: change.judge.headshot_url } : {}),
                ...(change.email ? { email: change.email } : {}),
              }),
            }
          )
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || `Failed to add ${change.judge.name}`)
          }

          const displayProfile = await res.json()

          if (change.headshotFile) {
            const formData = new FormData()
            formData.append("file", change.headshotFile)
            await fetch(
              `/api/dashboard/hackathons/${hackathonId}/judges/display/${displayProfile.id}/headshot`,
              { method: "POST", body: formData }
            )
          }

          if (change.email) {
            const judgeRes = await fetch(
              `/api/dashboard/hackathons/${hackathonId}/judging/judges`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...(change.clerkUser
                    ? { clerkUserId: change.clerkUser.id }
                    : { email: change.email }),
                }),
              }
            )
            if (!judgeRes.ok) {
              const judgeData = await judgeRes.json()
              const identifier = change.judge.name || change.email || "Unknown"
              throw new Error(`${identifier}: ${judgeData.error || "Failed to assign judge role"}`)
            }
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
        } else if (change.type === "headshot") {
          const formData = new FormData()
          formData.append("file", change.file)
          const res = await fetch(
            `/api/dashboard/hackathons/${hackathonId}/judges/display/${change.judgeId}/headshot`,
            { method: "POST", body: formData }
          )
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || "Failed to upload headshot")
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
      if (emailEntries.length > 0 && !saving) {
        handleAddFromChips()
      } else if (!saving) {
        if (onSaveAndNext) {
          onSaveAndNext()
        } else {
          closeDrawer()
        }
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
          <FieldLabel>Invite Judges</FieldLabel>
          <EmailChipsInput
            hackathonId={hackathonId}
            entries={emailEntries}
            onAdd={(newEntries) => setEmailEntries((prev) => [...prev, ...newEntries])}
            onRemove={(email) => setEmailEntries((prev) => prev.filter((e) => e.email !== email))}
            existingEmails={existingEmails}
          />
        </Field>

        {emailEntries.length > 0 && (
          <Button
            type="button"
            onClick={handleAddFromChips}
            className="w-full"
          >
            <Plus className="size-4 mr-2" />
            Add {emailEntries.length} judge{emailEntries.length > 1 ? "s" : ""}
          </Button>
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}
      </FieldGroup>

      {currentJudges.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Judges ({currentJudges.length})
            </h4>
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
                  <div className="flex items-start gap-3">
                    <JudgeHeadshotUpload
                      headshotUrl={judge.headshot_url}
                      hackathonId={hackathonId}
                      judgeId={judge.id}
                      initials={getInitials(judge.name)}
                      onFileSelected={(file) => handleHeadshotSelected(judge.id, file)}
                      onUploaded={() => router.refresh()}
                      disabled={deleted}
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
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
                      <OrgAutocomplete
                        value={judge.organization ?? ""}
                        onChange={(value) => handleFieldChange(judge.id, "organization", value)}
                        disabled={deleted}
                      />
                      {email && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="size-3" />
                          <span>{email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
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
