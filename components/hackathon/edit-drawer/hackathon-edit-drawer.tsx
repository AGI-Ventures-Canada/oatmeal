"use client"

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useEdit, type EditSection } from "@/components/hackathon/preview/edit-context"
import { HeroEditForm } from "./hero-edit-form"
import { AboutEditForm } from "./about-edit-form"
import { RulesEditForm } from "./rules-edit-form"
import { TimelineEditForm } from "./timeline-edit-form"
import { SponsorsEditForm } from "./sponsors-edit-form"
import type { PublicHackathon } from "@/lib/services/public-hackathons"

interface HackathonEditDrawerProps {
  hackathon: PublicHackathon
}

const sectionTitles: Record<Exclude<EditSection, null>, { title: string; description: string }> = {
  hero: {
    title: "Edit Hero",
    description: "Update hackathon name and banner image",
  },
  about: {
    title: "Edit About",
    description: "Update the hackathon description",
  },
  rules: {
    title: "Edit Rules",
    description: "Update the hackathon rules and guidelines",
  },
  timeline: {
    title: "Edit Timeline",
    description: "Update the hackathon schedule",
  },
  sponsors: {
    title: "Manage Sponsors",
    description: "Add or remove hackathon sponsors",
  },
}

export function HackathonEditDrawer({ hackathon }: HackathonEditDrawerProps) {
  const { activeSection, closeDrawer } = useEdit()

  const isOpen = activeSection !== null

  return (
    <Drawer direction="right" open={isOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <DrawerContent className="sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle>
            {activeSection ? sectionTitles[activeSection].title : "Edit"}
          </DrawerTitle>
          <DrawerDescription>
            {activeSection ? sectionTitles[activeSection].description : ""}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {activeSection === "hero" && (
            <HeroEditForm
              hackathonId={hackathon.id}
              initialData={{
                name: hackathon.name,
                bannerUrl: hackathon.banner_url,
              }}
            />
          )}

          {activeSection === "about" && (
            <AboutEditForm
              hackathonId={hackathon.id}
              initialData={{
                description: hackathon.description,
              }}
            />
          )}

          {activeSection === "rules" && (
            <RulesEditForm
              hackathonId={hackathon.id}
              initialData={{
                rules: hackathon.rules,
              }}
            />
          )}

          {activeSection === "timeline" && (
            <TimelineEditForm
              hackathonId={hackathon.id}
              initialData={{
                startsAt: hackathon.starts_at,
                endsAt: hackathon.ends_at,
                registrationOpensAt: hackathon.registration_opens_at,
                registrationClosesAt: hackathon.registration_closes_at,
              }}
            />
          )}

          {activeSection === "sponsors" && (
            <SponsorsEditForm
              hackathonId={hackathon.id}
              initialSponsors={hackathon.sponsors}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
