"use client"

import { useMemo } from "react"
import { startOfDay } from "date-fns"
import { DateTimePicker } from "@/components/ui/date-time-picker"

interface StepDatesProps {
  startsAt: string | null
  endsAt: string | null
  onChange: (startsAt: string | null, endsAt: string | null) => void
}

export function StepDates({ startsAt, endsAt, onChange }: StepDatesProps) {
  const today = useMemo(() => startOfDay(new Date()), [])
  const startDate = startsAt ? new Date(startsAt) : null
  const endDate = endsAt ? new Date(endsAt) : null

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-medium tracking-tight sm:text-5xl">
          When does it happen?
        </h1>
        <p className="text-muted-foreground">
          Set start and end dates. You can skip this and add them later.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Starts</label>
          <DateTimePicker
            value={startDate}
            onChange={(date) => onChange(date?.toISOString() ?? null, endsAt)}
            placeholder="Pick start date"
            minDate={today}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Ends</label>
          <DateTimePicker
            value={endDate}
            onChange={(date) => onChange(startsAt, date?.toISOString() ?? null)}
            placeholder="Pick end date"
            minDate={startDate ?? today}
          />
        </div>
      </div>
    </div>
  )
}
