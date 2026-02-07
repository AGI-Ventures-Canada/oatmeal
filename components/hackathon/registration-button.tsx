"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2, Check, CalendarClock, Lock, Users } from "lucide-react"
import type { HackathonStatus } from "@/lib/db/hackathon-types"

interface RegistrationButtonProps {
  hackathonSlug: string
  status: HackathonStatus
  registrationOpensAt: string | null
  registrationClosesAt: string | null
  maxParticipants: number | null
  participantCount: number
  isRegistered: boolean
}

export function RegistrationButton({
  hackathonSlug,
  status,
  registrationOpensAt,
  registrationClosesAt,
  maxParticipants,
  participantCount,
  isRegistered: initialIsRegistered,
}: RegistrationButtonProps) {
  const { isSignedIn, isLoaded } = useUser()
  const pathname = usePathname()
  const router = useRouter()
  const [isRegistered, setIsRegistered] = useState(initialIsRegistered)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isLoaded) {
    return (
      <Button disabled variant="secondary" size="lg">
        <Loader2 className="size-4 animate-spin" />
        Loading...
      </Button>
    )
  }

  if (!isSignedIn) {
    return (
      <Button asChild size="lg">
        <Link href={`/sign-in?redirect_url=${encodeURIComponent(pathname)}`}>
          Sign in to Register
        </Link>
      </Button>
    )
  }

  if (isRegistered) {
    return (
      <Button disabled variant="secondary" size="lg">
        <Check className="size-4" />
        Registered
      </Button>
    )
  }

  const now = new Date()
  const opensAt = registrationOpensAt ? new Date(registrationOpensAt) : null
  const closesAt = registrationClosesAt ? new Date(registrationClosesAt) : null

  if (status === "draft" || status === "archived") {
    return (
      <Button disabled variant="secondary" size="lg">
        <Lock className="size-4" />
        Registration Not Available
      </Button>
    )
  }

  if (opensAt && closesAt) {
    if (now < opensAt) {
      return (
        <Button disabled variant="secondary" size="lg">
          <CalendarClock className="size-4" />
          Opens {opensAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </Button>
      )
    }
    if (now > closesAt) {
      return (
        <Button disabled variant="secondary" size="lg">
          <Lock className="size-4" />
          Registration Closed
        </Button>
      )
    }
  } else if (status !== "registration_open" && status !== "active") {
    if (status === "published") {
      return (
        <Button disabled variant="secondary" size="lg">
          <CalendarClock className="size-4" />
          Registration Coming Soon
        </Button>
      )
    }
    return (
      <Button disabled variant="secondary" size="lg">
        <Lock className="size-4" />
        Registration Closed
      </Button>
    )
  }

  if (maxParticipants && participantCount >= maxParticipants) {
    return (
      <Button disabled variant="secondary" size="lg">
        <Users className="size-4" />
        Event Full
      </Button>
    )
  }

  function getErrorMessage(code: string, fallback: string): string {
    const errorMessages: Record<string, string> = {
      not_authenticated: "Please sign in to register.",
      hackathon_not_found: "This hackathon no longer exists.",
      already_registered: "You're already registered for this event.",
      registration_not_open: "Registration is not currently open.",
      registration_closed: "Registration has closed.",
      at_capacity: "This event has reached maximum capacity.",
    }
    return errorMessages[code] || fallback
  }

  async function handleRegister() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/public/hackathons/${hackathonSlug}/register`, {
        method: "POST",
      })

      let data
      try {
        data = await response.json()
      } catch {
        setError("Unable to process response. Please try again.")
        return
      }

      if (!response.ok) {
        setError(getErrorMessage(data.code, data.error || "Failed to register"))
        return
      }

      setIsRegistered(true)
      router.refresh()
    } catch (err) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("Network error. Please check your connection and try again.")
      } else {
        setError("An unexpected error occurred. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleRegister} disabled={isLoading} size="lg">
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Registering...
          </>
        ) : (
          "Register to Attend"
        )}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
