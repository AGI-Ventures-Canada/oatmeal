"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"
import { StatusBadge } from "./status-badge"
import type { HackathonStatus } from "@/lib/db/hackathon-types"

interface HackathonPageActionsProps {
  hackathonId: string
  slug: string
  status: HackathonStatus
  isOrganizer: boolean
}

export function HackathonPageActions({
  hackathonId,
  slug,
  status,
  isOrganizer,
}: HackathonPageActionsProps) {
  return (
    <>
      <Button asChild variant="outline" size="sm">
        <Link href={`/e/${slug}`} target="_blank">
          <ExternalLink className="mr-2 size-4" />
          View Live
        </Link>
      </Button>
      {isOrganizer ? (
        <StatusBadge hackathonId={hackathonId} status={status} />
      ) : null}
    </>
  )
}
