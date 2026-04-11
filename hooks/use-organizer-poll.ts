"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { OrganizerPollResponse } from "@/lib/services/organizer-polling"

interface UseOrganizerPollOptions {
  interval?: number
  enabled?: boolean
}

export function useOrganizerPoll(
  hackathonId: string,
  options?: UseOrganizerPollOptions
) {
  const { interval = 10000, enabled = true } = options ?? {}
  const [data, setData] = useState<OrganizerPollResponse | null>(null)
  const [isStale, setIsStale] = useState(false)
  const failCountRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  const poll = useCallback(async () => {
    if (document.hidden) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/action-items-poll`, {
        signal: controller.signal,
      })
      if (!res.ok) {
        failCountRef.current++
        if (failCountRef.current >= 3) setIsStale(true)
        return
      }
      const payload: OrganizerPollResponse = await res.json()
      setData(payload)
      setIsStale(false)
      failCountRef.current = 0
    } catch (e) {
      if ((e as Error).name === "AbortError") return
      failCountRef.current++
      if (failCountRef.current >= 3) setIsStale(true)
    }
  }, [hackathonId])

  useEffect(() => {
    if (!enabled) return

    const initialPoll = setTimeout(poll, 0)
    const id = setInterval(poll, interval)

    const onVisibilityChange = () => {
      if (!document.hidden) poll()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      clearTimeout(initialPoll)
      clearInterval(id)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      abortRef.current?.abort()
    }
  }, [poll, interval, enabled])

  const refresh = useCallback(() => { poll() }, [poll])

  return { data, isStale, refresh }
}
