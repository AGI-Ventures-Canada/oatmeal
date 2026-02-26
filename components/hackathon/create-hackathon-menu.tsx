"use client"

import { useState } from "react"
import { Plus, Sparkles } from "lucide-react"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CreateHackathonDrawer } from "./create-hackathon-drawer"
import { LumaPasteInput } from "./luma-paste-input"

type CreateHackathonMenuProps = {
  trigger: React.ReactNode
}

export function CreateHackathonMenu({ trigger }: CreateHackathonMenuProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [lumaDialogOpen, setLumaDialogOpen] = useState(false)

  return (
    <>
      <HoverCard openDelay={200} closeDelay={150}>
        <HoverCardTrigger asChild>
          {trigger}
        </HoverCardTrigger>
        <HoverCardContent side="right" align="start" className="w-48 p-1">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Plus className="size-4" />
            <span>From scratch</span>
          </button>
          <Separator className="my-1" />
          <button
            type="button"
            onClick={() => setLumaDialogOpen(true)}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-primary transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Sparkles className="size-4" />
            <span>From Luma URL</span>
          </button>
        </HoverCardContent>
      </HoverCard>

      <CreateHackathonDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        trigger={null}
      />

      <Dialog open={lumaDialogOpen} onOpenChange={setLumaDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import from Luma</DialogTitle>
            <DialogDescription>
              Paste a Luma event URL to import event details
            </DialogDescription>
          </DialogHeader>
          <LumaPasteInput onClose={() => setLumaDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
