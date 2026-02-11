"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { EditProvider, useEdit } from "./edit-context"
import { EditableSection } from "./editable-section"
import { EditModeToggle } from "./edit-mode-toggle"
import { HackathonEditDrawer } from "@/components/hackathon/edit-drawer/hackathon-edit-drawer"
import { OrganizerLogoPrompt } from "@/components/hackathon/organizer-logo-prompt"
import { EventHero } from "@/components/hackathon/event-hero"
import { SponsorSection } from "@/components/hackathon/sponsor-section"
import { SubmissionGallery, type GallerySubmission } from "@/components/hackathon/submission-gallery"
import { TeamInviteDialog } from "@/components/hackathon/team-invite-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CheckCircle2, Crown, Users, Clock, X, Lock } from "lucide-react"
import { formatDateTimeDisplay } from "@/lib/utils/format"
import type { PublicHackathon } from "@/lib/services/public-hackathons"
import type { Submission } from "@/lib/db/hackathon-types"
import type { ParticipantTeamInfo } from "@/lib/services/hackathons"

interface HackathonPreviewClientProps {
  hackathon: PublicHackathon
  isEditable: boolean
  isRegistered?: boolean
  participantCount?: number
  showEditToggle?: boolean
  submission?: Submission | null
  submissions?: GallerySubmission[]
  teamInfo?: ParticipantTeamInfo
}

function HackathonPreviewContent({
  hackathon,
  isRegistered: initialIsRegistered = false,
  participantCount = 0,
  showEditToggle = false,
  submission = null,
  submissions = [],
  teamInfo = null,
}: Omit<HackathonPreviewClientProps, "isEditable">) {
  const { isEditable, editMode, openSection } = useEdit()
  const { user } = useUser()
  const router = useRouter()
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [isRegistered, setIsRegistered] = useState(initialIsRegistered)
  const [justRegistered, setJustRegistered] = useState(false)

  const handleRegistrationSuccess = () => {
    setIsRegistered(true)
    setJustRegistered(true)
  }
  const hasTimeline = hackathon.registration_opens_at || hackathon.registration_closes_at || hackathon.starts_at || hackathon.ends_at

  async function handleCancelInvitation(invitationId: string) {
    if (!teamInfo) return
    setCancellingId(invitationId)
    try {
      const res = await fetch(
        `/api/dashboard/teams/${teamInfo.team.id}/invitations/${invitationId}`,
        { method: "DELETE" }
      )
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setCancellingId(null)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })
  }

  function getInitials(email: string) {
    return email.substring(0, 2).toUpperCase()
  }

  const isExpiringSoon = (expiresAt: string) => {
    const expiry = new Date(expiresAt)
    const now = new Date()
    const hoursUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60)
    return hoursUntilExpiry < 48
  }

  const registrationCard = isRegistered && (
    <section className={`pb-6 border-b ${justRegistered ? "animate-in fade-in duration-500" : ""}`}>
      <div className="mx-auto max-w-4xl px-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <CheckCircle2 className="size-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">You&apos;re registered!</span>
                    <Badge variant="secondary">Confirmed</Badge>
                  </div>
                  {teamInfo ? (
                    <div className="mt-1">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="size-3.5" />
                        <span>{teamInfo.team.name}</span>
                        {teamInfo.team.status === "locked" && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Lock className="size-3" />
                            Locked
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        {teamInfo.members.map((member) => {
                          const isCurrentUser = member.clerkUserId === user?.id
                          const displayName = isCurrentUser
                            ? (user?.firstName || "You")
                            : "Member"
                          const initials = isCurrentUser
                            ? (user?.firstName?.[0] || "?")
                            : "?"
                          return (
                            <div key={member.clerkUserId} className="flex items-center gap-1.5">
                              <Avatar className="size-6">
                                <AvatarFallback className="text-xs">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-muted-foreground">
                                {displayName}
                              </span>
                              {member.isCaptain && (
                                <Crown className="size-3 text-primary" />
                              )}
                            </div>
                          )
                        })}
                      </div>
                      {teamInfo.isCaptain && teamInfo.pendingInvitations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-primary/10">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                            <Clock className="size-3" />
                            <span>Pending invitations</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {teamInfo.pendingInvitations.map((invitation) => (
                              <div
                                key={invitation.id}
                                className="flex items-center gap-2 bg-background/50 rounded-full pl-1 pr-2 py-1"
                              >
                                <Avatar className="size-5">
                                  <AvatarFallback className="text-[10px]">
                                    {getInitials(invitation.email)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground truncate max-w-32">
                                  {invitation.email}
                                </span>
                                <span className={`text-[10px] ${isExpiringSoon(invitation.expiresAt) ? "text-destructive" : "text-muted-foreground/70"}`}>
                                  {formatDate(invitation.expiresAt)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-4 hover:bg-destructive/10"
                                  onClick={() => handleCancelInvitation(invitation.id)}
                                  disabled={cancellingId === invitation.id}
                                >
                                  <X className="size-3" />
                                  <span className="sr-only">Cancel</span>
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      No team yet
                    </p>
                  )}
                </div>
              </div>
              {teamInfo && teamInfo.isCaptain && teamInfo.team.status === "forming" && (
                <TeamInviteDialog
                  teamId={teamInfo.team.id}
                  hackathonId={hackathon.id}
                  teamName={teamInfo.team.name}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )

  const eventContent = (
    <>
      {registrationCard}
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
    </>
  )

  const heroContent = (
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
          endsAt: hackathon.ends_at,
          registrationOpensAt: hackathon.registration_opens_at,
          registrationClosesAt: hackathon.registration_closes_at,
          maxParticipants: hackathon.max_participants,
          participantCount,
          isRegistered,
          submission,
          onRegistrationSuccess: handleRegistrationSuccess,
        }}
      />
    </EditableSection>
  )

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
        {heroContent}
        {eventContent}
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
  teamInfo,
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
        teamInfo={teamInfo}
      />
    </EditProvider>
  )
}
