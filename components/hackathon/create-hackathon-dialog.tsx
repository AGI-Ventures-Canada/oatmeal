"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Globe, Loader2, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SteppedDialogContent } from "@/components/ui/stepped-dialog-content"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  normalizeUrl,
  normalizeUrlFieldValue,
  urlInputProps,
} from "@/lib/utils/url"

type CreateHackathonDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialMethod?: "scratch" | "external" | null
  onAuthRequired?: () => void
}

type CreateHackathonMethod = "scratch" | "external" | null

function resolveExternalImportPath(input: string): string | null {
  try {
    const normalizedUrl = normalizeUrl(input)
    const url = new URL(normalizedUrl)

    if (
      url.hostname === "luma.com" ||
      url.hostname === "www.luma.com" ||
      url.hostname === "lu.ma" ||
      url.hostname === "www.lu.ma"
    ) {
      const path = url.pathname.replace(/^\/+/, "")
      return path ? `/luma.com/${path}?edit=true` : null
    }

    return `/import?url=${encodeURIComponent(normalizedUrl)}`
  } catch {
    return null
  }
}

export function CreateHackathonDialog({
  open,
  onOpenChange,
  initialMethod = null,
  onAuthRequired,
}: CreateHackathonDialogProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [method, setMethod] = useState<CreateHackathonMethod>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [externalUrl, setExternalUrl] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setCurrentStep(0)
    setMethod(initialMethod ?? null)
    setName("")
    setDescription("")
    setExternalUrl("")
    setError(null)
    setIsSubmitting(false)
  }, [open, initialMethod])

  const externalImportPath = resolveExternalImportPath(externalUrl)

  const flowSteps = method === "external"
    ? [
        {
          key: "event-page",
          label: "Event Page",
          complete: !!externalImportPath,
          stateLabel: externalImportPath ? "Ready" : "Add URL",
        },
      ]
    : [
        {
          key: "basics",
          label: "Basics",
          complete: currentStep > 0 || name.trim().length > 0,
          stateLabel: name.trim() ? "Ready" : "Add name",
        },
        {
          key: "details",
          label: "Description",
          complete: description.trim().length > 0,
          stateLabel: description.trim() ? "Added" : "Optional",
        },
      ]

  function validateFlowStep(stepIndex = currentStep): string | null {
    if (method === "scratch" && stepIndex === 0 && !name.trim()) {
      return "Hackathon name is required"
    }

    if (method === "external" && stepIndex === 0) {
      if (!externalUrl.trim()) {
        return "Event page URL is required"
      }

      if (!externalImportPath) {
        return "We couldn't import that event page yet. Paste a public event page from a supported source."
      }
    }

    return null
  }

  function handleStepChange(stepIndex: number) {
    if (stepIndex > currentStep) {
      const validationError = validateFlowStep(currentStep)
      if (validationError) {
        setError(validationError)
        return
      }
    }

    setError(null)
    setCurrentStep(stepIndex)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !isSubmitting) {
      e.preventDefault()
      void handleSubmit(e as unknown as React.FormEvent)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setError(null)
    }

    onOpenChange(nextOpen)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setIsSubmitting(true)
    setError(null)

    try {
      if (method === "external") {
        if (!externalImportPath) {
          setError("We couldn't import that event page yet. Paste a public event page from a supported source.")
          return
        }

        router.push(externalImportPath)
        return
      }

      if (onAuthRequired) {
        onAuthRequired()
        return
      }

      const response = await fetch("/api/dashboard/hackathons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to create hackathon")
      }

      const data = await response.json()
      handleOpenChange(false)
      router.push(`/e/${data.slug}/manage`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create hackathon")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {method === null ? (
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Hackathon</DialogTitle>
            <DialogDescription>Choose a starting point.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="h-auto w-full min-w-0 whitespace-normal flex-col items-start gap-1.5 py-3"
                onClick={() => {
                  setMethod("scratch")
                  setCurrentStep(0)
                  setError(null)
                }}
              >
                <span className="flex items-center gap-2 text-sm">
                  <Plus className="size-4" />
                  <span>From scratch</span>
                </span>
                <span className="whitespace-normal text-left text-xs text-muted-foreground">
                  Start blank and add details as you go.
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-auto w-full min-w-0 whitespace-normal flex-col items-start gap-1.5 py-3"
                onClick={() => {
                  setMethod("external")
                  setCurrentStep(0)
                  setError(null)
                }}
              >
                <span className="flex items-center gap-2 text-sm">
                  <Globe className="size-4" />
                  <span>From external event page</span>
                </span>
                <span className="whitespace-normal text-left text-xs text-muted-foreground">
                  Import published details and keep editing here.
                </span>
              </Button>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      ) : (
        <SteppedDialogContent
          className="max-w-xl"
          currentStep={currentStep}
          description={
            method === "external"
              ? "Paste the event page URL to open the import generator."
              : "Set up the basics, then add any context participants should see."
          }
          onStepChange={handleStepChange}
          steps={flowSteps}
          stepsLayout="timeline"
          title={method === "external" ? "Import Hackathon" : "Create Hackathon"}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault()

              const validationError = validateFlowStep()
              if (validationError) {
                setError(validationError)
                return
              }

              if (currentStep < flowSteps.length - 1) {
                setError(null)
                setCurrentStep((step) => step + 1)
                return
              }

              await handleSubmit(e)
            }}
            onKeyDown={handleKeyDown}
            className="w-full space-y-4"
            autoComplete="off"
          >
            {method === "scratch" && currentStep === 0 && (
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="hackathon-name">Hackathon Name</FieldLabel>
                  <Input
                    id="hackathon-name"
                    name="hackathon-name"
                    type="text"
                    placeholder="My Awesome Hackathon"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      setError(null)
                    }}
                    required
                    autoFocus
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                  />
                  <FieldDescription>
                    Start with a clear title. You can refine the rest after creation.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            )}

            {method === "scratch" && currentStep === 1 && (
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="hackathon-description">Description</FieldLabel>
                  <Textarea
                    id="hackathon-description"
                    name="hackathon-description"
                    placeholder="What's this hackathon about?"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value)
                      setError(null)
                    }}
                    rows={5}
                    autoFocus
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                  />
                  <FieldDescription>
                    Optional. Add a short overview so participants understand the event immediately.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            )}

            {method === "external" && currentStep === 0 && (
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="external-event-page-url">Event Page URL</FieldLabel>
                  <Input
                    id="external-event-page-url"
                    name="external-event-page-url"
                    {...urlInputProps}
                    placeholder="eventbrite.com/e/my-event"
                    value={externalUrl}
                    onChange={(e) => {
                      setExternalUrl(e.target.value)
                      setError(null)
                    }}
                    onBlur={() => setExternalUrl(normalizeUrlFieldValue(externalUrl))}
                    autoFocus
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                  />
                  <FieldDescription>
                    Paste a public event page URL. Luma works best, but other public event pages can import too.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            )}

            {error && <p className="text-destructive text-sm">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setError(null)
                  if (currentStep === 0) {
                    if (initialMethod) {
                      handleOpenChange(false)
                    } else {
                      setMethod(null)
                    }
                    return
                  }

                  setCurrentStep((step) => Math.max(step - 1, 0))
                }}
                disabled={isSubmitting}
              >
                Back
              </Button>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {method === "external" ? "Opening..." : "Creating..."}
                  </>
                ) : currentStep < flowSteps.length - 1 ? (
                  "Next"
                ) : method === "external" ? (
                  "Continue"
                ) : onAuthRequired ? (
                  "Sign up to create"
                ) : (
                  "Create Hackathon"
                )}
              </Button>
            </div>
          </form>
        </SteppedDialogContent>
      )}
    </Dialog>
  )
}
