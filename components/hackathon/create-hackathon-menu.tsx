"use client"

import { useState, useRef, useCallback } from "react"
import { Plus, Sparkles } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [lumaDialogOpen, setLumaDialogOpen] = useState(false)
  const closeTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)

  const openTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleMouseEnter = useCallback(() => {
    clearTimeout(closeTimeout.current)
    if (!menuOpen) {
      openTimeout.current = setTimeout(() => setMenuOpen(true), 150)
    }
  }, [menuOpen])

  const handleMouseLeave = useCallback(() => {
    clearTimeout(openTimeout.current)
    closeTimeout.current = setTimeout(() => setMenuOpen(false), 300)
  }, [])

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
        <DropdownMenuTrigger
          asChild
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {trigger}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          align="start"
          sideOffset={4}
          className="w-48"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <DropdownMenuItem onSelect={() => setDrawerOpen(true)}>
            <Plus className="size-4" />
            <span>From scratch</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setLumaDialogOpen(true)} className="text-primary">
            <Sparkles className="size-4" />
            <span>From Luma URL</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
