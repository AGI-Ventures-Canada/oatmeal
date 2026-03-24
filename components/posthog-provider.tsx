"use client"

import posthog from "posthog-js"
import { PostHogProvider as PHProvider } from "posthog-js/react"
import { useEffect, useState } from "react"
import { useAuth, useUser } from "@clerk/nextjs"

function PostHogIdentifier() {
  const { userId } = useAuth()
  const { user } = useUser()

  useEffect(() => {
    if (userId && user) {
      posthog.identify(userId, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
      })
    } else if (!userId) {
      posthog.reset()
    }
  }, [userId, user])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY

  useEffect(() => {
    if (!key) return

    posthog.init(key, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
      loaded: () => setReady(true),
    })
  }, [key])

  if (!key || !ready) return <>{children}</>

  return (
    <PHProvider client={posthog}>
      <PostHogIdentifier />
      {children}
    </PHProvider>
  )
}
