"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Mail, MoreHorizontal, Trash2, Bot, Pencil, Copy, Check } from "lucide-react"
import type { EmailAddress } from "@/lib/db/agent-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { EditEmailAddressForm } from "@/components/dashboard/edit-email-address-form"

interface EmailAddressListProps {
  emailAddresses: EmailAddress[]
  agentMap: Map<string, string>
}

export function EmailAddressList({ emailAddresses, agentMap }: EmailAddressListProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editAddress, setEditAddress] = useState<EmailAddress | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deleteId) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/dashboard/email-addresses/${deleteId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        router.refresh()
      }
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const handleCopy = async (address: EmailAddress) => {
    await navigator.clipboard.writeText(address.address)
    setCopiedId(address.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (emailAddresses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Mail className="size-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No email addresses yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-1">
          Create an email address to trigger agents when emails are received
        </p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email Address</TableHead>
            <TableHead>Linked Agent</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {emailAddresses.map((address) => (
            <TableRow key={address.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                    {address.address}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => handleCopy(address)}
                  >
                    {copiedId === address.id ? (
                      <Check className="size-3 text-green-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                {address.agent_id ? (
                  <span className="flex items-center gap-1.5">
                    <Bot className="size-3.5" />
                    {agentMap.get(address.agent_id) ?? "Unknown"}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not linked</span>
                )}
              </TableCell>
              <TableCell>
                {address.is_active ? (
                  <Badge variant="default">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(address.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditAddress(address)}>
                      <Pencil className="size-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteId(address.id)}
                    >
                      <Trash2 className="size-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Email Address</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this email address? Any future
              emails to this address will not be processed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={!!editAddress} onOpenChange={() => setEditAddress(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit Email Address</SheetTitle>
            <SheetDescription>
              Configure which agent handles emails to this address
            </SheetDescription>
          </SheetHeader>
          {editAddress && (
            <EditEmailAddressForm
              emailAddress={editAddress}
              onSuccess={() => {
                setEditAddress(null)
                router.refresh()
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
