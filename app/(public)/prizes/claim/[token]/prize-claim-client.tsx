"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { parseAddress, serializeAddress, COUNTRIES } from "@/lib/utils/address"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Gift, Trophy, Check, Clock, AlertCircle, Info, ChevronRight } from "lucide-react"
import type { SiblingClaimPublic } from "@/lib/services/prize-fulfillment"

type ClaimInfo = {
  prizeName: string
  prizeValue: string | null
  prizeKind: string
  distributionMethod: string | null
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

interface PrizeClaimClientProps {
  token: string
  claim: ClaimInfo
  siblings: SiblingClaimPublic[]
}

const PAYMENT_METHODS = [
  { value: "venmo", label: "Venmo" },
  { value: "paypal", label: "PayPal" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
]

function needsShipping(kind: string): boolean {
  return kind === "swag" || kind === "experience"
}

function needsPayment(kind: string): boolean {
  return kind === "cash"
}

function isDigitalOnly(kind: string): boolean {
  return kind === "credit"
}

export function PrizeClaimClient({ token, claim, siblings }: PrizeClaimClientProps) {
  const totalCount = siblings.length
  const isMultiPrize = totalCount > 1

  const initialQueue = (() => {
    const current = siblings.find((s) => s.token === token)
    if (!current || current.status === "claimed" || current.isExpired) {
      return siblings.filter((s) => s.status !== "claimed" && !s.isExpired)
    }
    const rest = siblings.filter((s) => s.token !== token && s.status !== "claimed" && !s.isExpired)
    return [current, ...rest]
  })()

  const alreadyClaimedCount = siblings.filter((s) => s.status === "claimed").length

  const [claimQueue, setClaimQueue] = useState<SiblingClaimPublic[]>(initialQueue)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [claimedThisSession, setClaimedThisSession] = useState<string[]>([])
  const [allDone, setAllDone] = useState(false)

  const [name, setName] = useState(claim.recipientName ?? "")
  const [email, setEmail] = useState(claim.recipientEmail ?? "")
  const existingAddress = claim.shippingAddress ? parseAddress(claim.shippingAddress) : null
  const [street, setStreet] = useState(existingAddress?.street ?? "")
  const [city, setCity] = useState(existingAddress?.city ?? "")
  const [addrState, setAddrState] = useState(existingAddress?.state ?? "")
  const [postalCode, setPostalCode] = useState(existingAddress?.postalCode ?? "")
  const [country, setCountry] = useState(existingAddress?.country ?? "")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [paymentDetail, setPaymentDetail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentPrize = claimQueue[currentIndex] as SiblingClaimPublic | undefined
  const nextPrize = claimQueue[currentIndex + 1] as SiblingClaimPublic | undefined
  const claimedSoFar = alreadyClaimedCount + claimedThisSession.length
  const isLastPrize = !nextPrize

  const showShipping = currentPrize ? needsShipping(currentPrize.prizeKind) : false
  const showPayment = currentPrize ? needsPayment(currentPrize.prizeKind) : false
  const digitalOnly = currentPrize ? isDigitalOnly(currentPrize.prizeKind) : false

  function isFormValid(): boolean {
    if (!name.trim() || !email.trim()) return false
    if (showShipping && (!street.trim() || !city.trim() || !postalCode.trim() || !country)) return false
    if (showPayment && (!paymentMethod || !paymentDetail.trim())) return false
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPrize || !isFormValid()) return

    setLoading(true)
    setError(null)

    try {
      const body: Record<string, string> = {
        recipientName: name.trim(),
        recipientEmail: email.trim(),
      }
      if (street.trim()) {
        body.shippingAddress = serializeAddress({
          street: street.trim(),
          city: city.trim(),
          state: addrState.trim(),
          postalCode: postalCode.trim(),
          country,
        })
      }
      if (paymentMethod) body.paymentMethod = paymentMethod
      if (paymentDetail.trim()) body.paymentDetail = paymentDetail.trim()

      const res = await fetch(`/api/public/prize-claims/${currentPrize.token}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === "already_claimed") {
          advanceToNext()
          return
        }
        setError(data.error || "Failed to claim prize")
        return
      }

      setClaimedThisSession((prev) => [...prev, currentPrize.prizeName])

      const remaining: SiblingClaimPublic[] = (data.siblings ?? []).filter(
        (s: SiblingClaimPublic) => s.status !== "claimed" && !s.isExpired
      )

      if (remaining.length > 0) {
        setClaimQueue(remaining)
        setCurrentIndex(0)
        resetPrizeFields()
      } else {
        setAllDone(true)
      }
    } catch {
      setError("Failed to claim prize. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function advanceToNext() {
    if (currentIndex + 1 < claimQueue.length) {
      setCurrentIndex((i) => i + 1)
      resetPrizeFields()
      setError(null)
    } else {
      setAllDone(true)
    }
  }

  function resetPrizeFields() {
    setStreet("")
    setCity("")
    setAddrState("")
    setPostalCode("")
    setCountry("")
    setPaymentMethod("")
    setPaymentDetail("")
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !loading) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  if (allDone) {
    const allClaimed = [...siblings.filter((s) => s.status === "claimed").map((s) => s.prizeName), ...claimedThisSession]
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <div className="rounded-full bg-primary/10 p-4 w-fit mx-auto mb-4">
            <Check className="size-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">
            {allClaimed.length > 1 ? `All ${allClaimed.length} Prizes Claimed!` : "Prize Claimed!"}
          </h2>
          <p className="text-muted-foreground mb-4">
            The organizers have been notified and will be in touch about delivery.
          </p>
          {allClaimed.length > 1 && (
            <div className="space-y-2 mb-4 text-left">
              {allClaimed.map((prizeName, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <Check className="size-4 text-primary shrink-0" />
                  <span className="text-sm font-medium truncate">{prizeName}</span>
                </div>
              ))}
            </div>
          )}
          <Button variant="outline" asChild>
            <a href={`/e/${claim.hackathonSlug}`}>View Event</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (claim.status === "claimed" && claimQueue.length === 0) {
    const unclaimed = siblings.filter((s) => s.status !== "claimed" && !s.isExpired && s.token !== token)
    if (unclaimed.length > 0) {
      return (
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="rounded-full bg-primary/10 p-4 w-fit mx-auto mb-4">
              <Check className="size-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">This Prize Is Claimed</h2>
            <p className="text-muted-foreground mb-4">
              You have {unclaimed.length} more prize{unclaimed.length === 1 ? "" : "s"} to claim.
            </p>
            <Button asChild>
              <a href={`/prizes/claim/${unclaimed[0].token}`}>
                Claim Next Prize
                <ChevronRight className="size-4 ml-1" />
              </a>
            </Button>
          </CardContent>
        </Card>
      )
    }

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

  if (claim.isExpired && claimQueue.length === 0) {
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

  if (!currentPrize) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <div className="rounded-full bg-primary/10 p-4 w-fit mx-auto mb-4">
            <Check className="size-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">All Prizes Claimed!</h2>
          <p className="text-muted-foreground mb-4">
            The organizers have been notified and will be in touch about delivery.
          </p>
          <Button variant="outline" asChild>
            <a href={`/e/${claim.hackathonSlug}`}>View Event</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="rounded-full bg-primary/10 p-4 w-fit mx-auto mb-4">
          <Gift className="size-8 text-primary" />
        </div>
        <CardTitle>
          {isMultiPrize ? "Claim Your Prizes" : "Claim Your Prize"}
        </CardTitle>
        <CardDescription>
          Confirm your details so we can get this to you
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isMultiPrize && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Prize {claimedSoFar + 1} of {totalCount}</span>
              <span>{claimedSoFar} claimed</span>
            </div>
            <Progress value={(claimedSoFar / totalCount) * 100} className="h-2" />
          </div>
        )}

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
                {currentPrize.prizeName}
                {currentPrize.prizeValue ? ` — ${currentPrize.prizeValue}` : ""}
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

        {currentPrize.prizeKind === "other" && currentPrize.distributionMethod && (
          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
            <Info className="size-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">How you&apos;ll receive this</p>
              <p className="text-sm">{currentPrize.distributionMethod}</p>
            </div>
          </div>
        )}

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
            <Label htmlFor="email">
              Email
              {digitalOnly && (
                <span className="text-muted-foreground font-normal"> — we&apos;ll send your credit here</span>
              )}
            </Label>
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

          {showPayment && (
            <>
              <div className="space-y-2">
                <Label htmlFor="payment-method">Payment method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="payment-method">
                    <SelectValue placeholder="How should we pay you?" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-detail">
                  {paymentMethod === "venmo" ? "Venmo username" :
                   paymentMethod === "paypal" ? "PayPal email" :
                   paymentMethod === "bank_transfer" ? "Account details" :
                   "Payment details"}
                </Label>
                <Input
                  id="payment-detail"
                  name="payment-detail"
                  value={paymentDetail}
                  onChange={(e) => setPaymentDetail(e.target.value)}
                  placeholder={
                    paymentMethod === "venmo" ? "@username" :
                    paymentMethod === "paypal" ? "your@email.com" :
                    paymentMethod === "bank_transfer" ? "Routing + account number" :
                    "How to send payment"
                  }
                  required
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
              </div>
            </>
          )}

          {(showShipping || (!showPayment && !digitalOnly && currentPrize.prizeKind !== "other")) && (
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">
                Shipping address
                {!showShipping && (
                  <span className="text-muted-foreground font-normal"> (optional)</span>
                )}
              </legend>
              <div className="space-y-2">
                <Label htmlFor="street">Street address</Label>
                <Input
                  id="street"
                  name="street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="123 Main St, Apt 4"
                  required={showShipping}
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    required={showShipping}
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addr-state">State / Province</Label>
                  <Input
                    id="addr-state"
                    name="addr-state"
                    value={addrState}
                    onChange={(e) => setAddrState(e.target.value)}
                    placeholder="State"
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="postal-code">Postal / ZIP code</Label>
                  <Input
                    id="postal-code"
                    name="postal-code"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="12345"
                    required={showShipping}
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger id="country">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </fieldset>
          )}

          <Button type="submit" className="w-full" disabled={loading || !isFormValid()}>
            {loading ? "Claiming..." : isMultiPrize && !isLastPrize ? "Claim & Continue" : "Claim Prize"}
          </Button>
        </form>

        {isMultiPrize && nextPrize && (
          <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
            <ChevronRight className="size-4 shrink-0" />
            <span className="truncate">
              Next: {nextPrize.prizeName}
              {nextPrize.prizeValue ? ` — ${nextPrize.prizeValue}` : ""}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
