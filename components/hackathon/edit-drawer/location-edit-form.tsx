"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { useEditOptional } from "@/components/hackathon/preview/edit-context"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"
import { MapPin, Video, Undo2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { normalizeOptionalUrl, normalizeUrlFieldValue, urlInputProps } from "@/lib/utils/url"

type LocationType = "in_person" | "virtual" | null

interface LocationEditFormProps {
  hackathonId?: string
  initialData: {
    locationType: LocationType
    locationName: string | null
    locationUrl: string | null
    locationLatitude?: number | null
    locationLongitude?: number | null
    requireLocationVerification?: boolean
  }
  onSaveAndNext?: () => void
  onSave?: (data: {
    locationType: LocationType
    locationName: string | null
    locationUrl: string | null
    locationLatitude?: number | null
    locationLongitude?: number | null
    requireLocationVerification?: boolean
  }) => Promise<boolean>
  onCancel?: () => void
}

export function LocationEditForm({ hackathonId, initialData, onSaveAndNext, onSave, onCancel }: LocationEditFormProps) {
  const router = useRouter()
  const editContext = useEditOptional()
  const closeDrawer = onCancel ?? editContext?.closeDrawer ?? (() => {})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSaved, setShowSaved] = useState(false)

  const [locationType, setLocationType] = useState<LocationType>(initialData.locationType)
  const [locationName, setLocationName] = useState(initialData.locationName || "")
  const [locationUrl, setLocationUrl] = useState(initialData.locationUrl || "")
  const [locationLatitude, setLocationLatitude] = useState<number | null>(initialData.locationLatitude ?? null)
  const [locationLongitude, setLocationLongitude] = useState<number | null>(initialData.locationLongitude ?? null)
  const [requireLocationVerification, setRequireLocationVerification] = useState(initialData.requireLocationVerification ?? false)

  const stateRef = useRef({
    locationType,
    locationName,
    locationUrl,
    locationLatitude,
    locationLongitude,
    requireLocationVerification,
  })
  stateRef.current = {
    locationType,
    locationName,
    locationUrl,
    locationLatitude,
    locationLongitude,
    requireLocationVerification,
  }

  const isDirty =
    locationType !== initialData.locationType ||
    locationName !== (initialData.locationName || "") ||
    locationUrl !== (initialData.locationUrl || "") ||
    locationLatitude !== (initialData.locationLatitude ?? null) ||
    locationLongitude !== (initialData.locationLongitude ?? null) ||
    requireLocationVerification !== (initialData.requireLocationVerification ?? false)

  function handleReset() {
    setLocationType(initialData.locationType)
    setLocationName(initialData.locationName || "")
    setLocationUrl(initialData.locationUrl || "")
    setLocationLatitude(initialData.locationLatitude ?? null)
    setLocationLongitude(initialData.locationLongitude ?? null)
    setRequireLocationVerification(initialData.requireLocationVerification ?? false)
    setError(null)
  }

  const save = useCallback(async (overrides?: Partial<typeof stateRef.current>) => {
    const state = { ...stateRef.current, ...overrides }
    setSaving(true)
    setError(null)

    try {
      const normalizedLocationUrl = normalizeOptionalUrl(state.locationUrl) ?? null
      const payload = {
        locationType: state.locationType,
        locationName: state.locationName.trim() || null,
        locationUrl: normalizedLocationUrl,
        locationLatitude: state.locationLatitude,
        locationLongitude: state.locationLongitude,
        requireLocationVerification: state.requireLocationVerification,
      }

      if (onSave) {
        const ok = await onSave(payload)
        if (ok) {
          setShowSaved(true)
          setTimeout(() => setShowSaved(false), 2000)
        }
        return ok
      }

      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
  }, [hackathonId, onSave, router])

  function selectType(type: LocationType) {
    let newType: LocationType
    if (locationType === type) {
      newType = null
      setLocationType(null)
      setLocationName("")
      setLocationUrl("")
      setLocationLatitude(null)
      setLocationLongitude(null)
      setRequireLocationVerification(false)
      save({
        locationType: null,
        locationName: "",
        locationUrl: "",
        locationLatitude: null,
        locationLongitude: null,
        requireLocationVerification: false,
      })
    } else {
      newType = type
      setLocationType(type)
      setLocationName("")
      setLocationUrl("")
      setLocationLatitude(null)
      setLocationLongitude(null)
      if (type !== "in_person") setRequireLocationVerification(false)
      save({
        locationType: newType,
        locationName: "",
        locationUrl: "",
        locationLatitude: null,
        locationLongitude: null,
        requireLocationVerification: type === "in_person" ? requireLocationVerification : false,
      })
    }
  }

  function handleBlurSave() {
    if (!isDirty) return
    save()
  }

  function handleVerificationChange(checked: boolean) {
    setRequireLocationVerification(checked)
    save({ requireLocationVerification: checked })
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

  return (
    <div onKeyDown={handleKeyDown} className="space-y-4">
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
          <>
            <Field>
              <FieldLabel htmlFor="location-name">Venue Name & Address</FieldLabel>
              <AddressAutocomplete
                id="location-name"
                value={locationName}
                onChange={setLocationName}
                onSelect={(result) => {
                  setLocationName(result.displayName)
                  setLocationLatitude(result.latitude)
                  setLocationLongitude(result.longitude)
                  save({
                    locationName: result.displayName,
                    locationLatitude: result.latitude,
                    locationLongitude: result.longitude,
                  })
                }}
                placeholder="e.g. Moscone Center, San Francisco"
                autoFocus
              />
              <FieldDescription>
                Start typing for address suggestions
              </FieldDescription>
            </Field>

            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="require-location" className="text-sm font-medium">
                  Require location verification
                </Label>
                <p className="text-xs text-muted-foreground">
                  Attendees must share their location when registering
                </p>
              </div>
              <Switch
                id="require-location"
                checked={requireLocationVerification}
                onCheckedChange={handleVerificationChange}
                disabled={!locationLatitude}
              />
            </div>
            {requireLocationVerification && !locationLatitude && (
              <p className="text-xs text-muted-foreground">
                Select an address from the suggestions to enable verification
              </p>
            )}
          </>
        )}

        {locationType === "virtual" && (
          <Field>
            <FieldLabel htmlFor="location-url">Meeting Link</FieldLabel>
            <Input
              id="location-url"
              name="location-url"
              {...urlInputProps}
              placeholder="zoom.us/j/..."
              value={locationUrl}
              onChange={(e) => setLocationUrl(e.target.value)}
              onBlur={() => {
                setLocationUrl(normalizeUrlFieldValue(locationUrl))
                handleBlurSave()
              }}
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
