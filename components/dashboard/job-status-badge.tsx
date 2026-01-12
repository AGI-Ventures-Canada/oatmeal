"use client"

import { Badge } from "@/components/ui/badge"

const statusConfig = {
  queued: { label: "Queued", variant: "secondary" as const },
  running: { label: "Running", variant: "default" as const },
  succeeded: { label: "Succeeded", variant: "default" as const },
  failed: { label: "Failed", variant: "destructive" as const },
  canceled: { label: "Canceled", variant: "outline" as const },
}

type Props = {
  status: keyof typeof statusConfig
}

export function JobStatusBadge({ status }: Props) {
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
