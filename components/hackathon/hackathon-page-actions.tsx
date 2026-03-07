"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, FolderOpen, Gavel, Medal } from "lucide-react"
interface HackathonPageActionsProps {
  slug: string
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
          <ExternalLink className="sm:mr-2 size-4" />
          <span className="hidden sm:inline">View Live</span>
        </Link>
      </Button>
      {isOrganizer ? (
        <>
          <Button asChild variant="outline" size="sm">
            <Link href={`/e/${slug}/manage/submissions`}>
              <FolderOpen className="sm:mr-2 size-4" />
              <span className="hidden sm:inline">Submissions</span>
              <Badge variant="secondary" className="hidden sm:inline-flex ml-2">
                {submissionCount}
              </Badge>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/e/${slug}/manage/judging`}>
              <Gavel className="sm:mr-2 size-4" />
              <span className="hidden sm:inline">Judging</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/e/${slug}/manage/results`}>
              <Medal className="sm:mr-2 size-4" />
              <span className="hidden sm:inline">Results</span>
            </Link>
          </Button>
        </>
      ) : null}
    </>
  )
}
