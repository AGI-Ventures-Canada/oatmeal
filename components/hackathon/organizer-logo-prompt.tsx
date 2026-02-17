"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card"
import { ImagePlus } from "lucide-react"
import { LogoUploadModal } from "@/components/org/logo-upload-modal"

export function OrganizerLogoPrompt({ children }: { children: React.ReactNode }) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <HoverCard openDelay={200} closeDelay={150}>
        <HoverCardTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-default">
            {children}
            <span className="inline-block size-1.5 rounded-full bg-primary/60" />
          </span>
        </HoverCardTrigger>
        <HoverCardContent side="top" align="start" className="w-64 p-3">
          <p className="text-xs text-muted-foreground mb-2">
            No organization logo yet. Adding one makes your events more recognizable.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setModalOpen(true)}
          >
            <ImagePlus className="size-3 mr-1.5" />
            Add Logo
          </Button>
        </HoverCardContent>
      </HoverCard>
      <LogoUploadModal
        lightLogoUrl={null}
        darkLogoUrl={null}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  )
}
