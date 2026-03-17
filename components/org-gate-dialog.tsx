"use client"

import Image from "next/image"
import { Plus } from "lucide-react"
import { useOrganizationList } from "@clerk/nextjs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CreateOrganizationDialog } from "@/components/create-organization-dialog"
import { useState } from "react"

type OrgGateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOrgSelected: () => void
}

export function OrgGateDialog({ open, onOpenChange, onOrgSelected }: OrgGateDialogProps) {
  const { userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  })
  const [createOrgOpen, setCreateOrgOpen] = useState(false)

  return (
    <>
      <Dialog open={open && !createOrgOpen} onOpenChange={onOpenChange}>
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
                    className="w-full justify-start"
                    onClick={async () => {
                      await setActive?.({ organization: mem.organization.id })
                      onOrgSelected()
                      onOpenChange(false)
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
                className="w-full"
                onClick={() => setCreateOrgOpen(true)}
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
        onOpenChange={(o) => {
          setCreateOrgOpen(o)
          if (!o) onOpenChange(false)
        }}
        onSuccess={() => {
          setCreateOrgOpen(false)
          onOrgSelected()
          onOpenChange(false)
        }}
      />
    </>
  )
}
