"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Trophy, Github, ExternalLink } from "lucide-react"
import type { PublicResultWithDetails } from "@/lib/services/results"

interface PublicResultsProps {
  results: PublicResultWithDetails[]
}

function WinnerCard({ result }: { result: PublicResultWithDetails }) {
  return (
    <Card className="border-primary overflow-hidden">
      {result.submissionScreenshotUrl && (
        <div className="w-full aspect-video bg-muted overflow-hidden">
          <img
            src={result.submissionScreenshotUrl}
            alt={result.submissionTitle}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-primary shrink-0" />
              <span className="text-sm font-medium text-primary">1st Place</span>
            </div>
            <h3 className="text-2xl font-bold leading-tight">{result.submissionTitle}</h3>
            {result.teamName && (
              <p className="text-muted-foreground font-medium">{result.teamName}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {result.submissionGithubUrl && (
              <a
                href={result.submissionGithubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="size-4" />
                GitHub
              </a>
            )}
            {result.submissionLiveAppUrl && (
              <a
                href={result.submissionLiveAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="size-4" />
                Live App
              </a>
            )}
          </div>
        </div>

        {result.members.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {result.members.map((name) => (
              <Badge key={name} variant="secondary">
                {name}
              </Badge>
            ))}
          </div>
        )}

        {result.submissionDescription && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
            {result.submissionDescription}
          </p>
        )}

        {result.prizes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {result.prizes.map((p) => (
              <Badge key={p.id} variant="default">
                {p.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RunnerUpCard({ result }: { result: PublicResultWithDetails }) {
  const rankLabel = result.rank === 2 ? "2nd Place" : "3rd Place"

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {rankLabel}
          </span>
          <p className="font-semibold text-lg leading-tight">{result.submissionTitle}</p>
          {result.teamName && (
            <p className="text-sm text-muted-foreground">{result.teamName}</p>
          )}
        </div>
        {result.prizes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {result.prizes.map((p) => (
              <Badge key={p.id} variant="secondary">
                {p.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function PublicResults({ results }: PublicResultsProps) {
  if (results.length === 0) return null

  const first = results.find((r) => r.rank === 1)
  const second = results.find((r) => r.rank === 2)
  const third = results.find((r) => r.rank === 3)

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <Trophy className="mx-auto size-8 text-primary" />
        <h2 className="text-2xl font-bold">Results</h2>
      </div>

      {first && <WinnerCard result={first} />}

      {(second || third) && (
        <div className="grid grid-cols-2 gap-4">
          {second && <RunnerUpCard result={second} />}
          {third && <RunnerUpCard result={third} />}
        </div>
      )}
    </div>
  )
}
