"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Loader2 } from "lucide-react"
import { SignInRequiredDialog } from "@/components/sign-in-required-dialog"
import { OrgGateDialog } from "@/components/org-gate-dialog"
import {
  type DraftState,
  loadSavedState,
} from "@/components/hackathon/hackathon-draft-editor"
import { addDays } from "date-fns"
import { CreateFlowProgress } from "./create-flow-progress"
import { CreateFlowStep } from "./create-flow-step"
import { StepName } from "./step-name"
import { StepDates } from "./step-dates"
import { StepLocation } from "./step-location"
import { StepDescription } from "./step-description"
import { useCreateFlowKeyboard } from "./use-create-flow-keyboard"

const STORAGE_KEY = "oatmeal:create-from-scratch"
const TOTAL_STEPS = 4

function buildDefaultState(): DraftState {
  const start = addDays(new Date(), 14)
  start.setHours(8, 30, 0, 0)
  const end = addDays(new Date(), 15)
  end.setHours(17, 0, 0, 0)

  return {
    name: "",
    description: null,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    registrationOpensAt: null,
    registrationClosesAt: null,
    locationType: null,
    locationName: null,
    locationUrl: null,
    imageUrl: null,
    sponsors: [],
    rules: null,
    prizes: [],
  }
}

interface CreateFlowProps {
  onSubmit: (state: DraftState) => Promise<{ id: string; slug: string }>
  onPatchSettings?: (
    id: string,
    data: Record<string, unknown>,
  ) => Promise<void>
}

export function CreateFlow({ onSubmit, onPatchSettings }: CreateFlowProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isSignedIn, isLoaded } = useAuth()
  const { organization, isLoaded: isOrgLoaded } = useOrganization()

  const [state, setState] = useState<DraftState>(() => {
    return loadSavedState(STORAGE_KEY) ?? buildDefaultState()
  })
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSignInDialog, setShowSignInDialog] = useState(false)
  const [orgGateOpen, setOrgGateOpen] = useState(false)
  const pendingSubmit = useRef(false)
  const autoTriggeredRef = useRef(false)

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state, savedAt: Date.now() }),
    )
  }, [state])

  useEffect(() => {
    if (!isLoaded || !isOrgLoaded || autoTriggeredRef.current) return
    if (searchParams.get("edit") !== "true") return
    if (!isSignedIn) return

    autoTriggeredRef.current = true

    if (organization) {
      doSubmitRef.current()
    } else {
      pendingSubmit.current = true
      setOrgGateOpen(true)
    }
  }, [isLoaded, isOrgLoaded, isSignedIn, organization, searchParams])

  const canSkip = state.name.trim().length > 0

  const doSubmit = useCallback(async () => {
    if (!state.name.trim()) {
      setError("Hackathon name is required")
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const { id, slug } = await onSubmit(state)

      const hasExtras =
        state.startsAt ||
        state.endsAt ||
        state.locationType ||
        state.locationName ||
        state.locationUrl
      if (hasExtras && onPatchSettings) {
        const patch: Record<string, unknown> = {}
        if (state.startsAt) patch.startsAt = state.startsAt
        if (state.endsAt) patch.endsAt = state.endsAt
        if (state.locationType) patch.locationType = state.locationType
        if (state.locationName) patch.locationName = state.locationName
        if (state.locationUrl) patch.locationUrl = state.locationUrl
        await onPatchSettings(id, patch)
      }

      localStorage.removeItem(STORAGE_KEY)
      router.push(`/e/${slug}/manage`)
    } catch (err) {
      console.error("Failed to create hackathon:", err)
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [state, router, onSubmit, onPatchSettings])

  const doSubmitRef = useRef(doSubmit)
  doSubmitRef.current = doSubmit

  const handleSubmit = useCallback(async () => {
    if (!state.name.trim()) {
      setError("Hackathon name is required")
      setCurrentStep(0)
      return
    }

    if (!isSignedIn) {
      setShowSignInDialog(true)
      return
    }

    if (!organization) {
      pendingSubmit.current = true
      setOrgGateOpen(true)
      return
    }

    await doSubmit()
  }, [state, isSignedIn, organization, doSubmit])

  const goNext = useCallback(() => {
    if (currentStep === 0 && !state.name.trim()) {
      setError("Give your hackathon a name first")
      return
    }
    setError(null)
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((s) => s + 1)
    } else {
      void handleSubmit()
    }
  }, [currentStep, state.name, handleSubmit])

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setError(null)
      setCurrentStep((s) => s - 1)
    }
  }, [currentStep])

  const handleClose = useCallback(() => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push("/home")
    }
  }, [router])

  useCreateFlowKeyboard({
    onNext: goNext,
    onSkip: () => void handleSubmit(),
    onClose: handleClose,
    canSkip,
  })

  const isLastStep = currentStep === TOTAL_STEPS - 1

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background overflow-y-auto">
      <div className="w-full px-4 pt-4 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <CreateFlowProgress
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            canSkip={canSkip}
            onSkip={() => void handleSubmit()}
            onBack={goBack}
            onClose={handleClose}
          />
        </div>
      </div>

      <div className="flex flex-1 items-center px-4 py-8 sm:px-8">
        <div className="mx-auto w-full max-w-2xl">
          <CreateFlowStep stepKey={String(currentStep)}>
            {currentStep === 0 && (
              <StepName
                value={state.name}
                onChange={(name) => {
                  setState((prev) => ({ ...prev, name }))
                  if (error) setError(null)
                }}
              />
            )}
            {currentStep === 1 && (
              <StepDates
                startsAt={state.startsAt}
                endsAt={state.endsAt}
                onChange={(startsAt, endsAt) =>
                  setState((prev) => ({ ...prev, startsAt, endsAt }))
                }
              />
            )}
            {currentStep === 2 && (
              <StepLocation
                locationType={state.locationType}
                locationName={state.locationName}
                locationUrl={state.locationUrl}
                onChange={(data) => setState((prev) => ({ ...prev, ...data }))}
              />
            )}
            {currentStep === 3 && (
              <StepDescription
                value={state.description}
                onChange={(description) =>
                  setState((prev) => ({ ...prev, description }))
                }
              />
            )}
          </CreateFlowStep>

          {error && (
            <p className="mt-4 text-center text-sm text-destructive">{error}</p>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              <Kbd>Enter</Kbd> to continue
            </span>
            <Button
              type="button"
              size="lg"
              onClick={isLastStep ? () => void handleSubmit() : goNext}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isLastStep ? (
                "Create Event"
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </div>
      </div>

      <SignInRequiredDialog
        open={showSignInDialog}
        onOpenChange={setShowSignInDialog}
        description="Your draft has been saved. Sign in to create your hackathon."
        redirectQuery="edit=true"
      />

      <OrgGateDialog
        open={orgGateOpen}
        onOpenChange={(open) => {
          setOrgGateOpen(open)
          if (!open) pendingSubmit.current = false
        }}
        onOrgSelected={() => {
          if (pendingSubmit.current) {
            pendingSubmit.current = false
            doSubmitRef.current()
          }
        }}
      />
    </div>
  )
}
