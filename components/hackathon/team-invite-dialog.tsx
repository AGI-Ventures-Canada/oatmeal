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
import { Progress } from "@/components/ui/progress"

interface TeamInviteDialogProps {
  teamId: string
  hackathonId: string
  teamName: string
}

const INVITE_COUNTDOWN = 6

export function TeamInviteDialog({ teamId, hackathonId, teamName }: TeamInviteDialogProps) {
  const router = useRouter()
  const emailInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(INVITE_COUNTDOWN)

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  useEffect(() => {
    if (open && !success) {
      setTimeout(() => emailInputRef.current?.focus(), 0)
    }
  }, [open, success])

  useEffect(() => {
    if (!success || !open) return
    setCountdown(INVITE_COUNTDOWN)
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [success, open])

  useEffect(() => {
    if (countdown === 0 && success) {
      setOpen(false)
      setEmail("")
      setError(null)
      setSuccess(false)
      setCountdown(INVITE_COUNTDOWN)
      router.refresh()
    }
  }, [countdown, success, router])

  useEffect(() => {
    if (!success || !open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        setOpen(false)
        setEmail("")
        setError(null)
        setSuccess(false)
        setCountdown(INVITE_COUNTDOWN)
        router.refresh()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [success, open, router])

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
      setCountdown(INVITE_COUNTDOWN)
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
        {success ? (
          <>
            <AlertDialogTitle className="sr-only">Invitation sent</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              Invitation sent to {email}
            </AlertDialogDescription>
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="animate-in zoom-in-50 fade-in duration-300 rounded-full bg-primary/10 p-3">
                <Check className="size-5 text-primary" strokeWidth={2.5} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Invitation sent</p>
                <p className="text-sm text-muted-foreground mt-1">{email}</p>
              </div>
            </div>
            <AlertDialogFooter>
              <div className="flex flex-col gap-1 items-end">
                <AlertDialogAction onClick={() => handleOpenChange(false)}>
                  Done
                </AlertDialogAction>
                <div className="flex flex-col gap-1 w-full">
                  <p className="text-xs text-muted-foreground text-right">Closing automatically…</p>
                  <Progress value={((INVITE_COUNTDOWN - countdown) / INVITE_COUNTDOWN) * 100} />
                </div>
              </div>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Invite Team Member</AlertDialogTitle>
              <AlertDialogDescription>
                Send an email invitation to join &quot;{teamName}&quot;.
              </AlertDialogDescription>
            </AlertDialogHeader>
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
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
