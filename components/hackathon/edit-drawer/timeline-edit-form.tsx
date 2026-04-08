"use client"

import { useState, useMemo, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  DateTimeRangePicker,
  type DateTimeRange,
} from "@/components/ui/date-time-range-picker"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { startOfDay } from "date-fns"
import { useEditOptional } from "@/components/hackathon/preview/edit-context"
import { validateTimelineDates } from "@/lib/utils/timeline"

interface TimelineEditFormProps {
  hackathonId?: string
  initialData: {
    startsAt: string | null
    endsAt: string | null
    registrationOpensAt: string | null
    registrationClosesAt: string | null
  }
  showRegistrationDates?: boolean
  showHackathonDates?: boolean
  onSaveAndNext?: () => void
  onSave?: (data: {
    startsAt: Date | null
    endsAt: Date | null
    registrationOpensAt: Date | null
    registrationClosesAt: Date | null
  }) => Promise<boolean>
  onCancel?: () => void
}

function parseDate(dateString: string | null): Date | null {
  if (!dateString) return null
  return new Date(dateString)
}

export function TimelineEditForm({ hackathonId, initialData, showRegistrationDates = true, showHackathonDates = true, onSaveAndNext, onSave, onCancel }: TimelineEditFormProps) {
  const router = useRouter()
  const today = useMemo(() => startOfDay(new Date()), [])
  const editContext = useEditOptional()
  const closeDrawer = onCancel ?? editContext?.closeDrawer ?? (() => {})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSaved, setShowSaved] = useState(false)

  const [registrationRange, setRegistrationRange] = useState<DateTimeRange>({
    from: parseDate(initialData.registrationOpensAt),
    to: parseDate(initialData.registrationClosesAt),
  })
  const [hackathonRange, setHackathonRange] = useState<DateTimeRange>({
    from: parseDate(initialData.startsAt),
    to: parseDate(initialData.endsAt),
  })

  const registrationRef = useRef(registrationRange)
  registrationRef.current = registrationRange
  const hackathonRef = useRef(hackathonRange)
  hackathonRef.current = hackathonRange

  function rangeChanged(range: DateTimeRange, fromInitial: string | null, toInitial: string | null): boolean {
    const fromEqual = !range.from && !fromInitial ? true : range.from && fromInitial ? range.from.getTime() === new Date(fromInitial).getTime() : false
    const toEqual = !range.to && !toInitial ? true : range.to && toInitial ? range.to.getTime() === new Date(toInitial).getTime() : false
    return !fromEqual || !toEqual
  }

  const isDirty =
    (showRegistrationDates && rangeChanged(registrationRange, initialData.registrationOpensAt, initialData.registrationClosesAt)) ||
    (showHackathonDates && rangeChanged(hackathonRange, initialData.startsAt, initialData.endsAt))

  function handleReset() {
    setRegistrationRange({
      from: parseDate(initialData.registrationOpensAt),
      to: parseDate(initialData.registrationClosesAt),
    })
    setHackathonRange({
      from: parseDate(initialData.startsAt),
      to: parseDate(initialData.endsAt),
    })
    setError(null)
  }

  const save = useCallback(async (regRange?: DateTimeRange, hackRange?: DateTimeRange) => {
    const reg = regRange ?? registrationRef.current
    const hack = hackRange ?? hackathonRef.current

    const dateError = validateTimelineDates({
      registrationOpensAt: reg.from,
      registrationClosesAt: reg.to,
      startsAt: hack.from,
      endsAt: hack.to,
    })
    if (dateError) {
      setError(dateError)
      return false
    }

    setSaving(true)
    setError(null)

    try {
      if (onSave) {
        const ok = await onSave({
          startsAt: hack.from || null,
          endsAt: hack.to || null,
          registrationOpensAt: reg.from || null,
          registrationClosesAt: reg.to || null,
        })
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
          registrationOpensAt: reg.from || null,
          registrationClosesAt: reg.to || null,
          startsAt: hack.from || null,
          endsAt: hack.to || null,
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
  }, [hackathonId, onSave, router])

  function handleRegistrationChange(range: DateTimeRange) {
    setRegistrationRange(range)
    save(range, hackathonRef.current)
  }

  function handleHackathonChange(range: DateTimeRange) {
    setHackathonRange(range)
    save(registrationRef.current, range)
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
        {showRegistrationDates && (
          <Field>
            <FieldLabel htmlFor="timeline-registration">Registration Period</FieldLabel>
            <DateTimeRangePicker
              id="timeline-registration"
              value={registrationRange}
              onChange={handleRegistrationChange}
              placeholder="Select registration dates"
              fromLabel="Opens"
              toLabel="Closes"
              minDate={today}
            />
          </Field>
        )}
        {showHackathonDates && (
          <Field>
            <FieldLabel htmlFor="timeline-hackathon">Hackathon Period</FieldLabel>
            <DateTimeRangePicker
              id="timeline-hackathon"
              value={hackathonRange}
              onChange={handleHackathonChange}
              placeholder="Select hackathon dates"
              fromLabel="Start"
              toLabel="End"
              minDate={today}
            />
          </Field>
        )}

        <FieldDescription>
          {showRegistrationDates && !showHackathonDates
            ? "Set when registration opens and closes"
            : showHackathonDates && !showRegistrationDates
              ? "Set when the hackathon starts and ends"
              : "Set the key dates for your hackathon timeline"}
        </FieldDescription>

        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}
      </FieldGroup>

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
  )
}
