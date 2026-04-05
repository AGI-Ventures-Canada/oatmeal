"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Package, Check, Clock, Mail } from "lucide-react"
import type { PrizeFulfillmentStatus } from "@/lib/db/hackathon-types"

type SponsorFulfillment = {
  fulfillmentId: string
  prizeName: string
  prizeValue: string | null
  submissionTitle: string
  teamName: string | null
  status: PrizeFulfillmentStatus
  recipientName: string | null
  recipientEmail: string | null
  shippingAddress: string | null
  paymentMethod: string | null
  paymentDetail: string | null
  trackingNumber: string | null
  claimedAt: string | null
}

const STATUS_CONFIG: Record<PrizeFulfillmentStatus, { label: string; variant: "secondary" | "outline" | "default"; icon: React.ComponentType<{ className?: string }> }> = {
  assigned: { label: "Awaiting Claim", variant: "secondary", icon: Clock },
  contacted: { label: "Contacted", variant: "outline", icon: Mail },
  shipped: { label: "Fulfilled", variant: "default", icon: Check },
  claimed: { label: "Claimed", variant: "default", icon: Package },
}

export function SponsorFulfillmentView({
  hackathonId,
  fulfillments: initialFulfillments,
}: {
  hackathonId: string
  fulfillments: SponsorFulfillment[]
}) {
  const [fulfillments, setFulfillments] = useState(initialFulfillments)
  const [fulfillDialogOpen, setFulfillDialogOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [trackingNumber, setTrackingNumber] = useState("")
  const [loading, setLoading] = useState(false)

  function openFulfillDialog(id: string) {
    setSelectedId(id)
    setTrackingNumber("")
    setFulfillDialogOpen(true)
  }

  async function handleMarkFulfilled() {
    if (!selectedId) return
    setLoading(true)

    try {
      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/sponsor-fulfillments/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber: trackingNumber.trim() || undefined }),
      })

      if (res.ok) {
        setFulfillments((prev) =>
          prev.map((f) =>
            f.fulfillmentId === selectedId
              ? { ...f, status: "shipped" as PrizeFulfillmentStatus, trackingNumber: trackingNumber.trim() || null }
              : f
          )
        )
        setFulfillDialogOpen(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const claimedCount = fulfillments.filter((f) => f.status === "claimed" || f.status === "shipped").length
  const totalCount = fulfillments.length

  if (fulfillments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package className="size-10 mx-auto mb-4" />
        <p>No prize assignments for your sponsored tracks yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{claimedCount}/{totalCount} claimed</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prize</TableHead>
              <TableHead>Winner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Details</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fulfillments.map((f) => {
              const config = STATUS_CONFIG[f.status]
              const Icon = config.icon
              return (
                <TableRow key={f.fulfillmentId}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{f.prizeName}</p>
                      {f.prizeValue && (
                        <p className="text-sm text-muted-foreground">{f.prizeValue}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {f.recipientName ? (
                      <div>
                        <p className="text-sm">{f.recipientName}</p>
                        {f.recipientEmail && (
                          <p className="text-xs text-muted-foreground">{f.recipientEmail}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {f.submissionTitle}
                        {f.teamName ? ` (${f.teamName})` : ""}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={config.variant}>
                      <Icon className="mr-1 size-3" />
                      {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {f.shippingAddress && (
                      <p className="text-xs text-muted-foreground truncate max-w-48">{f.shippingAddress}</p>
                    )}
                    {f.paymentMethod && (
                      <p className="text-xs text-muted-foreground">
                        {f.paymentMethod}{f.paymentDetail ? `: ${f.paymentDetail}` : ""}
                      </p>
                    )}
                    {f.trackingNumber && (
                      <p className="text-xs text-muted-foreground">Tracking: {f.trackingNumber}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {f.status === "claimed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openFulfillDialog(f.fulfillmentId)}
                      >
                        Mark Fulfilled
                      </Button>
                    )}
                    {f.status === "shipped" && (
                      <span className="text-sm text-muted-foreground">Fulfilled</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={fulfillDialogOpen} onOpenChange={setFulfillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Fulfilled</DialogTitle>
            <DialogDescription>
              Confirm that you&apos;ve sent or delivered this prize.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tracking">Tracking number (optional)</Label>
              <Input
                id="tracking"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g., 1Z999AA10123456784"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFulfillDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkFulfilled} disabled={loading}>
              {loading ? "Updating..." : "Confirm Fulfilled"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
