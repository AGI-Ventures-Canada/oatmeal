"use client"

import posthog from "posthog-js"
import { PostHogProvider as PHProvider } from "posthog-js/react"
import { useEffect } from "react"
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
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return <>{children}</>

  return (
    <PHProvider client={posthog}>
      <PostHogIdentifier />
      {children}
    </PHProvider>
  )
}
