"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
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
  const currentSearchParams = useSearchParams()

  const redirectUrl = (() => {
    const params = new URLSearchParams(currentSearchParams.toString())
    if (redirectQuery) {
      new URLSearchParams(redirectQuery).forEach((value, key) => {
        params.set(key, value)
      })
    }
    const search = params.toString()
    return `${pathname}${search ? `?${search}` : ""}`
  })()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              router.push(
                `/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`,
              )
            }
          >
            Sign Up
          </Button>
          <Button
            onClick={() =>
              router.push(
                `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`,
              )
            }
          >
            Sign In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
