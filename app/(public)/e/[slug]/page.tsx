import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { getPublicHackathon } from "@/lib/services/public-hackathons"
import { OrganizerLogoPrompt } from "@/components/hackathon/organizer-logo-prompt"
import { HackathonPreviewClient } from "@/components/hackathon/preview/hackathon-preview-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, Pencil } from "lucide-react"
import type { Metadata } from "next"

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const hackathon = await getPublicHackathon(slug, { includeUnpublished: true })

  if (!hackathon) {
    return {
      title: "Hackathon Not Found",
    }
  }

  return {
    title: `${hackathon.name} | Oatmeal`,
    description: hackathon.description || `Join ${hackathon.name} hackathon`,
  }
}

export default async function EventPage({ params }: PageProps) {
  const { slug } = await params
  const { orgId, userId } = await auth()

  let hackathon = await getPublicHackathon(slug)
  let isPreview = false
  let isOrganizer = false

  if (hackathon && orgId && hackathon.organizer.clerk_org_id === orgId) {
    isOrganizer = true
  }

  if (!hackathon) {
    const draftHackathon = await getPublicHackathon(slug, { includeUnpublished: true })

    if (draftHackathon && orgId && draftHackathon.organizer.clerk_org_id === orgId) {
      hackathon = draftHackathon
      isPreview = true
      isOrganizer = true
    }
  }

  if (!hackathon) {
    notFound()
  }

  let isRegistered = false
  let participantCount = 0

  if (userId) {
    const { getRegistrationInfo } = await import("@/lib/services/hackathons")
    const registrationInfo = await getRegistrationInfo(hackathon.id, userId)
    isRegistered = registrationInfo.isRegistered
    participantCount = registrationInfo.participantCount
  }

  return (
    <div>
      {isPreview && (
        <Alert className="rounded-none border-x-0 border-t-0 bg-muted">
          <Eye className="size-4" />
          <AlertDescription>
            This is a preview. Only you can see this page because your hackathon is not published yet.
          </AlertDescription>
        </Alert>
      )}

      {isOrganizer && !isPreview && (
        <Alert className="rounded-none border-x-0 border-t-0 bg-muted">
          <Pencil className="size-4" />
          <AlertDescription>
            You are the organizer. Click on any section to edit it inline.
          </AlertDescription>
        </Alert>
      )}

      <OrganizerLogoPrompt
        organizerId={hackathon.organizer.id}
        organizerClerkOrgId={hackathon.organizer.clerk_org_id}
        organizerLogoUrl={hackathon.organizer.logo_url}
      />

      <HackathonPreviewClient
        hackathon={hackathon}
        isEditable={isOrganizer}
        isRegistered={isRegistered}
        participantCount={participantCount}
      />
    </div>
  )
}
