"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, TriangleAlert } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

const MIDDLE_MESSAGES = [
  "Reading event details...",
  "Scanning for dates and location...",
  "Extracting sponsors and prizes...",
  "Parsing event rules and guidelines...",
  "Analyzing event categories...",
  "Mapping registration details...",
  "Gathering speaker information...",
  "Processing cover images...",
  "Formatting event description...",
  "Assembling your hackathon...",
  "Setting up the dashboard...",
  "Running final checks...",
  "Polishing the details...",
]

const DELAYS = [1500, 2000, 2500, 3000, 3000, 3500, 3500, 4000, 4000, 4000, 4500, 4500, 5000, 5000, 0]

function buildMessages() {
  const shuffled = [...MIDDLE_MESSAGES]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const texts = ["Visiting the event page...", ...shuffled, "Almost ready..."]
  return texts.map((text, i) => ({ text, delay: DELAYS[i] }))
}

const JITTER_MS = 600
const TIMEOUT_MS = 60_000

export default function LumaImportLoading() {
  const [messages] = useState(buildMessages)
  const [messageIndex, setMessageIndex] = useState(0)
  const [isFading, setIsFading] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (messageIndex >= messages.length - 1) return

    const baseDelay = messages[messageIndex].delay
    const jitter = Math.floor(Math.random() * JITTER_MS * 2) - JITTER_MS
    const timer = setTimeout(() => {
      setIsFading(true)
      setTimeout(() => {
        setMessageIndex((prev) => prev + 1)
        setIsFading(false)
      }, 200)
    }, baseDelay + jitter)

    return () => clearTimeout(timer)
  }, [messageIndex])

  const handleReload = useCallback(() => {
    window.location.reload()
  }, [])

  if (timedOut) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="flex flex-col items-center gap-4">
          <TriangleAlert className="size-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">This is taking longer than expected</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            The Luma event page may be slow to respond, or the URL might not point to a valid event.
            You can try again or double-check the link.
          </p>
          <Button onClick={handleReload}>Try again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative mx-auto max-w-4xl px-4 py-8">
      <div className="opacity-30">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="order-2 md:order-1 flex flex-col gap-4">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-10 w-3/4" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="order-1 md:order-2">
            <Skeleton className="aspect-square w-full rounded-xl" />
          </div>
        </div>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-6 animate-spin text-foreground" />
        <p
          className="text-sm font-medium text-foreground transition-opacity duration-200"
          style={{ opacity: isFading ? 0 : 1 }}
        >
          {messages[messageIndex].text}
        </p>
      </div>
    </div>
  )
}
