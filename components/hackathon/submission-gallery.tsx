"use client"

import { useState } from "react"
import { Search, Github, ExternalLink, Play } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

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

export function SubmissionGallery({ submissions }: SubmissionGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredSubmissions = submissions.filter((submission) => {
    const query = searchQuery.toLowerCase()
    return (
      submission.title.toLowerCase().includes(query) ||
      submission.submitter.toLowerCase().includes(query) ||
      submission.description?.toLowerCase().includes(query)
    )
  })

  if (submissions.length === 0) {
    return null
  }

  return (
    <section className="py-12 border-t">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold mb-6">Submissions</h2>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search submissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
            <Accordion type="single" collapsible className="w-full">
              {filteredSubmissions.map((submission, index) => (
                <AccordionItem key={submission.id} value={submission.id}>
                  <AccordionTrigger className="py-4 text-sm hover:no-underline">
                    <div className="flex items-center gap-4 text-left">
                      <span className="text-muted-foreground w-6 text-right shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <span className="font-semibold truncate">{submission.title}</span>
                        <span className="text-muted-foreground text-xs font-normal">
                          {submission.submitter}
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="pl-10 space-y-4">
                      {submission.description && (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {submission.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3">
                        {submission.githubUrl && (
                          <a
                            href={submission.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Github className="size-3.5" />
                            <span>Repository</span>
                          </a>
                        )}
                        {submission.liveAppUrl && (
                          <a
                            href={submission.liveAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ExternalLink className="size-3.5" />
                            <span>Live Demo</span>
                          </a>
                        )}
                        {submission.demoVideoUrl && (
                          <a
                            href={submission.demoVideoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Play className="size-3.5" />
                            <span>Demo Video</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </section>
  )
}
