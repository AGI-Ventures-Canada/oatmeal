"use client"

import { useState } from "react"
import { Search, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { extractYouTubeVideoId } from "@/lib/utils/youtube"
import { YouTubeEmbed } from "@/components/hackathon/youtube-embed"
import { SubmissionLinks } from "@/components/hackathon/submission-links"

export type GallerySubmission = {
  id: string
  title: string
  description: string | null
  githubUrl: string | null
  liveAppUrl: string | null
  demoVideoUrl: string | null
  submitter: string
  createdAt: string
}

interface SubmissionGalleryProps {
  submissions: GallerySubmission[]
}

const PAGE_SIZE = 10

export function SubmissionGallery({ submissions }: SubmissionGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filteredSubmissions = submissions.filter((submission) => {
    const query = searchQuery.toLowerCase()
    return (
      submission.title.toLowerCase().includes(query) ||
      submission.submitter.toLowerCase().includes(query) ||
      submission.description?.toLowerCase().includes(query)
    )
  })

  const visibleSubmissions = filteredSubmissions.slice(0, visibleCount)
  const hasMore = visibleCount < filteredSubmissions.length
  const remainingCount = filteredSubmissions.length - visibleCount

  if (submissions.length === 0) {
    return null
  }

  return (
    <section className="py-12 border-t">
      <div className="mx-auto max-w-4xl px-4">
        <h2 className="text-xl font-bold mb-6">Submissions</h2>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search submissions..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setVisibleCount(PAGE_SIZE)
            }}
            className="pl-10"
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
          />
        </div>

        <div className="text-xs text-muted-foreground mb-4">
          {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? "s" : ""}
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No submissions found matching &quot;{searchQuery}&quot;
          </div>
        ) : (
          <div className="relative">
            <Accordion type="single" collapsible className="w-full">
              {visibleSubmissions.map((submission, index) => (
                <AccordionItem key={submission.id} value={submission.id} className="group/accordion">
                  <AccordionTrigger className="py-4 text-sm hover:no-underline">
                    <div className="flex items-center gap-4 text-left">
                      <span className="text-muted-foreground w-6 text-right shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <span className="font-semibold truncate">{submission.title}</span>
                        {submission.description && (
                          <span className="text-muted-foreground text-xs font-normal line-clamp-1 group-data-[state=open]/accordion:hidden">
                            {submission.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <SubmissionExpandedContent submission={submission} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {hasMore && (
              <div className="relative mt-[-4rem] pt-16">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-t from-background to-transparent" />
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                    className="gap-1.5"
                  >
                    <ChevronDown className="size-3.5" />
                    Show more ({Math.min(remainingCount, PAGE_SIZE)} of {remainingCount} remaining)
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function SubmissionExpandedContent({ submission }: { submission: GallerySubmission }) {
  const youtubeVideoId = submission.demoVideoUrl
    ? extractYouTubeVideoId(submission.demoVideoUrl)
    : null

  return (
    <div className="pl-10 space-y-4">
      {submission.description && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {submission.description}
        </p>
      )}
      <p className="text-xs text-muted-foreground">by {submission.submitter}</p>
      {youtubeVideoId && <YouTubeEmbed videoId={youtubeVideoId} />}
      <SubmissionLinks
        githubUrl={submission.githubUrl}
        liveAppUrl={submission.liveAppUrl}
        demoVideoUrl={submission.demoVideoUrl}
        isYouTube={youtubeVideoId !== null}
      />
    </div>
  )
}
