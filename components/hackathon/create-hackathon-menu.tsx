"use client"

import { useState, useRef, useCallback } from "react"
import Image from "next/image"
import { Plus, Sparkles } from "lucide-react"
import {
  useOrganization,
  useOrganizationList,
} from "@clerk/nextjs"
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
import { Button } from "@/components/ui/button"
import { CreateHackathonDrawer } from "./create-hackathon-drawer"
import { CreateOrganizationDialog } from "@/components/create-organization-dialog"
import { LumaPasteInput } from "./luma-paste-input"

type CreateHackathonMenuProps = {
  trigger: React.ReactNode
}

type PendingAction = "scratch" | "luma" | null

export function CreateHackathonMenu({ trigger }: CreateHackathonMenuProps) {
  const { organization } = useOrganization()
  const { userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [lumaDialogOpen, setLumaDialogOpen] = useState(false)
  const [orgGateOpen, setOrgGateOpen] = useState(false)
  const [createOrgOpen, setCreateOrgOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
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

  function handleAction(action: PendingAction) {
    if (organization) {
      if (action === "scratch") setDrawerOpen(true)
      else if (action === "luma") setLumaDialogOpen(true)
    } else {
      setPendingAction(action)
      setOrgGateOpen(true)
    }
  }

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
          <DropdownMenuItem onSelect={() => handleAction("scratch")}>
            <Plus className="size-4" />
            <span>From scratch</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => handleAction("luma")} className="text-primary">
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

      <Dialog open={orgGateOpen} onOpenChange={(open) => {
        setOrgGateOpen(open)
        if (!open && !createOrgOpen) setPendingAction(null)
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Organization Required</DialogTitle>
            <DialogDescription>
              Hackathons are created under organizations. Switch to an organization or create a new one to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {userMemberships?.data && userMemberships.data.length > 0 && (
              <div className="space-y-1">
                {userMemberships.data.map((mem) => (
                  <Button
                    key={mem.organization.id}
                    variant="ghost"
                    onClick={async () => {
                      await setActive?.({ organization: mem.organization.id })
                      setOrgGateOpen(false)
                      if (pendingAction === "scratch") setDrawerOpen(true)
                      else if (pendingAction === "luma") setLumaDialogOpen(true)
                      setPendingAction(null)
                    }}
                  >
                    {mem.organization.imageUrl ? (
                      <Image
                        src={mem.organization.imageUrl}
                        alt={mem.organization.name}
                        width={24}
                        height={24}
                        className="size-6 rounded object-cover"
                      />
                    ) : (
                      <div className="flex size-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-semibold">
                        {mem.organization.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span>{mem.organization.name}</span>
                  </Button>
                ))}
              </div>
            )}
            <div className="w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setOrgGateOpen(false)
                  setCreateOrgOpen(true)
                }}
              >
                <Plus className="size-4 mr-2" />
                Create New Organization
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CreateOrganizationDialog
        open={createOrgOpen}
        onOpenChange={(open) => {
          setCreateOrgOpen(open)
          if (!open) setPendingAction(null)
        }}
        onSuccess={() => {
          if (pendingAction === "scratch") setDrawerOpen(true)
          else if (pendingAction === "luma") setLumaDialogOpen(true)
          setPendingAction(null)
        }}
      />
    </>
  )
}
