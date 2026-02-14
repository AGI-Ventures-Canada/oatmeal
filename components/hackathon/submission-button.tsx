"use client"

import { useState, useRef, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field"
import { Loader2, Send, Pencil, Lock, Upload, X, ImageIcon } from "lucide-react"
import type { HackathonStatus, Submission } from "@/lib/db/hackathon-types"

interface SubmissionButtonProps {
  hackathonSlug: string
  status: HackathonStatus
  isRegistered: boolean
  submission: Submission | null
}

export function SubmissionButton({
  hackathonSlug,
  status,
  isRegistered,
  submission: initialSubmission,
}: SubmissionButtonProps) {
  const { isSignedIn, isLoaded } = useUser()
  const pathname = usePathname()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submission, setSubmission] = useState(initialSubmission)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(submission?.title || "")
  const [githubUrl, setGithubUrl] = useState(submission?.github_url || "")
  const [liveAppUrl, setLiveAppUrl] = useState(submission?.live_app_url || "")
  const [description, setDescription] = useState(submission?.description || "")
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(
    submission?.screenshot_url || null
  )
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false)

  const canSubmit = status === "active"

  useEffect(() => {
    return () => {
      if (screenshotPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(screenshotPreview)
      }
    }
  }, [screenshotPreview])

  if (!isLoaded) {
    return (
      <Button disabled variant="outline" size="lg">
        <Loader2 className="size-4 animate-spin" />
        Loading...
      </Button>
    )
  }

  if (!isSignedIn) {
    return (
      <Button asChild variant="outline" size="lg">
        <Link href={`/sign-in?redirect_url=${encodeURIComponent(pathname)}`}>
          Sign in to Submit
        </Link>
      </Button>
    )
  }

  if (!isRegistered) {
    return null
  }

  if (!canSubmit) {
    if (status === "judging" || status === "completed") {
      return (
        <Button disabled variant="outline" size="lg">
          <Lock className="size-4" />
          Submissions Closed
        </Button>
      )
    }
    return null
  }

  function resetForm() {
    setTitle(submission?.title || "")
    setGithubUrl(submission?.github_url || "")
    setLiveAppUrl(submission?.live_app_url || "")
    setDescription(submission?.description || "")
    setScreenshotFile(null)
    if (screenshotPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(screenshotPreview)
    }
    setScreenshotPreview(submission?.screenshot_url || null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function handleScreenshotSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setError("Please select a PNG, JPEG, or WebP image")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Screenshot must be smaller than 10MB")
      return
    }

    setError(null)
    if (screenshotPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(screenshotPreview)
    }
    setScreenshotFile(file)
    setScreenshotPreview(URL.createObjectURL(file))
  }

  function handleRemoveScreenshot() {
    if (screenshotPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(screenshotPreview)
    }
    setScreenshotFile(null)
    setScreenshotPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  async function uploadScreenshot(): Promise<boolean> {
    if (!screenshotFile) return true

    setIsUploadingScreenshot(true)
    try {
      const formData = new FormData()
      formData.append("file", screenshotFile)

      const response = await fetch(
        `/api/public/hackathons/${hackathonSlug}/submissions/screenshot`,
        { method: "POST", body: formData }
      )

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Failed to upload screenshot")
        return false
      }

      const data = await response.json()
      setScreenshotPreview(data.screenshotUrl)
      setScreenshotFile(null)
      return true
    } catch {
      setError("Failed to upload screenshot")
      return false
    } finally {
      setIsUploadingScreenshot(false)
    }
  }

  async function deleteScreenshot(): Promise<boolean> {
    const hadOriginalScreenshot = !!submission?.screenshot_url
    const userRemovedScreenshot = screenshotPreview === null
    if (!hadOriginalScreenshot || !userRemovedScreenshot) return true

    try {
      const response = await fetch(
        `/api/public/hackathons/${hackathonSlug}/submissions/screenshot`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Failed to remove screenshot")
        return false
      }

      return true
    } catch {
      setError("Failed to remove screenshot")
      return false
    }
  }

  function handleOpenChange(open: boolean) {
    setIsDialogOpen(open)
    if (open) {
      resetForm()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !isSubmitting) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  function getErrorMessage(code: string, fallback: string): string {
    const errorMessages: Record<string, string> = {
      not_authenticated: "Please sign in to submit.",
      hackathon_not_found: "This hackathon no longer exists.",
      not_registered: "You must register before submitting.",
      submissions_closed: "Submissions are not currently open.",
      already_submitted: "You have already submitted. Edit your existing submission.",
      invalid_github_url: "Please enter a valid GitHub repository URL.",
      no_file: "Please select a screenshot to upload.",
      invalid_file_type: "Please select a PNG, JPEG, or WebP image.",
      file_too_large: "Screenshot must be smaller than 10MB.",
      upload_failed: "Failed to upload screenshot. Please try again.",
    }
    return errorMessages[code] || fallback
  }

  function validateForm(): string | null {
    if (!title.trim()) {
      return "Title is required"
    }
    if (!githubUrl.trim()) {
      return "GitHub repository URL is required"
    }
    try {
      const url = new URL(githubUrl)
      if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
        return "Please enter a valid GitHub URL"
      }
    } catch {
      return "Please enter a valid GitHub URL"
    }
    if (!description.trim()) {
      return "Elevator pitch is required"
    }
    if (description.length > 280) {
      return "Elevator pitch must be 280 characters or less"
    }
    if (liveAppUrl.trim()) {
      try {
        new URL(liveAppUrl)
      } catch {
        return "Please enter a valid URL for your live app"
      }
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)

    try {
      const method = submission ? "PATCH" : "POST"
      const response = await fetch(`/api/public/hackathons/${hackathonSlug}/submissions`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          githubUrl: githubUrl.trim(),
          liveAppUrl: liveAppUrl.trim() || null,
        }),
      })

      let data
      try {
        data = await response.json()
      } catch {
        setError("Unable to process response. Please try again.")
        return
      }

      if (!response.ok) {
        setError(getErrorMessage(data.code, data.error || "Failed to submit"))
        return
      }

      let finalScreenshotUrl = submission?.screenshot_url || null

      if (screenshotFile) {
        const uploadSuccess = await uploadScreenshot()
        if (!uploadSuccess) {
          setError(
            (prev) =>
              `Your submission was saved, but the screenshot failed to upload. ${prev || "Please try again."}`
          )
          return
        }
        finalScreenshotUrl = screenshotPreview
      } else if (submission?.screenshot_url && !screenshotPreview) {
        const deleteSuccess = await deleteScreenshot()
        if (!deleteSuccess) {
          setError(
            (prev) =>
              `Your submission was saved, but the screenshot failed to remove. ${prev || "Please try again."}`
          )
          return
        }
        finalScreenshotUrl = null
      }

      setSubmission({
        ...submission,
        id: data.submissionId,
        title: title.trim(),
        description: description.trim(),
        github_url: githubUrl.trim(),
        live_app_url: liveAppUrl.trim() || null,
        screenshot_url: finalScreenshotUrl,
      } as Submission)

      setIsDialogOpen(false)
      router.refresh()
    } catch (err) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("Network error. Please check your connection and try again.")
      } else {
        setError("An unexpected error occurred. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button onClick={() => setIsDialogOpen(true)} variant="outline" size="lg">
        {submission ? (
          <>
            <Pencil className="size-4" />
            Edit Submission
          </>
        ) : (
          <>
            <Send className="size-4" />
            Submit Project
          </>
        )}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {submission ? "Edit Your Submission" : "Submit Your Project"}
            </DialogTitle>
            <DialogDescription>
              Share your hackathon project with the community.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4" autoComplete="off">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="submission-title">Project Title</FieldLabel>
                <Input
                  id="submission-title"
                  name="title"
                  placeholder="My Awesome Project"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="submission-github">GitHub Repository</FieldLabel>
                <Input
                  id="submission-github"
                  name="githubUrl"
                  type="url"
                  placeholder="https://github.com/username/repo"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="submission-live-url">Live App URL (optional)</FieldLabel>
                <Input
                  id="submission-live-url"
                  name="liveAppUrl"
                  type="url"
                  placeholder="https://myproject.vercel.app"
                  value={liveAppUrl}
                  onChange={(e) => setLiveAppUrl(e.target.value)}
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="submission-description">Elevator Pitch</FieldLabel>
                <Textarea
                  id="submission-description"
                  name="description"
                  rows={3}
                  placeholder="A one-sentence description of your project..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={280}
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
                <FieldDescription>
                  {description.length}/280 characters
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>App Screenshot</FieldLabel>
                <FieldDescription className="mb-2">
                  Upload a screenshot of your app in action. No external art, logos, or promotional graphics.
                </FieldDescription>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleScreenshotSelect}
                />
                {screenshotPreview ? (
                  <div className="relative group rounded-lg overflow-hidden border">
                    <div className="aspect-video w-full bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={screenshotPreview}
                        alt="Screenshot preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/80 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSubmitting || isUploadingScreenshot}
                      >
                        <Upload className="mr-1.5 size-4" />
                        Replace
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleRemoveScreenshot}
                        disabled={isSubmitting || isUploadingScreenshot}
                      >
                        <X className="mr-1.5 size-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="aspect-video w-full flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ImageIcon className="size-6" />
                    <span className="text-xs font-medium">Upload app screenshot</span>
                    <span className="text-xs text-muted-foreground">PNG, JPEG, or WebP (max 10MB)</span>
                  </button>
                )}
              </Field>

              {error && (
                <p className="text-destructive text-sm">{error}</p>
              )}
            </FieldGroup>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting || isUploadingScreenshot}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isUploadingScreenshot}>
                {isSubmitting || isUploadingScreenshot ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {isUploadingScreenshot ? "Uploading..." : submission ? "Saving..." : "Submitting..."}
                  </>
                ) : (
                  submission ? "Save Changes" : "Submit Project"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
