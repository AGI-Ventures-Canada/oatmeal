"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

interface CopyableIdProps {
  id: string
  className?: string
}

export function CopyableId({ id, className }: CopyableIdProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-flex items-center gap-1 relative group",
        className
      )}
      title="Click to copy"
    >
      {id}
      {copied ? (
        <Check className="size-2.5 text-muted-foreground" />
      ) : (
        <Copy className="size-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  )
}
