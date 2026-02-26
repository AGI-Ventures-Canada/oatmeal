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

  const handleMouseEnter = useCallback(() => {
    clearTimeout(closeTimeout.current)
    setMenuOpen(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    closeTimeout.current = setTimeout(() => setMenuOpen(false), 150)
  }, [])

  return (
    <>
      <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            {trigger}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="start"
            className="w-56"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <DropdownMenuItem onSelect={() => setDrawerOpen(true)}>
              <Plus className="mr-2 size-4" />
              <span>From scratch</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setLumaDialogOpen(true)} className="text-primary">
              <Sparkles className="mr-2 size-4" />
              <span>From Luma URL</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
