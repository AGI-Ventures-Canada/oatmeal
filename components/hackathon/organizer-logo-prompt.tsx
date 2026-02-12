"use client"

import { useAuth } from "@clerk/nextjs"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ImageIcon } from "lucide-react"
import { LogoUploadModal } from "@/components/org/logo-upload-modal"

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
    <div className="mx-auto max-w-4xl px-4 py-4">
      <Alert>
        <ImageIcon className="size-4" />
        <AlertTitle>Add your organization logo</AlertTitle>
        <AlertDescription>
          Make your event stand out by adding an organization logo. It will appear on your event pages and sponsor cards.
        </AlertDescription>
        <div className="mt-2 col-start-2">
          <LogoUploadModal
            lightLogoUrl={null}
            darkLogoUrl={null}
            trigger={
              <Button variant="outline" size="sm">Add Logo</Button>
            }
          />
        </div>
      </Alert>
    </div>
  )
}
