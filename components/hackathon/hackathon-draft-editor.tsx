"use client"

import { useState, useCallback, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useAuth, useOrganization, useOrganizationList } from "@clerk/nextjs"
import { HackathonPreviewClient } from "@/components/hackathon/preview/hackathon-preview-client"
import { SignInRequiredDialog } from "@/components/sign-in-required-dialog"
import { CreateOrganizationDialog } from "@/components/create-organization-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Plus } from "lucide-react"
import type { PublicHackathon } from "@/lib/services/public-hackathons"

const STORAGE_EXPIRY_MS = 24 * 60 * 60 * 1000

export type DraftSponsor = {
  name: string
  tier: string | null
}

export type DraftPrize = {
  name: string
  description: string | null
  value: string | null
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
  rules: string | null
  prizes: DraftPrize[]
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
    rules: state.rules,
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
    location_latitude: null,
    location_longitude: null,
    require_location_verification: false,
    anonymous_judging: false,
    judging_mode: "points",
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
    judges: [],
    prizes: [],
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
  const { userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  })

  const [state, setState] = useState<DraftState>(() => {
    return loadSavedState(storageKey) ?? initialState
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSignInDialog, setShowSignInDialog] = useState(false)
  const [orgGateOpen, setOrgGateOpen] = useState(false)
  const [createOrgOpen, setCreateOrgOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ state, savedAt: Date.now() }))
  }, [state, storageKey])

  const hackathon = stateToHackathon(state)

  const handleSubmit = useCallback(async () => {
    if (!state.name.trim()) {
      setError("Hackathon name is required")
      return
    }

    if (!isSignedIn) {
      setShowSignInDialog(true)
      return
    }

    if (!organization) {
      setOrgGateOpen(true)
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
      if ("rules" in data) next.rules = data.rules as string | null
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

      <Dialog open={orgGateOpen} onOpenChange={(open) => {
        setOrgGateOpen(open)
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Organization Required</DialogTitle>
            <DialogDescription>
              Hackathons are created under organizations. Switch to an organization or create a new one to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {userMemberships?.data && userMemberships.data.length > 0 && (
              <div className="space-y-1">
                {userMemberships.data.map((mem) => (
                  <Button
                    key={mem.organization.id}
                    variant="ghost"
                    onClick={async () => {
                      await setActive?.({ organization: mem.organization.id })
                      setOrgGateOpen(false)
                    }}
                  >
                    {mem.organization.imageUrl ? (
                      <Image
                        src={mem.organization.imageUrl}
                        alt={mem.organization.name}
                        width={24}
                        height={24}
                        className="size-6 rounded object-cover"
                      />
                    ) : (
                      <div className="flex size-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-semibold">
                        {mem.organization.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span>{mem.organization.name}</span>
                  </Button>
                ))}
              </div>
            )}
            <div className="w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setOrgGateOpen(false)
                  setCreateOrgOpen(true)
                }}
              >
                <Plus className="size-4 mr-2" />
                Create New Organization
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CreateOrganizationDialog
        open={createOrgOpen}
        onOpenChange={setCreateOrgOpen}
      />
    </div>
  )
}
