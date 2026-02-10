"use client"

import { EditProvider, useEdit } from "./edit-context"
import { EditableSection } from "./editable-section"
import { EditModeToggle } from "./edit-mode-toggle"
import { HackathonEditDrawer } from "@/components/hackathon/edit-drawer/hackathon-edit-drawer"
import { OrganizerLogoPrompt } from "@/components/hackathon/organizer-logo-prompt"
import { EventHero } from "@/components/hackathon/event-hero"
import { SponsorSection } from "@/components/hackathon/sponsor-section"
import { SubmissionGallery, type GallerySubmission } from "@/components/hackathon/submission-gallery"
import { formatDateTimeDisplay } from "@/lib/utils/format"
import type { PublicHackathon } from "@/lib/services/public-hackathons"
import type { Submission } from "@/lib/db/hackathon-types"

interface HackathonPreviewClientProps {
  hackathon: PublicHackathon
  isEditable: boolean
  isRegistered?: boolean
  participantCount?: number
  showEditToggle?: boolean
  submission?: Submission | null
  submissions?: GallerySubmission[]
}

function HackathonPreviewContent({
  hackathon,
  isRegistered = false,
  participantCount = 0,
  showEditToggle = false,
  submission = null,
  submissions = [],
}: Omit<HackathonPreviewClientProps, "isEditable">) {
  const { isEditable, editMode, openSection } = useEdit()
  const hasTimeline = hackathon.registration_opens_at || hackathon.registration_closes_at || hackathon.starts_at || hackathon.ends_at

  return (
    <>
      {showEditToggle && <EditModeToggle />}
      {editMode && (
        <OrganizerLogoPrompt
          organizerId={hackathon.organizer.id}
          organizerClerkOrgId={hackathon.organizer.clerk_org_id}
          organizerLogoUrl={hackathon.organizer.logo_url}
        />
      )}
      <div>
      <EditableSection section="hero">
        <EventHero
          name={hackathon.name}
          bannerUrl={hackathon.banner_url}
          status={hackathon.status}
          startsAt={hackathon.starts_at}
          endsAt={hackathon.ends_at}
          registrationOpensAt={hackathon.registration_opens_at}
          registrationClosesAt={hackathon.registration_closes_at}
          organizer={hackathon.organizer}
          onDatesClick={isEditable && editMode ? () => openSection("timeline") : undefined}
          isRegistered={isRegistered}
          registrationProps={{
            hackathonSlug: hackathon.slug,
            status: hackathon.status,
            registrationOpensAt: hackathon.registration_opens_at,
            registrationClosesAt: hackathon.registration_closes_at,
            maxParticipants: hackathon.max_participants,
            participantCount,
            isRegistered,
            submission,
          }}
        />
      </EditableSection>

        <EditableSection
          section="sponsors"
          isEmpty={hackathon.sponsors.length === 0}
          emptyLabel="Click to add sponsors"
          className="py-12"
        >
          <SponsorSection sponsors={hackathon.sponsors} />
        </EditableSection>

        <section className="py-12 border-t">
          <div className="mx-auto max-w-4xl px-4">
            <div className="space-y-8">
              <EditableSection
                section="about"
                isEmpty={!hackathon.description}
                emptyLabel="Click to add description"
              >
                {hackathon.description && (
                  <div>
                    <h2 className="text-xl font-bold mb-4">About</h2>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap">{hackathon.description}</p>
                    </div>
                  </div>
                )}
              </EditableSection>

              <EditableSection
                section="rules"
                isEmpty={!hackathon.rules}
                emptyLabel="Click to add rules"
              >
                {hackathon.rules && (
                  <div>
                    <h2 className="text-xl font-bold mb-4">Rules</h2>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="whitespace-pre-wrap">{hackathon.rules}</p>
                    </div>
                  </div>
                )}
              </EditableSection>

              <EditableSection
                section="timeline"
                isEmpty={!hasTimeline}
                emptyLabel="Click to add timeline"
              >
                {hasTimeline && (
                  <div>
                    <h2 className="text-xl font-bold mb-4">Timeline</h2>
                    <div className="space-y-2 text-sm">
                      {hackathon.registration_opens_at && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Registration Opens</span>
                          <span>{formatDateTimeDisplay(hackathon.registration_opens_at)}</span>
                        </div>
                      )}
                      {hackathon.registration_closes_at && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Registration Closes</span>
                          <span>{formatDateTimeDisplay(hackathon.registration_closes_at)}</span>
                        </div>
                      )}
                      {hackathon.starts_at && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Hackathon Starts</span>
                          <span>{formatDateTimeDisplay(hackathon.starts_at)}</span>
                        </div>
                      )}
                      {hackathon.ends_at && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Hackathon Ends</span>
                          <span>{formatDateTimeDisplay(hackathon.ends_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </EditableSection>
            </div>
          </div>
        </section>

        <SubmissionGallery submissions={submissions} />
      </div>

      {isEditable && editMode && <HackathonEditDrawer hackathon={hackathon} />}
    </>
  )
}

export function HackathonPreviewClient({
  hackathon,
  isEditable,
  isRegistered,
  participantCount,
  showEditToggle = false,
  submission,
  submissions,
}: HackathonPreviewClientProps) {
  return (
    <EditProvider isEditable={isEditable} defaultEditMode={!showEditToggle}>
      <HackathonPreviewContent
        hackathon={hackathon}
        isRegistered={isRegistered}
        participantCount={participantCount}
        showEditToggle={showEditToggle}
        submission={submission}
        submissions={submissions}
      />
    </EditProvider>
  )
}
