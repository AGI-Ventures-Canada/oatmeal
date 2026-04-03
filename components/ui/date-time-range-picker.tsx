"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { type DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useIsMobile } from "@/hooks/use-mobile"

export interface DateTimeRange {
  from: Date | null
  to: Date | null
}

interface DateTimeRangePickerProps {
  value?: DateTimeRange
  onChange?: (range: DateTimeRange) => void
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
  fromLabel?: string
  toLabel?: string
  minDate?: Date
  numberOfMonths?: number
}

type TimeState = { hours: string; minutes: string; period: "AM" | "PM" }

function to12Hour(hours24: number): { hours: number; period: "AM" | "PM" } {
  if (hours24 === 0) return { hours: 12, period: "AM" }
  if (hours24 === 12) return { hours: 12, period: "PM" }
  if (hours24 > 12) return { hours: hours24 - 12, period: "PM" }
  return { hours: hours24, period: "AM" }
}

function to24Hour(hours12: number, period: "AM" | "PM"): number {
  if (period === "AM") return hours12 === 12 ? 0 : hours12
  return hours12 === 12 ? 12 : hours12 + 12
}

function applyTime(date: Date, time: TimeState): Date {
  const hours12 = parseInt(time.hours, 10) || 12
  const hours24 = to24Hour(hours12, time.period)
  const minutes = parseInt(time.minutes, 10) || 0
  const d = new Date(date)
  d.setHours(hours24, minutes, 0, 0)
  return d
}

function timeFromDate(date: Date | null, fallback: TimeState = DEFAULT_FROM_TIME): TimeState {
  if (!date) return fallback
  const { hours, period } = to12Hour(date.getHours())
  return {
    hours: hours.toString().padStart(2, "0"),
    minutes: date.getMinutes().toString().padStart(2, "0"),
    period,
  }
}

const DEFAULT_FROM_TIME: TimeState = { hours: "08", minutes: "30", period: "AM" }
const DEFAULT_TO_TIME: TimeState = { hours: "05", minutes: "00", period: "PM" }

function formatTrigger(range: DateTimeRange | undefined): string | null {
  if (!range?.from) return null
  const fromStr = format(range.from, "MMM d 'at' h:mm a")
  if (!range.to) return fromStr
  const toStr = format(range.to, "MMM d 'at' h:mm a")
  return `${fromStr} — ${toStr}`
}

