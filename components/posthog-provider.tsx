"use client"

import posthog from "posthog-js"
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react"
import { useEffect } from "react"
import { useAuth, useUser } from "@clerk/nextjs"

function PostHogIdentifier() {
  const { userId } = useAuth()
  const { user } = useUser()
  const ph = usePostHog()

  useEffect(() => {
    if (userId && user) {
      ph.identify(userId, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
      })
    } else if (!userId) {
      ph.reset()
    }
  }, [ph, userId, user])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY

  useEffect(() => {
    if (!key) return
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
    })
  }, [key])

  if (!key) return <>{children}</>

  return (
    <PHProvider client={posthog}>
      <PostHogIdentifier />
      {children}
    </PHProvider>
  )
}
