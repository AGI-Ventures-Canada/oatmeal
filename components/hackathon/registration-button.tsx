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

  async function handleRegister() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/public/hackathons/${hackathonSlug}/register`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to register")
        return
      }

      setIsRegistered(true)
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
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
