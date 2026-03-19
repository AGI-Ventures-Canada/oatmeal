"use client"

import { cloneElement, isValidElement, useState, type MouseEvent, type ReactElement, type ReactNode } from "react"
import { useOrganization } from "@clerk/nextjs"
import { CreateHackathonDialog } from "./create-hackathon-dialog"
import { OrgGateDialog } from "@/components/org-gate-dialog"

type TriggerProps = {
  onClick?: (event: MouseEvent) => void
}

type CreateHackathonMenuProps = {
  trigger: ReactNode
}

export function CreateHackathonMenu({ trigger }: CreateHackathonMenuProps) {
  const { organization } = useOrganization()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [orgGateOpen, setOrgGateOpen] = useState(false)
  const triggerElement = isValidElement<TriggerProps>(trigger)
    ? cloneElement(trigger as ReactElement<TriggerProps>, {
        onClick: (event: MouseEvent) => {
          trigger.props.onClick?.(event)

          if (organization) {
            setDialogOpen(true)
            return
          }

          setOrgGateOpen(true)
        },
      })
    : trigger

  return (
    <>
      {triggerElement}

      <CreateHackathonDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <OrgGateDialog
        open={orgGateOpen}
        onOpenChange={(open) => {
          setOrgGateOpen(open)
        }}
        onOrgSelected={() => {
          setDialogOpen(true)
        }}
      />
    </>
  )
}
