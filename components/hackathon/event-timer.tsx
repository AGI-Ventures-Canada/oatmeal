"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface EventTimerProps {
  endsAt: string
  label?: string
  className?: string
  size?: "sm" | "md" | "lg"
  onExpired?: () => void
}

function formatDuration(ms: number): { text: string; urgent: boolean } {
  if (ms <= 0) return { text: "Time's up!", urgent: true }

  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (n: number) => n.toString().padStart(2, "0")
  const urgent = totalSeconds <= 300

  if (days > 0) {
    return { text: `${days}d ${hours}h ${pad(minutes)}m ${pad(seconds)}s`, urgent }
  }
  if (hours > 0) {
    return { text: `${hours}:${pad(minutes)}:${pad(seconds)}`, urgent }
  }
  return { text: `${pad(minutes)}:${pad(seconds)}`, urgent }
}

export function EventTimer({
  endsAt,
  label,
  className,
  size = "md",
  onExpired,
}: EventTimerProps) {
  const [remaining, setRemaining] = useState(() => {
    return Math.max(0, new Date(endsAt).getTime() - Date.now())
  })
  const expiredRef = useRef(false)

  useEffect(() => {
    function tick() {
      const ms = Math.max(0, new Date(endsAt).getTime() - Date.now())
      setRemaining(ms)
      if (ms <= 0 && !expiredRef.current) {
        expiredRef.current = true
        onExpired?.()
      }
    }

    tick()
    const isUrgent = remaining <= 300000
    const interval = setInterval(tick, isUrgent ? 1000 : 1000)
    return () => clearInterval(interval)
  }, [endsAt, onExpired, remaining])

  const { text, urgent } = formatDuration(remaining)

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      {label && (
        <span
          className={cn(
            "text-muted-foreground",
            size === "sm" && "text-xs",
            size === "md" && "text-sm",
            size === "lg" && "text-base",
          )}
        >
          {label}
        </span>
      )}
      <span
        className={cn(
          "font-mono font-bold tabular-nums",
          size === "sm" && "text-lg",
          size === "md" && "text-3xl",
          size === "lg" && "text-6xl",
          urgent ? "text-destructive" : "text-foreground",
          remaining <= 0 && "animate-pulse",
        )}
      >
        {text}
      </span>
    </div>
  )
}
