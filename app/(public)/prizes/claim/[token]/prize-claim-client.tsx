"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Gift, Trophy, Check, Clock, AlertCircle } from "lucide-react"

interface PrizeClaimClientProps {
  token: string
  claim: {
    prizeName: string
    prizeValue: string | null
    hackathonName: string
    hackathonSlug: string
    submissionTitle: string
    teamName: string | null
    status: string
    recipientName: string | null
    recipientEmail: string | null
    shippingAddress: string | null
    isExpired: boolean
  }
}

export function PrizeClaimClient({ token, claim }: PrizeClaimClientProps) {
  const [name, setName] = useState(claim.recipientName ?? "")
  const [email, setEmail] = useState(claim.recipientEmail ?? "")
  const [address, setAddress] = useState(claim.shippingAddress ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/public/prize-claims/${token}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName: name.trim(),
          recipientEmail: email.trim(),
          shippingAddress: address.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to claim prize")
        return
      }

      setSuccess(true)
    } catch {
      setError("Failed to claim prize. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !loading) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <div className="rounded-full bg-primary/10 p-4 w-fit mx-auto mb-4">
            <Check className="size-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Prize Claimed!</h2>
          <p className="text-muted-foreground mb-4">
            The organizer has been notified and will be in touch about delivery.
          </p>
          <Button variant="outline" asChild>
            <a href={`/e/${claim.hackathonSlug}`}>View Event</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (claim.status === "claimed") {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <div className="rounded-full bg-primary/10 p-4 w-fit mx-auto mb-4">
            <Check className="size-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Already Claimed</h2>
          <p className="text-muted-foreground">
            This prize has already been claimed.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" asChild>
            <a href={`/e/${claim.hackathonSlug}`}>View Event</a>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  if (claim.isExpired) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <div className="rounded-full bg-muted p-4 w-fit mx-auto mb-4">
            <Clock className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">Claim Expired</h2>
          <p className="text-muted-foreground">
            This claim link has expired. Contact the event organizer for a new one.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" asChild>
            <a href={`/e/${claim.hackathonSlug}`}>View Event</a>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="rounded-full bg-primary/10 p-4 w-fit mx-auto mb-4">
          <Gift className="size-8 text-primary" />
        </div>
        <CardTitle>Claim Your Prize</CardTitle>
        <CardDescription>
          Confirm your details so we can get this to you
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Trophy className="size-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Prize</p>
              <p className="font-medium truncate">
                {claim.prizeName}
                {claim.prizeValue ? ` — ${claim.prizeValue}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Gift className="size-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">
                {claim.hackathonName}
              </p>
              <p className="font-medium truncate">
                &ldquo;{claim.submissionTitle}&rdquo;
                {claim.teamName ? ` by ${claim.teamName}` : ""}
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          className="space-y-4 pt-2"
          autoComplete="off"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              name="recipient-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
              autoFocus
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="recipient-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">
              Shipping address
              <span className="text-muted-foreground font-normal"> (optional)</span>
            </Label>
            <Textarea
              id="address"
              name="shipping-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address, city, state, zip"
              rows={3}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
            <p className="text-xs text-muted-foreground">
              Include if the prize requires shipping
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !name.trim() || !email.trim()}>
            {loading ? "Claiming..." : "Claim Prize"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
