"use client"

import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"

interface VoteCardProps {
  title: string
  description: string | null
  screenshotUrl: string | null
  submitterName?: string
  voteCount: number
  isVoted: boolean
  disabled: boolean
  onVote: () => void
}

export function VoteCard({
  title,
  description,
  screenshotUrl,
  submitterName,
  voteCount,
  isVoted,
  disabled,
  onVote,
}: VoteCardProps) {
  return (
    <div className={cn(
      "rounded-lg border overflow-hidden transition-colors",
      isVoted && "ring-2 ring-primary"
    )}>
      {screenshotUrl && (
        <div className="aspect-video bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={screenshotUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <h3 className="font-semibold leading-tight">{title}</h3>
          {submitterName && (
            <p className="text-xs text-muted-foreground">by {submitterName}</p>
          )}
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {voteCount} {voteCount === 1 ? "vote" : "votes"}
          </span>
          <Button
            variant={isVoted ? "default" : "outline"}
            size="sm"
            onClick={onVote}
            disabled={disabled}
          >
            <Heart className={cn("size-4 mr-1", isVoted && "fill-current")} />
            {isVoted ? "Voted" : "Vote"}
          </Button>
        </div>
      </div>
    </div>
  )
}
