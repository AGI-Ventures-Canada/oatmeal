"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateTimePickerProps {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
}

function to12Hour(hours24: number): { hours: number; period: "AM" | "PM" } {
  if (hours24 === 0) return { hours: 12, period: "AM" };
  if (hours24 === 12) return { hours: 12, period: "PM" };
  if (hours24 > 12) return { hours: hours24 - 12, period: "PM" };
  return { hours: hours24, period: "AM" };
}

function to24Hour(hours12: number, period: "AM" | "PM"): number {
  if (period === "AM") {
    return hours12 === 12 ? 0 : hours12;
  }
  return hours12 === 12 ? 12 : hours12 + 12;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date and time",
  disabled,
  id,
  name,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [time, setTime] = React.useState(() => {
    if (value) {
      const { hours, period } = to12Hour(value.getHours());
      return {
        hours: hours.toString().padStart(2, "0"),
        minutes: value.getMinutes().toString().padStart(2, "0"),
        period,
      };
    }
    return { hours: "12", minutes: "00", period: "PM" as const };
  });

  React.useEffect(() => {
    if (value) {
      const { hours, period } = to12Hour(value.getHours());
      setTime({
        hours: hours.toString().padStart(2, "0"),
        minutes: value.getMinutes().toString().padStart(2, "0"),
        period,
      });
    }
  }, [value]);

  function handleDateSelect(date: Date | undefined) {
    if (!date) {
      onChange?.(null);
      return;
    }

    const hours12 = parseInt(time.hours, 10) || 12;
    const hours24 = to24Hour(hours12, time.period);
    const minutes = parseInt(time.minutes, 10) || 0;
    const newDate = new Date(date);
    newDate.setHours(hours24, minutes, 0, 0);
    onChange?.(newDate);
  }

  function handleTimeChange(field: "hours" | "minutes", newValue: string) {
    const numValue = newValue.replace(/\D/g, "");
    let validated = numValue.length > 2 ? numValue.slice(-2) : numValue;

    if (field === "hours") {
      const num = parseInt(validated, 10);
      if (num > 12) validated = "12";
      else if (num < 1 && validated.length === 2) validated = "01";
    } else {
      const num = parseInt(validated, 10);
      if (num > 59) validated = "59";
    }

    const newTime = { ...time, [field]: validated };
    setTime(newTime);

    if (value) {
      const hours12 =
        parseInt(field === "hours" ? validated : time.hours, 10) || 12;
      const hours24 = to24Hour(hours12, time.period);
      const minutes =
        parseInt(field === "minutes" ? validated : time.minutes, 10) || 0;
      const newDate = new Date(value);
      newDate.setHours(hours24, minutes, 0, 0);
      onChange?.(newDate);
    }
  }

  function updatePeriod(newPeriod: "AM" | "PM") {
    if (time.period === newPeriod) return;
    if (value) {
      const hours12 = parseInt(time.hours, 10) || 12;
      const hours24 = to24Hour(hours12, newPeriod);
      const newDate = new Date(value);
      newDate.setHours(hours24, value.getMinutes(), 0, 0);
      onChange?.(newDate);
    }
    setTime((prev) => ({ ...prev, period: newPeriod }));
  }

  function handlePeriodToggle() {
    const newPeriod = time.period === "AM" ? "PM" : "AM";
    if (value) {
      const hours12 = parseInt(time.hours, 10) || 12;
      const hours24 = to24Hour(hours12, newPeriod);
      const newDate = new Date(value);
      newDate.setHours(hours24, value.getMinutes(), 0, 0);
      onChange?.(newDate);
    }
    setTime((prev) => ({ ...prev, period: newPeriod }));
  }

  function handlePeriodKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      handlePeriodToggle();
    } else if (e.key.toLowerCase() === "a") {
      e.preventDefault();
      updatePeriod("AM");
    } else if (e.key.toLowerCase() === "p") {
      e.preventDefault();
      updatePeriod("PM");
    }
  }

  function handleTimeBlur(field: "hours" | "minutes") {
    const padded = time[field].padStart(2, "0");
    if (padded !== time[field]) {
      setTime((prev) => ({ ...prev, [field]: padded }));
    }
  }

  function handleTimeKeyDown(
    field: "hours" | "minutes",
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (!/^\d$/.test(e.key)) return;

    e.preventDefault();
    const { selectionStart, selectionEnd } = e.currentTarget;
    const currentVal = time[field];

    let newVal: string;
    if (selectionStart !== selectionEnd) {
      newVal =
        currentVal.slice(0, selectionStart ?? 0) +
        e.key +
        currentVal.slice(selectionEnd ?? 0);
    } else {
      const pos = selectionStart ?? currentVal.length;
      newVal = currentVal.slice(0, pos) + e.key + currentVal.slice(pos);
    }

    handleTimeChange(field, newVal);
  }

  return (
    <>
      {name && (
        <input type="hidden" name={name} value={value?.toISOString() ?? ""} />
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              className,
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
              aria-label="Hours"
              value={time.hours}
              onChange={(e) => handleTimeChange("hours", e.target.value)}
              onKeyDown={(e) => handleTimeKeyDown("hours", e)}
              onFocus={(e) => e.target.select()}
              onBlur={() => handleTimeBlur("hours")}
              className="w-14 text-center"
              maxLength={2}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
            <span className="text-muted-foreground" aria-hidden="true">:</span>
            <Input
              type="text"
              inputMode="numeric"
              aria-label="Minutes"
              value={time.minutes}
              onChange={(e) => handleTimeChange("minutes", e.target.value)}
              onKeyDown={(e) => handleTimeKeyDown("minutes", e)}
              onFocus={(e) => e.target.select()}
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
              aria-label={`Time period: ${time.period}. Press A for AM, P for PM, or arrow keys to toggle`}
              onClick={handlePeriodToggle}
              onKeyDown={handlePeriodKeyDown}
            >
              {time.period}
            </Button>
          </div>
        </div>
      </PopoverContent>
      </Popover>
    </>
  );
}
