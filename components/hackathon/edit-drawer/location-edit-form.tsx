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
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { useEdit } from "@/components/hackathon/preview/edit-context"
import { MapPin, Video, Undo2 } from "lucide-react"
import { cn } from "@/lib/utils"

type LocationType = "in_person" | "virtual" | null

interface LocationEditFormProps {
  hackathonId: string
  initialData: {
    locationType: LocationType
    locationName: string | null
    locationUrl: string | null
  }
  onSaveAndNext?: () => void
}

export function LocationEditForm({ hackathonId, initialData, onSaveAndNext }: LocationEditFormProps) {
  const router = useRouter()
  const { closeDrawer } = useEdit()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [locationType, setLocationType] = useState<LocationType>(initialData.locationType)
  const [locationName, setLocationName] = useState(initialData.locationName || "")
  const [locationUrl, setLocationUrl] = useState(initialData.locationUrl || "")

  const isDirty =
    locationType !== initialData.locationType ||
    locationName !== (initialData.locationName || "") ||
    locationUrl !== (initialData.locationUrl || "")

  function handleReset() {
    setLocationType(initialData.locationType)
    setLocationName(initialData.locationName || "")
    setLocationUrl(initialData.locationUrl || "")
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
          locationType,
          locationName: locationName.trim() || null,
          locationUrl: locationUrl.trim() || null,
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
    if (!isDirty) return
    const ok = await save()
    if (ok) closeDrawer()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !saving) {
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

  function selectType(type: LocationType) {
    if (locationType === type) {
      setLocationType(null)
      setLocationName("")
      setLocationUrl("")
    } else {
      setLocationType(type)
      setLocationName("")
      setLocationUrl("")
    }
  }

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6" autoComplete="off">
      <FieldGroup>
        <Field>
          <FieldLabel>Location Type</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => selectType("in_person")}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                locationType === "in_person"
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              )}
            >
              <MapPin className="size-4" />
              In Person
            </button>
            <button
              type="button"
              onClick={() => selectType("virtual")}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                locationType === "virtual"
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              )}
            >
              <Video className="size-4" />
              Virtual
            </button>
          </div>
          <FieldDescription>
            Click again to clear the selection
          </FieldDescription>
        </Field>

        {locationType === "in_person" && (
          <Field>
            <FieldLabel htmlFor="location-name">Venue Name & Address</FieldLabel>
            <Input
              id="location-name"
              name="location-name"
              placeholder="e.g. Moscone Center, San Francisco"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              autoFocus
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
          </Field>
        )}

        {locationType === "virtual" && (
          <Field>
            <FieldLabel htmlFor="location-url">Meeting Link</FieldLabel>
            <Input
              id="location-url"
              name="location-url"
              type="url"
              placeholder="https://zoom.us/j/..."
              value={locationUrl}
              onChange={(e) => setLocationUrl(e.target.value)}
              autoFocus
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
            <FieldDescription>
              Zoom, Google Meet, Discord, or any meeting link
            </FieldDescription>
          </Field>
        )}

        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}
      </FieldGroup>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Button type="submit" disabled={saving || !isDirty}>
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
            <Kbd>↵</Kbd> save
          </span>
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
