"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Field,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field"
import { Loader2 } from "lucide-react"
import type { LumaEventData } from "@/lib/services/luma-import"

const STORAGE_KEY = "oatmeal:luma-import"
const STORAGE_EXPIRY_MS = 24 * 60 * 60 * 1000

type LumaImportFormProps = {
  eventData: LumaEventData
  lumaSlug: string
}

export function LumaImportForm({ eventData, lumaSlug }: LumaImportFormProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isSignedIn } = useAuth()
  const { organization } = useOrganization()
  const autoSubmitTriggered = useRef(false)

  // Check if we should auto-submit on mount (user just signed in)
  const shouldAutoSubmit = (() => {
    if (typeof window === "undefined") return false
    if (!isSignedIn || !organization) return false
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return false
    try {
      const parsed = JSON.parse(saved)
      return Date.now() - parsed.savedAt < STORAGE_EXPIRY_MS
    } catch {
      return false
    }
  })()

  const [isSubmitting, setIsSubmitting] = useState(shouldAutoSubmit)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState(() => {
    if (typeof window === "undefined") {
      return {
        name: eventData.name,
        description: eventData.description ?? "",
        startsAt: eventData.startsAt ?? "",
        endsAt: eventData.endsAt ?? "",
        locationType: eventData.locationType ?? "",
        locationName: eventData.locationName ?? "",
        locationUrl: eventData.locationUrl ?? "",
        imageUrl: eventData.imageUrl ?? "",
      }
    }

    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      return {
        name: eventData.name,
        description: eventData.description ?? "",
        startsAt: eventData.startsAt ?? "",
        endsAt: eventData.endsAt ?? "",
        locationType: eventData.locationType ?? "",
        locationName: eventData.locationName ?? "",
        locationUrl: eventData.locationUrl ?? "",
        imageUrl: eventData.imageUrl ?? "",
      }
    }

    try {
      const parsed = JSON.parse(saved)
      if (Date.now() - parsed.savedAt >= STORAGE_EXPIRY_MS) {
        localStorage.removeItem(STORAGE_KEY)
        return {
          name: eventData.name,
          description: eventData.description ?? "",
          startsAt: eventData.startsAt ?? "",
          endsAt: eventData.endsAt ?? "",
          locationType: eventData.locationType ?? "",
          locationName: eventData.locationName ?? "",
          locationUrl: eventData.locationUrl ?? "",
          imageUrl: eventData.imageUrl ?? "",
        }
      }
      return parsed
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      return {
        name: eventData.name,
        description: eventData.description ?? "",
        startsAt: eventData.startsAt ?? "",
        endsAt: eventData.endsAt ?? "",
        locationType: eventData.locationType ?? "",
        locationName: eventData.locationName ?? "",
        locationUrl: eventData.locationUrl ?? "",
        imageUrl: eventData.imageUrl ?? "",
      }
    }
  })

  useEffect(() => {
    if (!shouldAutoSubmit) return
    if (autoSubmitTriggered.current) return

    autoSubmitTriggered.current = true
    handleSubmit()
  }, [shouldAutoSubmit])

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !isSubmitting) {
      e.preventDefault()
      handleSubmit()
    }
  }

  async function handleSubmit() {
    if (!formData.name.trim()) {
      setError("Hackathon name is required")
      return
    }

    if (!isSignedIn || !organization) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...formData, savedAt: Date.now() }))
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
          name: formData.name,
          description: formData.description || null,
          startsAt: formData.startsAt || null,
          endsAt: formData.endsAt || null,
          locationType: formData.locationType || null,
          locationName: formData.locationName || null,
          locationUrl: formData.locationUrl || null,
          imageUrl: formData.imageUrl || null,
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
  }

  function updateField(field: string, value: string) {
    setFormData((prev: typeof formData) => ({ ...prev, [field]: value }))
  }

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
    <div className="mx-auto max-w-2xl p-4 md:p-6" onKeyDown={handleKeyDown}>
      <Card>
        <CardHeader>
          <CardTitle>Import from Luma</CardTitle>
          <CardDescription>
            Imported from <span className="font-mono text-xs">luma.com/{lumaSlug}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} autoComplete="off">
            <FieldGroup>
              {formData.imageUrl && (
                <img
                  src={formData.imageUrl}
                  alt={formData.name}
                  className="aspect-video w-full rounded-md object-cover"
                />
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Field>
                <FieldLabel htmlFor="name">Hackathon Name</FieldLabel>
                <Input
                  id="name"
                  name="hackathon-name"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={4}
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="startsAt">Start Date</FieldLabel>
                  <Input
                    id="startsAt"
                    type="datetime-local"
                    value={formData.startsAt ? formData.startsAt.slice(0, 16) : ""}
                    onChange={(e) => {
                      if (!e.target.value) {
                        updateField("startsAt", "")
                      } else {
                        const date = new Date(e.target.value)
                        updateField("startsAt", isNaN(date.getTime()) ? "" : date.toISOString())
                      }
                    }}
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="endsAt">End Date</FieldLabel>
                  <Input
                    id="endsAt"
                    type="datetime-local"
                    value={formData.endsAt ? formData.endsAt.slice(0, 16) : ""}
                    onChange={(e) => {
                      if (!e.target.value) {
                        updateField("endsAt", "")
                      } else {
                        const date = new Date(e.target.value)
                        updateField("endsAt", isNaN(date.getTime()) ? "" : date.toISOString())
                      }
                    }}
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="locationName">Location</FieldLabel>
                <Input
                  id="locationName"
                  value={formData.locationName}
                  onChange={(e) => updateField("locationName", e.target.value)}
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
              </Field>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !formData.name.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Hackathon"
                )}
              </Button>

              {!isSignedIn && (
                <p className="text-center text-sm text-muted-foreground">
                  You&apos;ll be asked to sign in before creating
                </p>
              )}
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
