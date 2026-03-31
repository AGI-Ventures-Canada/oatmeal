"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

interface MentorRequest {
  id: string
  category: string | null
  description: string | null
  status: string
  created_at: string
}

interface MentorQueuePublicProps {
  slug: string
}

function timeElapsed(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function MentorQueuePublic({ slug }: MentorQueuePublicProps) {
  const [requests, setRequests] = useState<MentorRequest[]>([])
  const [loading, setLoading] = useState(true)
  const abortRef = useRef<AbortController | null>(null)

  const fetchQueue = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(
        `/api/public/hackathons/${slug}/mentor-queue`,
        { signal: controller.signal }
      )
      if (!res.ok) return
      const data = await res.json()
      setRequests(data.requests ?? [])
    } catch (e) {
      if ((e as Error).name === "AbortError") return
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchQueue()
    const id = setInterval(fetchQueue, 10000)
    return () => {
      clearInterval(id)
      abortRef.current?.abort()
    }
  }, [fetchQueue])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        No open requests
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{requests.length} open</Badge>
      </div>
      <div className="space-y-3">
        {requests.map((req) => (
          <Card key={req.id}>
            <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 min-w-0">
                {req.category && (
                  <Badge variant="outline">{req.category}</Badge>
                )}
                {req.description && (
                  <p className="text-sm text-foreground truncate">
                    {req.description}
                  </p>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {timeElapsed(req.created_at)}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
