import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { getPublicHackathon } from "@/lib/services/public-hackathons"
import { EventHero } from "@/components/hackathon/event-hero"
import { SponsorSection } from "@/components/hackathon/sponsor-section"
import { OrganizerLogoPrompt } from "@/components/hackathon/organizer-logo-prompt"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye } from "lucide-react"
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
  const { orgId } = await auth()

  // First try public (published) hackathons
  let hackathon = await getPublicHackathon(slug)
  let isPreview = false

  // If not found, check if user is organizer and can preview
  if (!hackathon) {
    const draftHackathon = await getPublicHackathon(slug, { includeUnpublished: true })

    if (draftHackathon && orgId && draftHackathon.organizer.clerk_org_id === orgId) {
      hackathon = draftHackathon
      isPreview = true
    }
  }

  if (!hackathon) {
    notFound()
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

      <OrganizerLogoPrompt
        organizerId={hackathon.organizer.id}
        organizerClerkOrgId={hackathon.organizer.clerk_org_id}
        organizerLogoUrl={hackathon.organizer.logo_url}
      />

      <EventHero
        name={hackathon.name}
        bannerUrl={hackathon.banner_url}
        status={hackathon.status}
        startsAt={hackathon.starts_at}
        endsAt={hackathon.ends_at}
        organizer={hackathon.organizer}
      />

      <SponsorSection sponsors={hackathon.sponsors} />

      <section className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto space-y-8">
            {hackathon.description && (
              <div>
                <h2 className="text-xl font-bold mb-4">About</h2>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{hackathon.description}</p>
                </div>
              </div>
            )}

            {hackathon.rules && (
              <div>
                <h2 className="text-xl font-bold mb-4">Rules</h2>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{hackathon.rules}</p>
                </div>
              </div>
            )}

            <div>
              <h2 className="text-xl font-bold mb-4">Timeline</h2>
              <div className="space-y-2 text-sm">
                {hackathon.registration_opens_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Registration Opens</span>
                    <span>{new Date(hackathon.registration_opens_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                )}
                {hackathon.registration_closes_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Registration Closes</span>
                    <span>{new Date(hackathon.registration_closes_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                )}
                {hackathon.starts_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hackathon Starts</span>
                    <span>{new Date(hackathon.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                )}
                {hackathon.ends_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hackathon Ends</span>
                    <span>{new Date(hackathon.ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
