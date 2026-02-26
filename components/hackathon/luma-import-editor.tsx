"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { HackathonPreviewClient } from "@/components/hackathon/preview/hackathon-preview-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import type { LumaEventData } from "@/lib/services/luma-import"
import type { PublicHackathon } from "@/lib/services/public-hackathons"

const STORAGE_KEY = "oatmeal:luma-import"
const STORAGE_EXPIRY_MS = 24 * 60 * 60 * 1000

type OrganizerInfo = {
  id: string
  name: string
  slug: string | null
  logo_url: string | null
  logo_url_dark: string | null
  clerk_org_id: string
}

type LumaImportEditorProps = {
  eventData: LumaEventData
  lumaSlug: string
  organizer: OrganizerInfo | null
}

type LocalState = {
  name: string
  description: string | null
  startsAt: string | null
  endsAt: string | null
  registrationOpensAt: string | null
  registrationClosesAt: string | null
  locationType: "in_person" | "virtual" | null
  locationName: string | null
  locationUrl: string | null
  imageUrl: string | null
}

function eventDataToState(eventData: LumaEventData): LocalState {
  return {
    name: eventData.name,
    description: eventData.description,
    startsAt: eventData.startsAt,
    endsAt: eventData.endsAt,
    registrationOpensAt: null,
    registrationClosesAt: null,
    locationType: eventData.locationType,
    locationName: eventData.locationName,
    locationUrl: eventData.locationUrl,
    imageUrl: eventData.imageUrl,
  }
}

const PLACEHOLDER_ORGANIZER: PublicHackathon["organizer"] = {
  id: "",
  name: "Your Organization",
  slug: null,
  logo_url: null,
  logo_url_dark: null,
  clerk_org_id: "",
}

function stateToHackathon(state: LocalState, organizer: OrganizerInfo | null): PublicHackathon {
  return {
    id: "luma-import",
    tenant_id: "",
    name: state.name,
    slug: "",
    description: state.description,
    rules: null,
    starts_at: state.startsAt,
    ends_at: state.endsAt,
    registration_opens_at: state.registrationOpensAt,
    registration_closes_at: state.registrationClosesAt,
    max_participants: null,
    min_team_size: 1,
    max_team_size: 5,
    allow_solo: true,
    status: "draft",
    banner_url: state.imageUrl,
    location_type: state.locationType,
    location_name: state.locationName,
    location_url: state.locationUrl,
    anonymous_judging: false,
    results_published_at: null,
    winner_emails_sent_at: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    organizer: organizer ?? PLACEHOLDER_ORGANIZER,
    sponsors: [],
  }
}

function loadSavedState(): LocalState | null {
  if (typeof window === "undefined") return null
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return null
  try {
    const parsed = JSON.parse(saved)
    if (Date.now() - parsed.savedAt >= STORAGE_EXPIRY_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed.state ?? null
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function shouldAutoSubmitOnMount(isSignedIn: boolean | undefined, hasOrg: boolean): boolean {
  if (typeof window === "undefined") return false
  if (!isSignedIn || !hasOrg) return false
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return false
  try {
    const parsed = JSON.parse(saved)
    return Date.now() - parsed.savedAt < STORAGE_EXPIRY_MS
  } catch {
    return false
  }
}

export function LumaImportEditor({ eventData, lumaSlug, organizer }: LumaImportEditorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isSignedIn } = useAuth()
  const { organization } = useOrganization()
  const autoSubmitTriggered = useRef(false)

  const autoSubmit = shouldAutoSubmitOnMount(isSignedIn, !!organization)

  const [state, setState] = useState<LocalState>(() => {
    return loadSavedState() ?? eventDataToState(eventData)
  })
  const [isSubmitting, setIsSubmitting] = useState(autoSubmit)
  const [error, setError] = useState<string | null>(null)

  const hackathon = stateToHackathon(state, organizer)

  const handleSubmit = useCallback(async () => {
    if (!state.name.trim()) {
      setError("Hackathon name is required")
      return
    }

    if (!isSignedIn || !organization) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, savedAt: Date.now() }))
      router.push(`/sign-in?redirect_url=${pathname}`)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/dashboard/import/luma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.name,
          description: state.description,
          startsAt: state.startsAt,
          endsAt: state.endsAt,
          locationType: state.locationType,
          locationName: state.locationName,
          locationUrl: state.locationUrl,
          imageUrl: state.imageUrl,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to create hackathon")
        return
      }

      const { slug } = await res.json()
      localStorage.removeItem(STORAGE_KEY)
      router.push(`/e/${slug}/manage`)
    } catch (err) {
      console.error("Failed to create hackathon from Luma import:", err)
      setError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }, [state, isSignedIn, organization, router, pathname])

  useEffect(() => {
    if (!autoSubmit) return
    if (autoSubmitTriggered.current) return
    autoSubmitTriggered.current = true
    handleSubmit()
  }, [autoSubmit, handleSubmit])

  const handleFormSave = useCallback(async (data: Record<string, unknown>) => {
    setState(prev => {
      const next = { ...prev }
      if ("name" in data) next.name = data.name as string
      if ("description" in data) next.description = data.description as string | null
      if ("startsAt" in data) next.startsAt = data.startsAt as string | null
      if ("endsAt" in data) next.endsAt = data.endsAt as string | null
      if ("registrationOpensAt" in data) next.registrationOpensAt = data.registrationOpensAt as string | null
      if ("registrationClosesAt" in data) next.registrationClosesAt = data.registrationClosesAt as string | null
      if ("locationType" in data) next.locationType = data.locationType as LocalState["locationType"]
      if ("locationName" in data) next.locationName = data.locationName as string | null
      if ("locationUrl" in data) next.locationUrl = data.locationUrl as string | null
      return next
    })
    return true
  }, [])

  if (isSubmitting) {
    return (
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground mb-4" />
            <CardTitle className="mb-2">Creating your hackathon...</CardTitle>
            <CardDescription>
              Importing from <span className="font-mono text-xs">luma.com/{lumaSlug}</span>
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <HackathonPreviewClient
        hackathon={hackathon}
        isEditable={true}
        onFormSave={handleFormSave}
        excludeSections={["sponsors", "rules"]}
      />
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full shadow-xl bg-background backdrop-blur px-2 py-1.5">
        <span className="text-xs text-muted-foreground pl-3 hidden sm:inline">
          luma.com/{lumaSlug}
        </span>
        {error && (
          <span className="text-xs text-destructive">{error}</span>
        )}
        <Button
          className="rounded-full px-4 py-2"
          onClick={handleSubmit}
          disabled={isSubmitting || !state.name.trim()}
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : !isSignedIn ? (
            "Sign in & Create"
          ) : (
            "Create Hackathon"
          )}
        </Button>
      </div>
    </div>
  )
}
