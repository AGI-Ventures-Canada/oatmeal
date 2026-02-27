"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

const PROGRESS_MESSAGES = [
  "Visiting the event page...",
  "Reading event details...",
  "Extracting sponsors and prizes...",
  "Polishing the details...",
  "Almost ready...",
]

const MESSAGE_INTERVAL_MS = 1500

export default function LumaImportLoading() {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    if (messageIndex >= PROGRESS_MESSAGES.length - 1) return

    const timer = setTimeout(() => {
      setMessageIndex((prev) => prev + 1)
    }, MESSAGE_INTERVAL_MS)

    return () => clearTimeout(timer)
  }, [messageIndex])

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
        <p className="text-sm font-medium text-foreground transition-opacity duration-300">
          {PROGRESS_MESSAGES[messageIndex]}
        </p>
      </div>
    </div>
  )
}
