"use client"

import { cn } from "@/lib/utils"

interface FullscreenWrapperProps {
  children: React.ReactNode
  className?: string
}

export function FullscreenWrapper({ children, className }: FullscreenWrapperProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col items-center justify-center bg-background p-8",
        className,
      )}
    >
      {children}
    </div>
  )
}
