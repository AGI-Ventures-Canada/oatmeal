"use client"

import { useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PackageCheck, Mail, Truck, CheckCircle2, Loader2 } from "lucide-react"

type FulfillmentStatus = "assigned" | "contacted" | "shipped" | "claimed"

type Fulfillment = {
  id: string
  prizeAssignmentId: string
  prizeName: string
  prizeValue: string | null
  submissionTitle: string
  teamName: string | null
  status: FulfillmentStatus
  recipientEmail: string | null
  recipientName: string | null
  shippingAddress: string | null
  trackingNumber: string | null
  notes: string | null
  contactedAt: string | null
  shippedAt: string | null
  claimedAt: string | null
  createdAt: string
}

type FulfillmentSummary = Record<FulfillmentStatus, number>

const STATUS_CONFIG: Record<FulfillmentStatus, { label: string; variant: "secondary" | "default" | "outline" | "destructive"; icon: typeof PackageCheck }> = {
  assigned: { label: "Assigned", variant: "secondary", icon: PackageCheck },
  contacted: { label: "Contacted", variant: "outline", icon: Mail },
  shipped: { label: "Shipped", variant: "default", icon: Truck },
  claimed: { label: "Claimed", variant: "default", icon: CheckCircle2 },
}

const NEXT_STATUS: Record<FulfillmentStatus, FulfillmentStatus | null> = {
  assigned: "contacted",
  contacted: "shipped",
  shipped: "claimed",
  claimed: null,
}

export function PrizeFulfillmentTracker({
  hackathonId,
  initialFulfillments,
  initialSummary,
  resultsPublishedAt,
}: {
  hackathonId: string
  initialFulfillments: Fulfillment[]
  initialSummary: FulfillmentSummary
  resultsPublishedAt: string | null
}) {
  const [fulfillments, setFulfillments] = useState(initialFulfillments)
  const [summary, setSummary] = useState(initialSummary)
  const [loading, setLoading] = useState(false)
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [selectedFulfillment, setSelectedFulfillment] = useState<Fulfillment | null>(null)
  const [targetStatus, setTargetStatus] = useState<FulfillmentStatus | "">("")
  const [notes, setNotes] = useState("")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [shippingAddress, setShippingAddress] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [updating, setUpdating] = useState(false)

  const total = summary.assigned + summary.contacted + summary.shipped + summary.claimed

  const refreshData = useCallback(async () => {
    const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/fulfillments`)
    if (res.ok) {
      const data = await res.json()
      setFulfillments(data.fulfillments)
      setSummary(data.summary)
    }
  }, [hackathonId])

  const handleInitialize = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/fulfillments/initialize`, {
        method: "POST",
      })
      if (res.ok) {
        await refreshData()
      }
    } finally {
      setLoading(false)
    }
  }

  const openUpdateDialog = (fulfillment: Fulfillment) => {
    setSelectedFulfillment(fulfillment)
    const next = NEXT_STATUS[fulfillment.status]
    setTargetStatus(next ?? "")
    setNotes(fulfillment.notes ?? "")
    setTrackingNumber(fulfillment.trackingNumber ?? "")
    setShippingAddress(fulfillment.shippingAddress ?? "")
    setRecipientEmail(fulfillment.recipientEmail ?? "")
    setRecipientName(fulfillment.recipientName ?? "")
    setUpdateDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!selectedFulfillment || !targetStatus) return
    setUpdating(true)
    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/fulfillments/${selectedFulfillment.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: targetStatus,
            notes: notes || undefined,
            trackingNumber: trackingNumber || undefined,
            shippingAddress: shippingAddress || undefined,
            recipientEmail: recipientEmail || undefined,
            recipientName: recipientName || undefined,
          }),
        }
      )
      if (res.ok) {
        setUpdateDialogOpen(false)
        await refreshData()
      }
    } finally {
      setUpdating(false)
    }
  }

  if (total === 0) {
    const hasResults = !!resultsPublishedAt
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 py-8">
            <PackageCheck className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="text-lg font-semibold">No Prize Fulfillments</p>
              <p className="text-sm text-muted-foreground">
                {hasResults
                  ? "Initialize fulfillment tracking from assigned prizes to start managing delivery."
                  : "Publish results first to assign prizes and start tracking fulfillment."}
              </p>
            </div>
            <Button onClick={handleInitialize} disabled={loading || !hasResults}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Initialize Fulfillments
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.entries(STATUS_CONFIG) as [FulfillmentStatus, typeof STATUS_CONFIG[FulfillmentStatus]][]).map(
          ([status, config]) => {
            const Icon = config.icon
            return (
              <Card key={status}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Icon className="h-4 w-4" />
                    {config.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{summary[status]}</p>
                </CardContent>
              </Card>
            )
          }
        )}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prize</TableHead>
              <TableHead className="hidden sm:table-cell">Submission</TableHead>
              <TableHead className="hidden sm:table-cell">Team</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Tracking</TableHead>
              <TableHead className="w-[100px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fulfillments.map((f) => {
              const config = STATUS_CONFIG[f.status]
              const next = NEXT_STATUS[f.status]
              return (
                <TableRow key={f.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{f.prizeName}</span>
                      {f.prizeValue && (
                        <span className="ml-1 text-sm text-muted-foreground">({f.prizeValue})</span>
                      )}
                    </div>
                    <div className="sm:hidden text-sm text-muted-foreground">{f.submissionTitle}</div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{f.submissionTitle}</TableCell>
                  <TableCell className="hidden sm:table-cell">{f.teamName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {f.trackingNumber ? (
                      <span className="text-sm">{f.trackingNumber}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {next ? (
                      <Button size="sm" variant="outline" onClick={() => openUpdateDialog(f)}>
                        {STATUS_CONFIG[next].label}
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">Done</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Fulfillment Status</DialogTitle>
            <DialogDescription>
              {selectedFulfillment && (
                <>Update &quot;{selectedFulfillment.prizeName}&quot; for {selectedFulfillment.teamName ?? selectedFulfillment.submissionTitle}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={targetStatus} onValueChange={(v) => setTargetStatus(v as FulfillmentStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {selectedFulfillment && (
                    <>
                      {selectedFulfillment.status === "assigned" && (
                        <>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="claimed">Claimed</SelectItem>
                        </>
                      )}
                      {selectedFulfillment.status === "contacted" && (
                        <>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="claimed">Claimed</SelectItem>
                        </>
                      )}
                      {selectedFulfillment.status === "shipped" && (
                        <SelectItem value="claimed">Claimed</SelectItem>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Recipient Name</Label>
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                name="recipient-name"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              />
            </div>
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                name="recipient-email"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              />
            </div>
            {(targetStatus === "shipped" || targetStatus === "claimed") && (
              <>
                <div className="space-y-2">
                  <Label>Tracking Number</Label>
                  <Input
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    name="tracking-number"
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Shipping Address</Label>
                  <Textarea
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    rows={2}
                    name="shipping-address"
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                name="fulfillment-notes"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!targetStatus || updating}>
              {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
