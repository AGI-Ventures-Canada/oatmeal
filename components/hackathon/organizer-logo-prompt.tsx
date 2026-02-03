"use client"

import { useAuth } from "@clerk/nextjs"
import Link from "next/link"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Image } from "lucide-react"

type OrganizerLogoPromptProps = {
  organizerId: string
  organizerClerkOrgId: string | null
  organizerLogoUrl: string | null
}

export function OrganizerLogoPrompt({
  organizerClerkOrgId,
  organizerLogoUrl,
}: OrganizerLogoPromptProps) {
  const { orgId } = useAuth()

  if (!orgId || !organizerClerkOrgId) {
    return null
  }

  if (orgId !== organizerClerkOrgId) {
    return null
  }

  if (organizerLogoUrl) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-4">
      <Alert>
        <Image className="size-4" />
        <AlertTitle>Add your organization logo</AlertTitle>
        <AlertDescription>
          Make your event stand out by adding an organization logo. It will appear on your event pages and sponsor cards.
        </AlertDescription>
        <div className="mt-2 col-start-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/profile">Add Logo</Link>
          </Button>
        </div>
      </Alert>
    </div>
  )
}
