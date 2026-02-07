"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateTimePickerProps {
  value?: Date | null
  onChange?: (date: Date | null) => void
  placeholder?: string
  disabled?: boolean
  id?: string
}

function to12Hour(hours24: number): { hours: number; period: "AM" | "PM" } {
  if (hours24 === 0) return { hours: 12, period: "AM" }
  if (hours24 === 12) return { hours: 12, period: "PM" }
  if (hours24 > 12) return { hours: hours24 - 12, period: "PM" }
  return { hours: hours24, period: "AM" }
}

function to24Hour(hours12: number, period: "AM" | "PM"): number {
  if (period === "AM") {
    return hours12 === 12 ? 0 : hours12
  }
  return hours12 === 12 ? 12 : hours12 + 12
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date and time",
  disabled,
  id,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [time, setTime] = React.useState(() => {
    if (value) {
      const { hours, period } = to12Hour(value.getHours())
      return {
        hours: hours.toString().padStart(2, "0"),
        minutes: value.getMinutes().toString().padStart(2, "0"),
        period,
      }
    }
    return { hours: "12", minutes: "00", period: "PM" as const }
  })

  React.useEffect(() => {
    if (value) {
      const { hours, period } = to12Hour(value.getHours())
      setTime({
        hours: hours.toString().padStart(2, "0"),
        minutes: value.getMinutes().toString().padStart(2, "0"),
        period,
      })
    }
  }, [value])

  function handleDateSelect(date: Date | undefined) {
    if (!date) {
      onChange?.(null)
      return
    }

    const hours12 = parseInt(time.hours, 10) || 12
    const hours24 = to24Hour(hours12, time.period)
    const minutes = parseInt(time.minutes, 10) || 0
    const newDate = new Date(date)
    newDate.setHours(hours24, minutes, 0, 0)
    onChange?.(newDate)
  }

  function handleTimeChange(field: "hours" | "minutes", newValue: string) {
    const numValue = newValue.replace(/\D/g, "")
    let validated = numValue

    if (field === "hours") {
      const num = parseInt(numValue, 10)
      if (num > 12) validated = "12"
      else if (num < 1 && numValue.length > 0) validated = "1"
      else if (numValue.length > 2) validated = numValue.slice(0, 2)
    } else {
      const num = parseInt(numValue, 10)
      if (num > 59) validated = "59"
      else if (numValue.length > 2) validated = numValue.slice(0, 2)
    }

    const newTime = { ...time, [field]: validated }
    setTime(newTime)

    if (value) {
      const hours12 = parseInt(field === "hours" ? validated : time.hours, 10) || 12
      const hours24 = to24Hour(hours12, time.period)
      const minutes = parseInt(field === "minutes" ? validated : time.minutes, 10) || 0
      const newDate = new Date(value)
      newDate.setHours(hours24, minutes, 0, 0)
      onChange?.(newDate)
    }
  }

  function handlePeriodToggle() {
    const newPeriod = time.period === "AM" ? "PM" : "AM"
    setTime((prev) => ({ ...prev, period: newPeriod }))

    if (value) {
      const hours12 = parseInt(time.hours, 10) || 12
      const hours24 = to24Hour(hours12, newPeriod)
      const newDate = new Date(value)
      newDate.setHours(hours24, value.getMinutes(), 0, 0)
      onChange?.(newDate)
    }
  }

  function handleTimeBlur(field: "hours" | "minutes") {
    const padded = time[field].padStart(2, "0")
    if (padded !== time[field]) {
      setTime((prev) => ({ ...prev, [field]: padded }))
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP 'at' h:mm a") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={handleDateSelect}
          className="w-full"
          initialFocus
        />
        <div className="border-t p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Time:</span>
            <Input
              type="text"
              inputMode="numeric"
              value={time.hours}
              onChange={(e) => handleTimeChange("hours", e.target.value)}
              onBlur={() => handleTimeBlur("hours")}
              className="w-14 text-center"
              maxLength={2}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
            <span className="text-muted-foreground">:</span>
            <Input
              type="text"
              inputMode="numeric"
              value={time.minutes}
              onChange={(e) => handleTimeChange("minutes", e.target.value)}
              onBlur={() => handleTimeBlur("minutes")}
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
              onClick={handlePeriodToggle}
            >
              {time.period}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
