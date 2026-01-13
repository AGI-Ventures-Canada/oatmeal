"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface CopyableProps {
  value: string
  displayValue?: string
  className?: string
  iconClassName?: string
  masked?: boolean
}

export function Copyable({
  value,
  displayValue,
  className,
  iconClassName,
  masked = false,
}: CopyableProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const display = displayValue ?? value
  const maskedDisplay = masked ? "•".repeat(Math.min(display.length, 32)) : display

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <code className="text-sm bg-muted px-2 py-1 rounded font-mono truncate">
        {maskedDisplay}
      </code>
      <Button
        variant="ghost"
        size="icon"
        className={cn("size-8 shrink-0", iconClassName)}
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="size-4 text-green-500" />
        ) : (
          <Copy className="size-4" />
        )}
      </Button>
    </div>
  )
}
