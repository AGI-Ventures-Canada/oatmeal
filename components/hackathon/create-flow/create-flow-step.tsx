"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface CreateFlowStepProps {
  stepKey: string
  children: React.ReactNode
}

export function CreateFlowStep({ stepKey, children }: CreateFlowStepProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const committedKeyRef = useRef(stepKey)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    if (stepKey !== committedKeyRef.current) {
      el.classList.add("translate-y-3", "opacity-0")
      el.classList.remove("translate-y-0", "opacity-100")

      const timeout = setTimeout(() => {
        committedKeyRef.current = stepKey
        el.classList.remove("translate-y-3", "opacity-0")
        el.classList.add("translate-y-0", "opacity-100")
      }, 300)
      return () => clearTimeout(timeout)
    }
  }, [stepKey])

  return (
    <div
      ref={containerRef}
      className="w-full translate-y-0 opacity-100 transition-all duration-300 ease-out"
    >
      {children}
    </div>
  )
}
