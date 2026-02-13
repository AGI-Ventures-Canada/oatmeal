"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus, Check, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface TeamInviteDialogProps {
  teamId: string
  hackathonId: string
  teamName: string
}

export function TeamInviteDialog({ teamId, hackathonId, teamName }: TeamInviteDialogProps) {
  const router = useRouter()
  const emailInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  useEffect(() => {
    if (open && !success) {
      setTimeout(() => emailInputRef.current?.focus(), 0)
    }
  }, [open, success])

  async function handleInvite() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/dashboard/teams/${teamId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hackathonId, email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to send invitation")
        return
      }

      setSuccess(true)
    } catch {
      setError("Failed to send invitation")
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) {
      setEmail("")
      setError(null)
      if (success) {
        setSuccess(false)
        router.refresh()
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && isValidEmail && !loading) {
      e.preventDefault()
      handleInvite()
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="size-4 mr-2" />
          Invite Member
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {success ? "Invitation Sent!" : "Invite Team Member"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {success
              ? `We've sent an invitation email to ${email}.`
              : `Send an email invitation to join "${teamName}".`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {success ? (
          <div className="flex flex-col items-center py-4">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <Check className="size-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              The invitation will expire in 7 days if not accepted.
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (isValidEmail && !loading) handleInvite()
            }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          >
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  ref={emailInputRef}
                  id="email"
                  type="email"
                  placeholder="teammate@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
              </div>
            </div>

            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              <Button type="submit" disabled={!isValidEmail || loading}>
                {loading ? "Sending..." : "Send Invitation"}
              </Button>
            </AlertDialogFooter>
          </form>
        )}

        {success && (
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => handleOpenChange(false)}>
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
