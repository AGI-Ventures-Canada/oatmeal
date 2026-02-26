"use client"

import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SignInRequiredDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  redirectQuery?: string
}

export function SignInRequiredDialog({
  open,
  onOpenChange,
  title = "Sign in to continue",
  description = "Your progress has been saved. Sign in to continue.",
  redirectQuery,
}: SignInRequiredDialogProps) {
  const router = useRouter()
  const pathname = usePathname()

  const redirectUrl = redirectQuery
    ? `${pathname}?${redirectQuery}`
    : pathname

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => router.push(`/sign-in?redirect_url=${redirectUrl}`)}>
            Sign In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
