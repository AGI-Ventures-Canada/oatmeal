"use client"

import { EditProvider, useEdit } from "./edit-context"
import { EditableSection } from "./editable-section"
import { HackathonEditDrawer } from "@/components/hackathon/edit-drawer/hackathon-edit-drawer"
import { EventHero } from "@/components/hackathon/event-hero"
import { SponsorSection } from "@/components/hackathon/sponsor-section"
import type { PublicHackathon } from "@/lib/services/public-hackathons"

interface HackathonPreviewClientProps {
  hackathon: PublicHackathon
  isEditable: boolean
  isRegistered?: boolean
  participantCount?: number
}

function HackathonPreviewContent({
  hackathon,
  isEditable,
  isRegistered = false,
  participantCount = 0,
}: HackathonPreviewClientProps) {
  const { openSection } = useEdit()
  const hasTimeline = hackathon.registration_opens_at || hackathon.registration_closes_at || hackathon.starts_at || hackathon.ends_at

  return (
    <>
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
          onDatesClick={isEditable ? () => openSection("timeline") : undefined}
          isRegistered={isRegistered}
          registrationProps={{
            hackathonSlug: hackathon.slug,
            registrationOpensAt: hackathon.registration_opens_at,
            registrationClosesAt: hackathon.registration_closes_at,
            maxParticipants: hackathon.max_participants,
            participantCount,
            isRegistered,
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
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto space-y-8">
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
                )}
              </EditableSection>
            </div>
          </div>
        </section>
      </div>

      {isEditable && <HackathonEditDrawer hackathon={hackathon} />}
    </>
  )
}

export function HackathonPreviewClient({
  hackathon,
  isEditable,
  isRegistered,
  participantCount,
}: HackathonPreviewClientProps) {
  return (
    <EditProvider isEditable={isEditable}>
      <HackathonPreviewContent
        hackathon={hackathon}
        isEditable={isEditable}
        isRegistered={isRegistered}
        participantCount={participantCount}
      />
    </EditProvider>
  )
}
