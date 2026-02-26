"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { HackathonPreviewClient } from "@/components/hackathon/preview/hackathon-preview-client"
import { SignInRequiredDialog } from "@/components/sign-in-required-dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import type { PublicHackathon } from "@/lib/services/public-hackathons"

const STORAGE_EXPIRY_MS = 24 * 60 * 60 * 1000

export type DraftSponsor = {
  name: string
  tier: string | null
}

export type DraftState = {
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
  sponsors: DraftSponsor[]
}

type HackathonDraftEditorProps = {
  initialState: DraftState
  storageKey: string
  onSubmit: (state: DraftState) => Promise<{ slug: string }>
  sourceLabel?: string
  signInDescription?: string
}

const PLACEHOLDER_ORGANIZER: PublicHackathon["organizer"] = {
  id: "",
  name: "Your Organization",
  slug: null,
  logo_url: null,
  logo_url_dark: null,
  clerk_org_id: "",
}

function stateToHackathon(state: DraftState): PublicHackathon {
  return {
    id: "draft",
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
    organizer: PLACEHOLDER_ORGANIZER,
    sponsors: state.sponsors.map((s, i) => ({
      id: `draft-${i}`,
      hackathon_id: "draft",
      sponsor_tenant_id: null,
      tenant_sponsor_id: null,
      name: s.name,
      logo_url: null,
      logo_url_dark: null,
      website_url: null,
      tier: (s.tier ?? "none") as "none" | "gold" | "silver" | "bronze",
      display_order: i,
      created_at: new Date().toISOString(),
    })),
  }
}

function loadSavedState(storageKey: string): DraftState | null {
  if (typeof window === "undefined") return null
  const saved = localStorage.getItem(storageKey)
  if (!saved) return null
  try {
    const parsed = JSON.parse(saved)
    if (Date.now() - parsed.savedAt >= STORAGE_EXPIRY_MS) {
      localStorage.removeItem(storageKey)
      return null
    }
    return parsed.state ?? null
  } catch {
    localStorage.removeItem(storageKey)
    return null
  }
}

export function HackathonDraftEditor({
  initialState,
  storageKey,
  onSubmit,
  sourceLabel,
  signInDescription = "Your edits have been saved. Sign in to continue.",
}: HackathonDraftEditorProps) {
  const router = useRouter()
  const { isSignedIn } = useAuth()
  const { organization } = useOrganization()

  const [state, setState] = useState<DraftState>(() => {
    return loadSavedState(storageKey) ?? initialState
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSignInDialog, setShowSignInDialog] = useState(false)

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ state, savedAt: Date.now() }))
  }, [state, storageKey])

  const hackathon = stateToHackathon(state)

  const handleSubmit = useCallback(async () => {
    if (!state.name.trim()) {
      setError("Hackathon name is required")
      return
    }

    if (!isSignedIn || !organization) {
      setShowSignInDialog(true)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const { slug } = await onSubmit(state)
      localStorage.removeItem(storageKey)
      router.push(`/e/${slug}/manage`)
    } catch (err) {
      console.error("Failed to create hackathon:", err)
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }, [state, isSignedIn, organization, router, storageKey, onSubmit])

  const handleFormSave = useCallback(async (data: Record<string, unknown>) => {
    setState(prev => {
      const next = { ...prev }
      if ("name" in data) next.name = data.name as string
      if ("description" in data) next.description = data.description as string | null
      if ("startsAt" in data) next.startsAt = data.startsAt as string | null
      if ("endsAt" in data) next.endsAt = data.endsAt as string | null
      if ("registrationOpensAt" in data) next.registrationOpensAt = data.registrationOpensAt as string | null
      if ("registrationClosesAt" in data) next.registrationClosesAt = data.registrationClosesAt as string | null
      if ("locationType" in data) next.locationType = data.locationType as DraftState["locationType"]
      if ("locationName" in data) next.locationName = data.locationName as string | null
      if ("locationUrl" in data) next.locationUrl = data.locationUrl as string | null
      if ("sponsors" in data) next.sponsors = data.sponsors as DraftSponsor[]
      return next
    })
    return true
  }, [])

  return (
    <div>
      <HackathonPreviewClient
        hackathon={hackathon}
        isEditable={true}
        onFormSave={handleFormSave}
        onAuthRequired={!isSignedIn ? () => setShowSignInDialog(true) : undefined}
      />
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full shadow-xl bg-background backdrop-blur px-2 py-1.5">
        {sourceLabel && (
          <span className="text-xs text-muted-foreground pl-3 hidden sm:inline">
            {sourceLabel}
          </span>
        )}
        {error && (
          <span className="text-xs text-destructive">{error}</span>
        )}
        <Button
          size="lg"
          className="rounded-full px-6 text-base"
          onClick={handleSubmit}
          disabled={isSubmitting || !state.name.trim()}
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Create Hackathon"
          )}
        </Button>
      </div>
      <SignInRequiredDialog
        open={showSignInDialog}
        onOpenChange={setShowSignInDialog}
        description={signInDescription}
        redirectQuery="edit=true"
      />
    </div>
  )
}