export function DateTimeRangePicker({
  value,
  onChange,
  placeholder = "Pick a date range",
  disabled,
  id,
  className,
  fromLabel = "Start",
  toLabel = "End",
  minDate,
  numberOfMonths: numberOfMonthsProp,
}: DateTimeRangePickerProps) {
  const isMobile = useIsMobile()
  const [open, setOpen] = React.useState(false)

  const [pendingRange, setPendingRange] = React.useState<DateRange | undefined>(
    undefined,
  )
  const [fromTime, setFromTime] = React.useState<TimeState>(DEFAULT_FROM_TIME)
  const [toTime, setToTime] = React.useState<TimeState>(DEFAULT_TO_TIME)

  React.useEffect(() => {
    if (open) {
      setPendingRange(
        value?.from
          ? { from: value.from, to: value.to ?? undefined }
          : undefined,
      )
      setFromTime(timeFromDate(value?.from ?? null, DEFAULT_FROM_TIME))
      setToTime(timeFromDate(value?.to ?? null, DEFAULT_TO_TIME))
    }
  }, [open, value])

  function handleRangeSelect(range: DateRange | undefined) {
    if (!range) {
      setPendingRange(undefined)
      return
    }
    const from = range.from ? applyTime(range.from, fromTime) : undefined
    const to = range.to ? applyTime(range.to, toTime) : undefined
    setPendingRange({ from, to })
  }

  function handleTimeChange(
    target: "from" | "to",
    field: "hours" | "minutes",
    newValue: string,
  ) {
    const numValue = newValue.replace(/\D/g, "")
    let validated = numValue.length > 2 ? numValue.slice(-2) : numValue

    if (field === "hours") {
      const num = parseInt(validated, 10)
      if (num > 12) validated = "12"
      else if (num < 1 && validated.length === 2) validated = "01"
    } else {
      const num = parseInt(validated, 10)
      if (num > 59) validated = "59"
    }

    const setter = target === "from" ? setFromTime : setToTime
    setter((prev) => ({ ...prev, [field]: validated }))
    setPendingRange((r) => {
      if (!r) return r
      const date = r[target]
      if (!date) return r
      const currentTime = target === "from" ? fromTime : toTime
      const newTime = { ...currentTime, [field]: validated }
      return { ...r, [target]: applyTime(date, newTime) }
    })
  }

  function handlePeriodToggle(target: "from" | "to") {
    const setter = target === "from" ? setFromTime : setToTime
    const newPeriod: "AM" | "PM" =
      (target === "from" ? fromTime : toTime).period === "AM" ? "PM" : "AM"
    setter((prev) => ({ ...prev, period: newPeriod }))
    setPendingRange((r) => {
      if (!r) return r
      const date = r[target]
      if (!date) return r
      const currentTime = target === "from" ? fromTime : toTime
      const newTime = { ...currentTime, period: newPeriod }
      return { ...r, [target]: applyTime(date, newTime) }
    })
  }

  function handlePeriodKeyDown(
    target: "from" | "to",
    e: React.KeyboardEvent<HTMLButtonElement>,
  ) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleConfirm()
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault()
      handlePeriodToggle(target)
    } else if (e.key.toLowerCase() === "a") {
      e.preventDefault()
      updatePeriod(target, "AM")
    } else if (e.key.toLowerCase() === "p") {
      e.preventDefault()
      updatePeriod(target, "PM")
    }
  }

  function updatePeriod(target: "from" | "to", newPeriod: "AM" | "PM") {
    const setter = target === "from" ? setFromTime : setToTime
    const currentTime = target === "from" ? fromTime : toTime
    if (currentTime.period === newPeriod) return
    setter((prev) => ({ ...prev, period: newPeriod }))
    setPendingRange((r) => {
      if (!r) return r
      const date = r[target]
      if (!date) return r
      const newTime = { ...currentTime, period: newPeriod }
      return { ...r, [target]: applyTime(date, newTime) }
    })
  }

  function handleTimeBlur(target: "from" | "to", field: "hours" | "minutes") {
    const setter = target === "from" ? setFromTime : setToTime
    setter((prev) => {
      const padded = prev[field].padStart(2, "0")
      if (padded === prev[field]) return prev
      return { ...prev, [field]: padded }
    })
  }

  function handleTimeKeyDown(
    target: "from" | "to",
    field: "hours" | "minutes",
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleConfirm()
      return
    }

    if (!/^\d$/.test(e.key)) return

    e.preventDefault()
    const { selectionStart, selectionEnd } = e.currentTarget
    const time = target === "from" ? fromTime : toTime
    const currentVal = time[field]

    let newVal: string
    if (selectionStart !== selectionEnd) {
      newVal =
        currentVal.slice(0, selectionStart ?? 0) +
        e.key +
        currentVal.slice(selectionEnd ?? 0)
    } else {
      const pos = selectionStart ?? currentVal.length
      newVal = currentVal.slice(0, pos) + e.key + currentVal.slice(pos)
    }

    handleTimeChange(target, field, newVal)
  }

  function handleConfirm() {
    onChange?.({
      from: pendingRange?.from ?? null,
      to: pendingRange?.to ?? null,
    })
    setOpen(false)
  }

  function handleClear() {
    onChange?.({ from: null, to: null })
    setOpen(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setPendingRange(
        value?.from
          ? { from: value.from, to: value.to ?? undefined }
          : undefined,
      )
      setFromTime(timeFromDate(value?.from ?? null, DEFAULT_FROM_TIME))
      setToTime(timeFromDate(value?.to ?? null, DEFAULT_TO_TIME))
    }
    setOpen(nextOpen)
  }

  function handlePopoverKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && !e.defaultPrevented) {
      e.preventDefault()
      handleConfirm()
    }
  }

  const displayText = formatTrigger(value)
  const hasValue = value?.from || value?.to
  const canConfirm = pendingRange?.from && pendingRange?.to

  function renderTimeRow(
    target: "from" | "to",
    label: string,
    time: TimeState,
  ) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">
          {label}
        </span>
        <div className="flex items-center gap-1">
        <Input
          type="text"
          inputMode="numeric"
          aria-label={`${label} hours`}
          value={time.hours}
          onChange={(e) => handleTimeChange(target, "hours", e.target.value)}
          onKeyDown={(e) => handleTimeKeyDown(target, "hours", e)}
          onFocus={(e) => e.target.select()}
          onBlur={() => handleTimeBlur(target, "hours")}
          className="h-8 w-11 text-center text-sm px-1"
          maxLength={2}
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
        />
        <span className="text-muted-foreground text-xs" aria-hidden="true">
          :
        </span>
        <Input
          type="text"
          inputMode="numeric"
          aria-label={`${label} minutes`}
          value={time.minutes}
          onChange={(e) => handleTimeChange(target, "minutes", e.target.value)}
          onKeyDown={(e) => handleTimeKeyDown(target, "minutes", e)}
          onFocus={(e) => e.target.select()}
          onBlur={() => handleTimeBlur(target, "minutes")}
          className="h-8 w-11 text-center text-sm px-1"
          maxLength={2}
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-11 px-0 text-xs"
          aria-label={`${label} time period: ${time.period}. Press A for AM, P for PM, or arrow keys to toggle`}
          onClick={() => handlePeriodToggle(target)}
          onKeyDown={(e) => handlePeriodKeyDown(target, e)}
        >
          {time.period}
        </Button>
        </div>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !hasValue && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayText ?? placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="center"
        side="bottom"
        collisionPadding={16}
        onKeyDown={handlePopoverKeyDown}
      >
        <Calendar
          mode="range"
          defaultMonth={pendingRange?.from}
          selected={pendingRange}
          onSelect={handleRangeSelect}
          numberOfMonths={numberOfMonthsProp ?? (isMobile ? 1 : 2)}
          className="w-full"
          fixedWeeks
          showOutsideDays={false}
          disabled={minDate ? { before: minDate } : undefined}
          fromMonth={minDate}
          classNames={{
            months: "flex gap-0 flex-col md:flex-row relative",
            month: "flex flex-col w-full gap-1 px-4 [&:not(:last-child)]:border-r [&:not(:last-child)]:border-border",
          }}
          initialFocus
        />
        <div className="px-3 pb-2 pt-1 flex gap-4">
          <div className="flex-1">{renderTimeRow("from", fromLabel, fromTime)}</div>
          <div className="flex-1">{renderTimeRow("to", toLabel, toTime)}</div>
        </div>
        <div className="px-3 pb-3 flex items-center justify-between">
          {(hasValue || pendingRange) ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={handleClear}
            >
              Clear
            </Button>
          ) : <div />}
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault()
            }}
            disabled={!canConfirm}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
