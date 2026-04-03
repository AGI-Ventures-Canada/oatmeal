"use client"

import { cloneElement, isValidElement, type MouseEvent, type ReactElement, type ReactNode } from "react"
import { useRouter } from "next/navigation"

type TriggerProps = {
  onClick?: (event: MouseEvent) => void
}

type CreateHackathonMenuProps = {
  trigger: ReactNode
}

export function CreateHackathonMenu({ trigger }: CreateHackathonMenuProps) {
  const router = useRouter()
  const triggerElement = isValidElement<TriggerProps>(trigger)
    ? cloneElement(trigger as ReactElement<TriggerProps>, {
        onClick: (event: MouseEvent) => {
          trigger.props.onClick?.(event)
          router.push("/create")
        },
      })
    : trigger

  return <>{triggerElement}</>
}
