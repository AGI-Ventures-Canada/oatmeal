"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

interface AutoRefreshProps {
  enabled?: boolean
}

function getRandomInterval() {
  return 2500 + Math.random() * 1000
}

export function AutoRefresh({ enabled = true }: AutoRefreshProps) {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    if (!enabled) return

    mountedRef.current = true

    const stopPolling = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    const scheduleRefresh = () => {
      stopPolling()
      timeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return
        router.refresh()
        scheduleRefresh()
      }, getRandomInterval())
    }

    const handleVisibilityChange = () => {
      if (!mountedRef.current) return
      if (document.hidden) {
        stopPolling()
      } else {
        router.refresh()
        scheduleRefresh()
      }
    }

    scheduleRefresh()
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      mountedRef.current = false
      stopPolling()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [router, enabled])

  return null
}
