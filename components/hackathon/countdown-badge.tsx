"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"

export function CountdownBadge({ startsAt }: { startsAt: string }) {
  const [timeLeft, setTimeLeft] = useState("")

  useEffect(() => {
    function updateCountdown() {
      const now = new Date()
      const start = new Date(startsAt)
      const diff = start.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft("Starting now")
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      if (days > 0) {
        setTimeLeft(`Starts in ${days}d ${hours}h`)
      } else if (hours > 0) {
        setTimeLeft(`Starts in ${hours}h ${minutes}m`)
      } else {
        setTimeLeft(`Starts in ${minutes}m`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 60000)
    return () => clearInterval(interval)
  }, [startsAt])

  return <Badge variant="default">{timeLeft}</Badge>
}
