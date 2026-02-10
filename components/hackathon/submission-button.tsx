"use client"

import { useState } from "react"
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
import { Loader2, Send, Pencil, Lock } from "lucide-react"
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
  const [submission, setSubmission] = useState(initialSubmission)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(submission?.title || "")
  const [githubUrl, setGithubUrl] = useState(submission?.github_url || "")
  const [liveAppUrl, setLiveAppUrl] = useState(submission?.live_app_url || "")
  const [description, setDescription] = useState(submission?.description || "")

  const canSubmit = status === "active"

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
    return (
      <Button disabled variant="outline" size="lg">
        <Lock className="size-4" />
        Submissions Closed
      </Button>
    )
  }

  function resetForm() {
    setTitle(submission?.title || "")
    setGithubUrl(submission?.github_url || "")
    setLiveAppUrl(submission?.live_app_url || "")
    setDescription(submission?.description || "")
    setError(null)
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

      setSubmission({
        ...submission,
        id: data.submissionId,
        title: title.trim(),
        description: description.trim(),
        github_url: githubUrl.trim(),
        live_app_url: liveAppUrl.trim() || null,
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
        <DialogContent className="sm:max-w-md">
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

              {error && (
                <p className="text-destructive text-sm">{error}</p>
              )}
            </FieldGroup>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {submission ? "Saving..." : "Submitting..."}
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
