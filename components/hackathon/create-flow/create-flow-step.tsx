"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface CreateFlowStepProps {
  stepKey: string
  children: React.ReactNode
}

export function CreateFlowStep({ stepKey, children }: CreateFlowStepProps) {
  const [visible, setVisible] = useState(false)
  const [displayedKey, setDisplayedKey] = useState(stepKey)
  const [displayedChildren, setDisplayedChildren] = useState(children)

  useEffect(() => {
    if (stepKey !== displayedKey) {
      setVisible(false)
      const timeout = setTimeout(() => {
        setDisplayedKey(stepKey)
        setDisplayedChildren(children)
        requestAnimationFrame(() => setVisible(true))
      }, 200)
      return () => clearTimeout(timeout)
    } else {
      setDisplayedChildren(children)
    }
  }, [stepKey, displayedKey, children])

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  return (
    <div
      className={cn(
        "w-full transition-all duration-200 ease-in-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      )}
    >
      {displayedChildren}
    </div>
  )
}
