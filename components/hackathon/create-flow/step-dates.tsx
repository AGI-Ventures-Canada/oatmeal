"use client"

import { useMemo } from "react"
import { startOfDay } from "date-fns"
import { DateTimeRangePicker, type DateTimeRange } from "@/components/ui/date-time-range-picker"

interface StepDatesProps {
  startsAt: string | null
  endsAt: string | null
  onChange: (startsAt: string | null, endsAt: string | null) => void
}

export function StepDates({ startsAt, endsAt, onChange }: StepDatesProps) {
  const today = useMemo(() => startOfDay(new Date()), [])
  const value: DateTimeRange = {
    from: startsAt ? new Date(startsAt) : null,
    to: endsAt ? new Date(endsAt) : null,
  }

  function handleChange(range: DateTimeRange) {
    onChange(
      range.from ? range.from.toISOString() : null,
      range.to ? range.to.toISOString() : null,
    )
  }

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
      <DateTimeRangePicker
        value={value}
        onChange={handleChange}
        fromLabel="Starts"
        toLabel="Ends"
        minDate={today}
      />
    </div>
  )
}
