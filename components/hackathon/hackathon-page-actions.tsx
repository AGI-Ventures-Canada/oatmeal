"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, FolderOpen, Gavel, Trophy, Medal } from "lucide-react"
import type { HackathonStatus } from "@/lib/db/hackathon-types"

interface HackathonPageActionsProps {
  slug: string
  status: HackathonStatus
  isOrganizer: boolean
  submissionCount?: number
}

export function HackathonPageActions({
  slug,
  isOrganizer,
  submissionCount = 0,
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
        <>
          <Button asChild variant="outline" size="sm">
            <Link href={`/e/${slug}/manage/submissions`}>
              <FolderOpen className="mr-2 size-4" />
              Submissions
              <Badge variant="secondary" className="ml-2">
                {submissionCount}
              </Badge>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/e/${slug}/manage/judging`}>
              <Gavel className="mr-2 size-4" />
              Judging
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/e/${slug}/manage/prizes`}>
              <Trophy className="mr-2 size-4" />
              Prizes
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/e/${slug}/manage/results`}>
              <Medal className="mr-2 size-4" />
              Results
            </Link>
          </Button>
        </>
      ) : null}
    </>
  )
}
