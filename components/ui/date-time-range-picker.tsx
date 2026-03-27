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

function timeFromDate(date: Date | null): TimeState {
  if (!date) return { hours: "12", minutes: "00", period: "PM" }
  const { hours, period } = to12Hour(date.getHours())
  return {
    hours: hours.toString().padStart(2, "0"),
    minutes: date.getMinutes().toString().padStart(2, "0"),
    period,
  }
}

const DEFAULT_TIME: TimeState = { hours: "12", minutes: "00", period: "PM" }

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
}: DateTimeRangePickerProps) {
  const isMobile = useIsMobile()
  const [open, setOpen] = React.useState(false)

  const [pendingRange, setPendingRange] = React.useState<DateRange | undefined>(
    undefined,
  )
  const [fromTime, setFromTime] = React.useState<TimeState>(DEFAULT_TIME)
  const [toTime, setToTime] = React.useState<TimeState>(DEFAULT_TIME)

  React.useEffect(() => {
    if (open) {
      setPendingRange(
        value?.from
          ? { from: value.from, to: value.to ?? undefined }
          : undefined,
      )
      setFromTime(timeFromDate(value?.from ?? null))
      setToTime(timeFromDate(value?.to ?? null))
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
    setter((prev) => {
      const newTime = { ...prev, [field]: validated }
      const date = target === "from" ? pendingRange?.from : pendingRange?.to
      if (date) {
        setPendingRange((r) =>
          r ? { ...r, [target]: applyTime(date, newTime) } : r,
        )
      }
      return newTime
    })
  }

  function handlePeriodToggle(target: "from" | "to") {
    const setter = target === "from" ? setFromTime : setToTime
    setter((prev) => {
      const newPeriod: "AM" | "PM" = prev.period === "AM" ? "PM" : "AM"
      const newTime = { ...prev, period: newPeriod }
      const date = target === "from" ? pendingRange?.from : pendingRange?.to
      if (date) {
        setPendingRange((r) =>
          r ? { ...r, [target]: applyTime(date, newTime) } : r,
        )
      }
      return newTime
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
    setter((prev) => {
      if (prev.period === newPeriod) return prev
      const newTime = { ...prev, period: newPeriod }
      const date = target === "from" ? pendingRange?.from : pendingRange?.to
      if (date) {
        setPendingRange((r) =>
          r ? { ...r, [target]: applyTime(date, newTime) } : r,
        )
      }
      return newTime
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
      setFromTime(timeFromDate(value?.from ?? null))
      setToTime(timeFromDate(value?.to ?? null))
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
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground w-14 shrink-0">
          {label}:
        </span>
        <Input
          type="text"
          inputMode="numeric"
          aria-label={`${label} hours`}
          value={time.hours}
          onChange={(e) => handleTimeChange(target, "hours", e.target.value)}
          onKeyDown={(e) => handleTimeKeyDown(target, "hours", e)}
          onFocus={(e) => e.target.select()}
          onBlur={() => handleTimeBlur(target, "hours")}
          className="w-14 text-center"
          maxLength={2}
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
        />
        <span className="text-muted-foreground" aria-hidden="true">
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
          className="w-14 text-center"
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
          className="w-14"
          aria-label={`${label} time period: ${time.period}. Press A for AM, P for PM, or arrow keys to toggle`}
          onClick={() => handlePeriodToggle(target)}
          onKeyDown={(e) => handlePeriodKeyDown(target, e)}
        >
          {time.period}
        </Button>
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
        align="start"
        onKeyDown={handlePopoverKeyDown}
      >
        <Calendar
          mode="range"
          defaultMonth={pendingRange?.from}
          selected={pendingRange}
          onSelect={handleRangeSelect}
          numberOfMonths={isMobile ? 1 : 2}
          className="w-full"
          fixedWeeks
          showOutsideDays={false}
          classNames={{
            months: "flex gap-0 flex-col md:flex-row relative",
            month: "flex flex-col w-full gap-4 px-4 [&:not(:last-child)]:border-r [&:not(:last-child)]:border-border",
          }}
          initialFocus
        />
        <div className="border-t p-3 space-y-3">
          {renderTimeRow("from", fromLabel, fromTime)}
          {renderTimeRow("to", toLabel, toTime)}
        </div>
        <div className="border-t p-3 flex items-center justify-between">
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            Done
          </Button>
          {(hasValue || pendingRange) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={handleClear}
            >
              Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
